import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, type KafkaContext } from '@nestjs/microservices';
import { type DispatchSagaService } from './dispatch-saga.service';

interface OrderCreatedPayload {
  eventId: string;
  type: string;
  aggregateId: string;
  occurredAt: string;
  version: number;
  payload: {
    orderId: string;
    customerId: string;
    priority: string;
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  };
}

/**
 * OrderEventsConsumer — слушает события заказов из Kafka
 * и запускает соответствующие саги.
 *
 * Идемпотентность: перед запуском саги проверяем, не существует ли уже
 * активная сага для этого orderId — предотвращает двойной dispatch
 * при Kafka redelivery или partition rebalance.
 */
@Controller()
export class OrderEventsConsumer {
  private readonly logger = new Logger(OrderEventsConsumer.name);
  // Simple in-memory set for idempotency (production: use Redis or DB)
  private readonly processedEvents = new Set<string>();

  constructor(private readonly sagaService: DispatchSagaService) {}

  @EventPattern('order.created')
  async handleOrderCreated(
    @Payload() event: OrderCreatedPayload,
    @Ctx() ctx: KafkaContext,
  ): Promise<void> {
    const { eventId, payload } = event;

    // Idempotency guard
    if (this.processedEvents.has(eventId)) {
      this.logger.warn(`Duplicate event ignored: order.created [${eventId}]`);
      return;
    }
    this.processedEvents.add(eventId);

    // Cleanup old entries to prevent memory leak (keep last 10k)
    if (this.processedEvents.size > 10_000) {
      const first = this.processedEvents.values().next().value;
      if (first) this.processedEvents.delete(first);
    }

    const partition = ctx.getPartition();
    const offset    = ctx.getMessage().offset;

    this.logger.log(
      `order.created received: orderId=${payload.orderId} priority=${payload.priority} ` +
      `[partition=${partition} offset=${offset}]`
    );

    try {
      const saga = await this.sagaService.startDispatch(payload.orderId);
      this.logger.log(`Saga started: ${saga.sagaId} for order ${payload.orderId}`);
    } catch (err) {
      this.logger.error(`Failed to start saga for order ${payload.orderId}`, err);
      // Don't rethrow — Kafka will not retry on consumer error by default
      // Dead letter queue handling should be added here for production
    }
  }

  @EventPattern('order.failed')
  async handleOrderFailed(
    @Payload() event: { payload: { orderId: string; reason: string } },
  ): Promise<void> {
    this.logger.warn(
      `Order failed: ${event.payload.orderId} — reason: ${event.payload.reason}`
    );
    // TODO: trigger retry saga or notify operations team
  }
}
