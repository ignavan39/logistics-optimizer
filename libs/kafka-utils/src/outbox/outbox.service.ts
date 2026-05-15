import { Injectable, Logger as NestLogger, type Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import type { KafkaEvent } from '../interfaces/kafka-event.interface';

/**
 * OutboxService — записывает события в outbox таблицу в рамках транзакции.
 *
 * Гарантирует: если запись в БД прошла (COMMIT), событие БУДЕТ отправлено в Kafka.
 * Паттерн: Transactional Outbox (Martin Fowler)
 *
 * Usage:
 *   await this.outboxService.save(manager, 'order', orderId, 'order.created', payload);
 */
@Injectable()
export class OutboxService {
  private readonly logger: Logger;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.logger = new NestLogger(OutboxService.name);
  }

  /**
   * Сохраняет событие в outbox в рамках существующей транзакции.
   * ВСЕГДА вызывать с тем же EntityManager, что и основной UPDATE/INSERT.
   */
  async save<T>(
    manager: EntityManager,
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: T,
  ): Promise<void> {
    const event: KafkaEvent<T> = {
      eventId: uuidv4(),
      source: process.env['SERVICE_NAME'] ?? 'unknown',
      type: eventType,
      aggregateId,
      occurredAt: new Date().toISOString(),
      version: 1,
      payload,
    };

    await manager.query(
      `INSERT INTO outbox_events
         (id, aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [event.eventId, aggregateType, aggregateId, eventType, JSON.stringify(event)],
    );

    this.logger.debug(
      `Outbox event saved: ${eventType} [${event.eventId}] for ${aggregateType}:${aggregateId}`,
    );
  }

  /**
   * Атомарный helper: создаёт транзакцию, выполняет бизнес-логику и сохраняет outbox.
   */
  async withTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(work);
  }
}