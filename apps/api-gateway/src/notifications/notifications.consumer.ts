import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { type NotificationsGateway } from './notifications.gateway';

interface OrderEventPayload {
  eventId: string;
  type: string;
  aggregateId: string;
  occurredAt: string;
  version: number;
  payload: {
    orderId: string;
    customerId: string;
    status?: string;
    vehicleId?: string;
    driverId?: string;
    eta?: number;
    reason?: string;
  };
}

interface VehicleTelemetryPayload {
  vehicleId: string;
  customerId?: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  destination?: {
    lat: number;
    lng: number;
  };
}

@Controller()
export class NotificationsConsumer {
  private readonly logger = new Logger(NotificationsConsumer.name);
  private readonly processedEvents = new Set<string>();

  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  @EventPattern('order.created')
  async handleOrderCreated(
    @Payload() event: OrderEventPayload,
    @Ctx() ctx: KafkaContext,
  ): Promise<void> {
    await this.emitIfNotProcessed(event, 'order.created', ctx, () => ({
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      status: 'created',
    }));
  }

  @EventPattern('order.assigned')
  async handleOrderAssigned(
    @Payload() event: OrderEventPayload,
    @Ctx() ctx: KafkaContext,
  ): Promise<void> {
    await this.emitIfNotProcessed(event, 'order.assigned', ctx, () => ({
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      status: 'assigned',
      vehicleId: event.payload.vehicleId,
      driverId: event.payload.driverId,
      eta: event.payload.eta,
    }));
  }

  @EventPattern('order.completed')
  async handleOrderCompleted(
    @Payload() event: OrderEventPayload,
    @Ctx() ctx: KafkaContext,
  ): Promise<void> {
    await this.emitIfNotProcessed(event, 'order.completed', ctx, () => ({
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      status: 'completed',
    }));
  }

  @EventPattern('order.failed')
  async handleOrderFailed(
    @Payload() event: OrderEventPayload,
    @Ctx() ctx: KafkaContext,
  ): Promise<void> {
    await this.emitIfNotProcessed(event, 'order.failed', ctx, () => ({
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      status: 'failed',
      reason: event.payload.reason,
    }));
  }

  @EventPattern('vehicle.telemetry')
  async handleVehicleTelemetry(
    @Payload() payload: VehicleTelemetryPayload,
  ): Promise<void> {
    if (!payload.destination) return;

    const distance = this.calculateDistance(
      payload.lat,
      payload.lng,
      payload.destination.lat,
      payload.destination.lng,
    );

    if (distance <= 5 && distance > 4.5) {
      this.notificationsGateway.emitOrderEvent(
        `vehicle:${payload.vehicleId}`,
        'vehicle.near_destination',
        {
          orderId: `vehicle:${payload.vehicleId}`,
          customerId: payload.customerId || '',
          vehicleId: payload.vehicleId,
          status: 'near_destination',
          eta: Math.round(distance / (payload.speed / 3600)),
        },
      );
    }
  }

  private async emitIfNotProcessed(
    event: OrderEventPayload,
    eventType: string,
    ctx: KafkaContext,
    buildPayload: () => { orderId: string; customerId: string; status: string; [key: string]: unknown },
  ): Promise<void> {
    const { eventId, aggregateId } = event;

    if (this.processedEvents.has(eventId)) {
      this.logger.debug(`Duplicate event ignored: ${eventType} [${eventId}]`);
      return;
    }
    this.processedEvents.add(eventId);

    if (this.processedEvents.size > 10_000) {
      const first = this.processedEvents.values().next().value;
      if (first) this.processedEvents.delete(first);
    }

    const partition = ctx.getPartition();
    const offset = ctx.getMessage().offset;
    this.logger.log(
      `${eventType} received: orderId=${aggregateId} [partition=${partition} offset=${offset}]`
    );

    const payload = buildPayload();
    this.notificationsGateway.emitOrderEvent(aggregateId, eventType, payload);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
