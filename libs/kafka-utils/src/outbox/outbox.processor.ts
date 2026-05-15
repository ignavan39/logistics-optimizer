import { Logger as NestLogger, Injectable, type Logger, type OnApplicationShutdown, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { ClientKafka } from '@nestjs/microservices';

const OUTBOX_POLL_INTERVAL_MS = 1_000;
const OUTBOX_BATCH_SIZE = 50;
const OUTBOX_MAX_RETRIES = 5;

interface OutboxEventRow {
  id: string;
  event_type: string;
  payload: unknown;
  created_at: Date;
}

interface PublishSuccessResult {
  status: 'fulfilled';
  value: unknown;
}

interface PublishFailureResult {
  status: 'rejected';
  reason: unknown;
}

type PublishResult = PublishSuccessResult | PublishFailureResult;

@Injectable()
export class OutboxProcessor implements OnApplicationShutdown {
  private readonly logger: Logger;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject('KAFKA_CLIENT')
    private readonly kafkaClient: ClientKafka,
  ) {
    this.logger = new NestLogger(OutboxProcessor.name);
  }

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
    this.timer = setTimeout(() => {
      void this.poll();
    }, OUTBOX_POLL_INTERVAL_MS);
  }

  private async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      await this.processOutbox();
    } catch (err) {
      this.logger.error('OutboxProcessor error', err instanceof Error ? err : new Error(String(err)));
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
      const events: OutboxEventRow[] = await queryRunner.query(
        `SELECT id, event_type, payload, created_at
         FROM outbox_events
         WHERE processed_at IS NULL
           AND retry_count < $1
         ORDER BY created_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        [OUTBOX_MAX_RETRIES, OUTBOX_BATCH_SIZE],
      ) as OutboxEventRow[];

      if (events.length === 0) {
        await queryRunner.commitTransaction();
        return;
      }

      this.logger.debug(`Processing ${String(events.length)} outbox events`);

      const publishPromises: Array<Promise<unknown>> = [];
      for (const event of events) {
        const messagePayload = {
          key: event.id,
          value: event.payload,
        };
        const promise = this.kafkaClient
          .emit(event.event_type, messagePayload)
          .toPromise() as Promise<unknown>;
        publishPromises.push(promise);
      }

      const publishResults: PublishResult[] = await Promise.allSettled(publishPromises) as PublishResult[];

      const ids: string[] = [];
      const failedIds: Array<{ id: string; error: string }> = [];

      for (let i = 0; i < publishResults.length; i++) {
        const result = publishResults[i];
        const event = events[i];
        if (result.status === 'fulfilled') {
          ids.push(event.id);
        } else {
          const errorReason = result.reason;
          const errorMessage = typeof errorReason === 'object' && errorReason !== null && 'message' in errorReason
            ? String((errorReason as { message: unknown }).message)
            : String(errorReason);
          failedIds.push({
            id: event.id,
            error: errorMessage,
          });
        }
      }

      if (ids.length > 0) {
        await queryRunner.query(
          `UPDATE outbox_events SET processed_at = NOW() WHERE id = ANY($1)`,
          [ids],
        );
      }

      for (const failed of failedIds) {
        await queryRunner.query(
          `UPDATE outbox_events
           SET retry_count = retry_count + 1, last_error = $2
           WHERE id = $1`,
          [failed.id, failed.error],
        );
        this.logger.warn(`Outbox event ${failed.id} failed: ${failed.error}`);
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