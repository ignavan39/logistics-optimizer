import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs';
import { NotificationsGateway } from './notifications.gateway';

interface KafkaEventRaw {
  eventId: string;
  type: string;
  aggregateId: string;
  occurredAt: string;
  version: number;
  payload: {
    orderId?: string;
    customerId?: string;
    status?: string;
    vehicleId?: string;
    driverId?: string;
    eta?: number;
    reason?: string;
    lat?: number;
    lng?: number;
    speed?: number;
    heading?: number;
    destination?: {
      lat: number;
      lng: number;
    };
  };
}

export class NotificationsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsConsumer.name);
  private readonly processedEvents = new Set<string>();
  private kafka: Kafka;
  private consumer: Consumer;
  private isRunning = false;

  constructor(
    private readonly notificationsGateway: NotificationsGateway,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.kafka = new Kafka({
      clientId: 'api-gateway-notifications',
      brokers: [process.env['KAFKA_BROKER'] || 'kafka:9092'],
    });
    this.consumer = this.kafka.consumer({
      groupId: 'logistics.api-gateway-notifications',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
    this.logger.log('NotificationsConsumer initialized');
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.consumer.connect();
      this.logger.log('Kafka consumer connected');

      await this.consumer.subscribe({
        topics: [
          'order.created',
          'order.assigned',
          'order.completed',
          'order.failed',
          'order.cancelled',
          'vehicle.telemetry',
        ],
        fromBeginning: false,
      });
      this.logger.log('Subscribed to Kafka topics');

      this.isRunning = true;
      await this.consumer.run({
        eachMessage: async (payload) => {
          await this.handleMessage(payload);
        },
      });
    } catch (err) {
      this.logger.error(`Failed to start Kafka consumer: ${err}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.isRunning = false;
    try {
      await this.consumer.disconnect();
      this.logger.log('Kafka consumer disconnected');
    } catch (err) {
      this.logger.error(`Error disconnecting Kafka consumer: ${err}`);
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const offset = message.offset;
    const value = message.value?.toString();

    if (!value) {
      this.logger.warn(`Empty message on ${topic}`);
      return;
    }

    let event: KafkaEventRaw;
    try {
      event = JSON.parse(value) as KafkaEventRaw;
    } catch (err) {
      this.logger.error(`Failed to parse message: ${value.slice(0, 100)}`);
      return;
    }

    this.logger.log(`📥 ${topic} received: ${JSON.stringify(event).slice(0, 200)}...`);
    this.logger.log(`Partition: ${partition}, Offset: ${offset}`);

    try {
      await this.dataSource.query(
        'INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING',
        [event.eventId, topic],
      );
    } catch {
      this.logger.debug(`Duplicate event from DB: ${topic} [${event.eventId}]`);
      return;
    }

    if (this.processedEvents.has(event.eventId)) {
      this.logger.debug(`Duplicate event ignored: ${topic} [${event.eventId}]`);
      return;
    }
    this.processedEvents.add(event.eventId);
    if (this.processedEvents.size > 10_000) {
      const first = this.processedEvents.values().next().value;
      if (first) this.processedEvents.delete(first);
    }

    switch (topic) {
      case 'order.created':
        await this.handleOrderCreated(event);
        break;
      case 'order.assigned':
        await this.handleOrderAssigned(event);
        break;
      case 'order.completed':
        await this.handleOrderCompleted(event);
        break;
      case 'order.failed':
        await this.handleOrderFailed(event);
        break;
      case 'order.cancelled':
        await this.handleOrderCancelled(event);
        break;
      case 'vehicle.telemetry':
        await this.handleVehicleTelemetry(event);
        break;
      default:
        this.logger.warn(`Unknown topic: ${topic}`);
    }
  }

  private async handleOrderCreated(event: KafkaEventRaw): Promise<void> {
    if (!event.payload?.orderId) {
      this.logger.warn('Invalid order.created event');
      return;
    }
    const payload = {
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      status: 'created',
    };
    this.notificationsGateway.emitOrderEvent(event.payload.orderId, 'order.created', payload);
    this.logger.log(`Emitted order.created for order: ${event.payload.orderId}`);
  }

  private async handleOrderAssigned(event: KafkaEventRaw): Promise<void> {
    if (!event.payload?.orderId) return;
    this.notificationsGateway.emitOrderEvent(event.payload.orderId, 'order.assigned', {
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      status: 'assigned',
      vehicleId: event.payload.vehicleId,
      driverId: event.payload.driverId,
      eta: event.payload.eta,
    });
  }

  private async handleOrderCompleted(event: KafkaEventRaw): Promise<void> {
    if (!event.payload?.orderId) return;
    this.notificationsGateway.emitOrderEvent(event.payload.orderId, 'order.completed', {
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      status: 'completed',
    });
  }

  private async handleOrderFailed(event: KafkaEventRaw): Promise<void> {
    if (!event.payload?.orderId) return;
    this.notificationsGateway.emitOrderEvent(event.payload.orderId, 'order.failed', {
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      status: 'failed',
      reason: event.payload.reason,
    });
  }

  private async handleOrderCancelled(event: KafkaEventRaw): Promise<void> {
    if (!event.payload?.orderId) return;
    this.notificationsGateway.emitOrderEvent(event.payload.orderId, 'order.cancelled', {
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      status: 'cancelled',
      reason: event.payload.reason,
    });
  }

  private async handleVehicleTelemetry(event: KafkaEventRaw): Promise<void> {
    if (!event.payload?.destination) return;

    const distance = this.calculateDistance(
      event.payload.lat,
      event.payload.lng,
      event.payload.destination.lat,
      event.payload.destination.lng,
    );

    if (distance <= 5 && distance > 4.5) {
      this.notificationsGateway.emitOrderEvent(
        `vehicle:${event.payload.vehicleId}`,
        'vehicle.near_destination',
        {
          orderId: `vehicle:${event.payload.vehicleId}`,
          customerId: event.payload.customerId || '',
          vehicleId: event.payload.vehicleId,
          status: 'near_destination',
          eta: Math.round(distance / ((event.payload.speed || 1) / 3600)),
        },
      );
    }
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
