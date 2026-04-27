import { Logger as NestLogger, Injectable, type Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';

@Injectable()
export class IdempotencyGuard {
  private readonly logger: Logger;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.logger = new NestLogger(IdempotencyGuard.name);
  }

  async shouldProcess(eventId: string, eventType: string): Promise<boolean> {
    try {
      await this.dataSource.query(
        `INSERT INTO processed_events (event_id, event_type)
         VALUES ($1, $2)
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId, eventType],
      );

      const result = await this.dataSource.query<Array<{ event_id: string }>>(
        `SELECT event_id FROM processed_events WHERE event_id = $1`,
        [eventId],
      );

      if (result.length === 0) {
        this.logger.warn(`Duplicate event detected: ${eventType} [${eventId}]`);
        return false;
      }

      return true;
    } catch (err) {
      this.logger.error(`Idempotency check failed for ${eventId}`, err instanceof Error ? err : new Error(String(err)));
      return true;
    }
  }
}