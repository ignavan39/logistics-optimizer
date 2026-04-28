import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type DataSource } from 'typeorm';
import { Inject } from '@nestjs/common';
import { type ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

const POLL_INTERVAL_MS = 1_000;
const BATCH_SIZE = 50;
const MAX_RETRIES = 5;

@Injectable()
export class OutboxProcessor implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxProcessor.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isShuttingDown = false;

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @Inject('KAFKA_CLIENT') private readonly kafka: ClientKafka,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.connect();
    this.logger.log('OutboxProcessor started — polling every 1s');
    this.scheduleNext();
  }

  onApplicationShutdown(): void {
    this.isShuttingDown = true;
    if (this.timer) clearTimeout(this.timer);
    this.logger.log('OutboxProcessor stopped');
  }

  private scheduleNext(): void {
    if (this.isShuttingDown) return;
    void setTimeout(() => { void this.poll(); }, POLL_INTERVAL_MS);
  }

  private async poll(): Promise<void> {
    if (this.isProcessing) { this.scheduleNext(); return; }
    this.isProcessing = true;

    try {
      await this.processBatch();
    } catch (err) {
      this.logger.error('Outbox poll cycle failed', err);
    } finally {
      this.isProcessing = false;
      this.scheduleNext();
    }
  }

  private async processBatch(): Promise<void> {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const rows = await qr.query(
          `SELECT id, event_type, payload FROM outbox_events
           WHERE processed_at IS NULL AND retry_count < $1
           ORDER BY created_at ASC
           LIMIT $2
           FOR UPDATE SKIP LOCKED`,
          [MAX_RETRIES, BATCH_SIZE],
        ) as { id: string; event_type: string; payload: unknown }[];

      if (rows.length === 0) {
        await qr.commitTransaction();
        return;
      }

      this.logger.debug(`Outbox: publishing ${rows.length} events`);

      const publishPromises = rows.map((row) =>
        lastValueFrom(
          this.kafka.emit(String(row.event_type), {
            key: (row.payload as { aggregateId?: string }).aggregateId ?? row.id,
            value: JSON.stringify(row.payload),
          }),
        ),
      );
      const results = await Promise.allSettled(publishPromises);

      const successIds: string[] = [];
      const failures: Array<{ id: string; error: string }> = [];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === 'fulfilled') {
          successIds.push(rows[i].id);
        } else {
          failures.push({ id: rows[i].id, error: String(r.reason) });
        }
      }

      if (successIds.length) {
        await qr.query(
          `UPDATE outbox_events SET processed_at = NOW() WHERE id = ANY($1::uuid[])`,
          [successIds],
        );
        this.logger.log(`Outbox: published ${successIds.length} events`);
      }

      for (const { id, error } of failures) {
        await qr.query(
          `UPDATE outbox_events
           SET retry_count = retry_count + 1, last_error = $2
           WHERE id = $1`,
          [id, error.slice(0, 500)],
        );
        this.logger.warn(`Outbox: event ${id} failed — ${error}`);
      }

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
