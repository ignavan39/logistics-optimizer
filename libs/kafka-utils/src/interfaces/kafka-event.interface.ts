export interface KafkaEvent<T = unknown> {
  /** Globally unique event ID — used for idempotency */
  eventId: string;
  /** Source service that produced the event */
  source: string;
  /** Event type, e.g. "order.created" */
  type: string;
  /** Aggregate root ID this event belongs to */
  aggregateId: string;
  /** ISO-8601 timestamp */
  occurredAt: string;
  /** Event version for schema evolution */
  version: number;
  /** Event-specific payload */
  payload: T;
}

export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  processedAt: Date | null;
  retryCount: number;
  lastError: string | null;
}
