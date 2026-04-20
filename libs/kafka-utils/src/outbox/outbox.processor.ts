import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

const OUTBOX_POLL_INTERVAL_MS = 1_000;
const OUTBOX_BATCH_SIZE = 50;
const OUTBOX_MAX_RETRIES = 5;

/**
 * OutboxProcessor — периодически вычитывает необработанные события из outbox
 * и публикует их в Kafka. Обеспечивает at-least-once delivery.
 *
 * Алгоритм:
 * 1. SELECT ... FOR UPDATE SKIP LOCKED — конкурентно-безопасная выборка
 * 2. Publish to Kafka
 * 3. UPDATE processed_at = NOW() если успешно
 * 4. UPDATE retry_count++, last_error если ошибка
 * 5. После MAX_RETRIES — переносим в DLQ или помечаем как failed
 */
@Injectable()
export class OutboxProcessor implements OnApplicationShutdown {
  private readonly logger = new Logger(OutboxProcessor.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject('KAFKA_CLIENT')
    private readonly kafkaClient: ClientKafka,
  ) { }

  onApplicationBootstrap(): void {
    this.start();
  }

  onApplicationShutdown(): void {
    this.stop();
  }

  start(): void {
    this.logger.log('OutboxProcessor started');
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => this.poll(), OUTBOX_POLL_INTERVAL_MS);
  }

  private async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      await this.processOutbox();
    } catch (err) {
      this.logger.error('OutboxProcessor error', err);
    } finally {
      this.running = false;
      this.scheduleNext();
    }
  }

  private async processOutbox(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const events = await queryRunner.query(
        `SELECT * FROM outbox_events
         WHERE processed_at IS NULL
           AND retry_count < $1
         ORDER BY created_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        [OUTBOX_MAX_RETRIES, OUTBOX_BATCH_SIZE],
      );

      if (events.length === 0) {
        await queryRunner.commitTransaction();
        return;
      }

      this.logger.debug(`Processing ${events.length} outbox events`);

      const publishResults = await Promise.allSettled(
        events.map((event: { event_type: string; id: string; payload: unknown }) =>
          this.kafkaClient
            .emit(event.event_type, {
              key: event.id,
              value: event.payload,
            })
            .toPromise(),
        ),
      );

      const ids: string[] = [];
      const failedIds: { id: string; error: string }[] = [];

      publishResults.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          ids.push(events[i].id);
        } else {
          failedIds.push({
            id: events[i].id,
            error: String(result.reason),
          });
        }
      });

      if (ids.length > 0) {
        await queryRunner.query(
          `UPDATE outbox_events SET processed_at = NOW() WHERE id = ANY($1)`,
          [ids],
        );
      }

      for (const { id, error } of failedIds) {
        await queryRunner.query(
          `UPDATE outbox_events
           SET retry_count = retry_count + 1, last_error = $2
           WHERE id = $1`,
          [id, error],
        );
        this.logger.warn(`Outbox event ${id} failed: ${error}`);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
