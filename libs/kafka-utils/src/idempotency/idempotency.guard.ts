import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * IdempotencyGuard — защита Kafka-консюмеров от дублирующихся сообщений.
 *
 * При обработке события:
 *   1. Попытка INSERT event_id в processed_events (UNIQUE)
 *   2. Если уже есть → дубль, пропускаем
 *   3. Если нет → обрабатываем
 *
 * TTL: события хранятся 7 дней (TTL очищается через pg_cron или cron job).
 *
 * Важно: таблица должна быть создана в каждой БД сервиса-консюмера.
 * SQL: CREATE TABLE processed_events (
 *        event_id UUID PRIMARY KEY,
 *        event_type VARCHAR(100),
 *        processed_at TIMESTAMPTZ DEFAULT NOW()
 *      );
 */
@Injectable()
export class IdempotencyGuard {
  private readonly logger = new Logger(IdempotencyGuard.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Returns true if event should be processed (not a duplicate).
   * Returns false if event was already processed → caller should skip.
   */
  async shouldProcess(eventId: string, eventType: string): Promise<boolean> {
    try {
      await this.dataSource.query(
        `INSERT INTO processed_events (event_id, event_type)
         VALUES ($1, $2)
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId, eventType],
      );

      const result = await this.dataSource.query(
        `SELECT 1 FROM processed_events WHERE event_id = $1`,
        [eventId],
      );

      if (result.length === 0) {
        this.logger.warn(`Duplicate event detected: ${eventType} [${eventId}]`);
        return false;
      }

      return true;
    } catch (err) {
      // If idempotency check fails, log but allow processing
      // Better to process twice than lose an event
      this.logger.error(`Idempotency check failed for ${eventId}`, err);
      return true;
    }
  }
}
