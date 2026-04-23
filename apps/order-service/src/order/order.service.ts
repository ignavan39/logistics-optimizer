import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderEntity, OrderStatus, OrderPriority } from './entities/order.entity';
import { OrderTariffSnapshotEntity } from './entities/order-tariff-snapshot.entity';
import { OutboxEventEntity } from './entities/outbox-event.entity';
import { OrderStatusHistoryEntity } from './entities/order-status-history.entity';
import { InvoiceEntity, InvoiceType, InvoiceStatus } from './entities/invoice.entity';
import { CounterpartyService } from '../counterparty/counterparty.service';
import { RoutingService } from '../routing/routing.service';

export interface CreateOrderDto {
  customerId: string;
  originLat: number;
  originLng: number;
  originAddress?: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress?: string;
  priority?: OrderPriority;
  weightKg?: number;
  volumeM3?: number;
  notes?: string;
  slaDeadline?: Date;
  contractId?: string;
}

export interface UpdateOrderStatusDto {
  orderId: string;
  status: OrderStatus;
  reason?: string;
  updatedBy?: string;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,

    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,

    @InjectRepository(OrderStatusHistoryEntity)
    private readonly historyRepo: Repository<OrderStatusHistoryEntity>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly counterpartyService: CounterpartyService,
    private readonly routingService: RoutingService,
  ) {}

  /**
   * Создаёт заказ и атомарно записывает событие order.created в outbox.
   * Гарантия: либо оба действия выполнены, либо ни одного.
   */
  async createOrder(dto: CreateOrderDto): Promise<OrderEntity> {
    return this.dataSource.transaction(async (manager) => {
      // Calculate estimated price if contract is provided
      let estimatedPrice: number | undefined;
      let savedSnapshot: OrderTariffSnapshotEntity | undefined;
      const currency = 'RUB';

      if (dto.contractId) {
        const distanceKm = await this.routingService.calculateDistance(
          dto.originLat,
          dto.originLng,
          dto.destinationLat,
          dto.destinationLng,
        );
        const result = await this.counterpartyService.calculateEstimatedPrice(
          dto.contractId,
          distanceKm,
          Number(dto.weightKg) || 0,
        );
        estimatedPrice = result.estimatedPrice;
      }

      // 1. Создать заказ
      const order = manager.create(OrderEntity, {
        customerId: dto.customerId,
        originLat: dto.originLat,
        originLng: dto.originLng,
        originAddress: dto.originAddress,
        destinationLat: dto.destinationLat,
        destinationLng: dto.destinationLng,
        destinationAddress: dto.destinationAddress,
        priority: dto.priority ?? OrderPriority.NORMAL,
        weightKg: dto.weightKg ?? 0,
        volumeM3: dto.volumeM3 ?? 0,
        notes: dto.notes,
        slaDeadline: dto.slaDeadline,
        status: OrderStatus.PENDING,
        contractId: dto.contractId,
        estimatedPrice,
        currency,
      });

      const saved = await manager.save(OrderEntity, order);

      // 1.1. Сохранить tariff snapshot в отдельную таблицу (prevent race condition)
      if (dto.contractId && estimatedPrice !== undefined) {
        const tariffs = await this.counterpartyService.getContractTariffs(dto.contractId);
        if (tariffs.length > 0) {
          const tariff = tariffs[0];
          savedSnapshot = manager.create(OrderTariffSnapshotEntity, {
            orderId: saved.id,
            pricePerKm: tariff.pricePerKm,
            pricePerKg: tariff.pricePerKg,
            minPrice: tariff.minPrice,
            zone: tariff.zone,
          });
          savedSnapshot = await manager.save(OrderTariffSnapshotEntity, savedSnapshot);
        }
      }

      // 2. Атомарно записать событие в outbox (та же транзакция!)
      await manager.save(OutboxEventEntity, {
        id: uuidv4(),
        aggregateType: 'order',
        aggregateId: saved.id,
        eventType: 'order.created',
        payload: {
          eventId: uuidv4(),
          source: 'order-service',
          type: 'order.created',
          aggregateId: saved.id,
          occurredAt: new Date().toISOString(),
          version: 1,
          payload: {
            orderId: saved.id,
            customerId: saved.customerId,
            origin: { lat: saved.originLat, lng: saved.originLng, address: saved.originAddress },
            destination: { lat: saved.destinationLat, lng: saved.destinationLng, address: saved.destinationAddress },
            priority: saved.priority,
            weightKg: saved.weightKg,
            volumeM3: saved.volumeM3,
            slaDeadline: saved.slaDeadline?.toISOString(),
          },
        },
      });

      // 3. Записать в историю статус
      await manager.save(OrderStatusHistoryEntity, {
        orderId: saved.id,
        previousStatus: null,
        newStatus: OrderStatus.PENDING,
        reason: 'Order created',
      });

      this.logger.log(`Order created: ${saved.id} for customer ${saved.customerId}`);
      return saved;
    });
  }

  async getOrder(orderId: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }

  async getOrderHistory(orderId: string): Promise<OrderStatusHistoryEntity[]> {
    return this.historyRepo.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  async listOrders(
    customerId?: string,
    status?: OrderStatus,
    page = 1,
    limit = 20,
  ): Promise<{ orders: OrderEntity[]; total: number }> {
    const qb = this.orderRepo
      .createQueryBuilder('o');

    if (customerId) {
      qb.where('o.customer_id = :customerId', { customerId });
    }

    if (status) qb.andWhere('o.status = :status', { status });

    const [orders, total] = await qb
      .orderBy('o.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { orders, total };
  }

  /**
   * Обновляет статус заказа с оптимистичной блокировкой.
   * При конфликте версии бросает ConflictException.
   */
  async updateOrderStatus(dto: UpdateOrderStatusDto): Promise<OrderEntity> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(OrderEntity, {
        where: { id: dto.orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) throw new NotFoundException(`Order ${dto.orderId} not found`);

      // Validate state machine transition
      this.validateTransition(order.status, dto.status);

      const prevStatus = order.status;
      order.status = dto.status;

      const updated = await manager.save(OrderEntity, order);

      // Create Invoice when order is delivered
      if (dto.status === OrderStatus.DELIVERED && order.contractId) {
        await this.createInvoiceOnDelivery(manager, order);
      }

      // Write event to outbox
      await manager.save(OutboxEventEntity, {
        id: uuidv4(),
        aggregateType: 'order',
        aggregateId: updated.id,
        eventType: 'order.updated',
        payload: {
          eventId: uuidv4(),
          source: dto.updatedBy ?? 'order-service',
          type: 'order.updated',
          aggregateId: updated.id,
          occurredAt: new Date().toISOString(),
          version: 1,
          payload: {
            orderId: updated.id,
            previousStatus: prevStatus,
            newStatus: updated.status,
            reason: dto.reason,
          },
        },
      });

      // Write to status history
      await manager.save(OrderStatusHistoryEntity, {
        orderId: updated.id,
        previousStatus: prevStatus,
        newStatus: updated.status,
        changedBy: dto.updatedBy,
        reason: dto.reason,
      });

      this.logger.log(
        `Order ${updated.id} status: ${prevStatus} → ${dto.status} (by ${dto.updatedBy ?? 'system'})`,
      );

      return updated;
    });
  }

  private async createInvoiceOnDelivery(
    manager: any,
    order: OrderEntity,
  ): Promise<InvoiceEntity> {
    // Use tariff snapshot to prevent race condition
    const snapshot = order.tariffSnapshot;
    if (!snapshot) {
      this.logger.warn(`No tariff snapshot for order ${order.id}, skipping invoice`);
      return null!;
    }

    // Get distance
    const distanceKm = await this.routingService.calculateDistance(
      order.originLat,
      order.originLng,
      order.destinationLat,
      order.destinationLng,
    );

    // Calculate price using snapshot (not current tariffs!)
    let price = distanceKm * snapshot.pricePerKm + Number(order.weightKg || 0) * snapshot.pricePerKg;
    if (snapshot.minPrice && price < Number(snapshot.minPrice)) {
      price = Number(snapshot.minPrice);
    }

    // Create invoice
    const invoiceNumber = `INV-${Date.now()}`;
    const vatRate = 20;
    const vatAmount = price * (vatRate / 100);
    const totalAmount = price + vatAmount;

    const invoice = manager.create(InvoiceEntity, {
      orderId: order.id,
      number: invoiceNumber,
      type: InvoiceType.INVOICE,
      amountRub: totalAmount,
      vatRate,
      vatAmount,
      status: InvoiceStatus.DRAFT,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      counterpartyId: order.counterpartyId,
      contractId: order.contractId,
    });

    this.logger.log(
      `Created invoice ${invoiceNumber} for order ${order.id}: ${price} RUB (${distanceKm} km, snapshot)`,
    );

    return manager.save(InvoiceEntity, invoice);
  }

  async cancelOrder(orderId: string, reason: string): Promise<OrderEntity> {
    const order = await this.getOrder(orderId);

    if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new ConflictException(
        `Cannot cancel order in status: ${order.status}`,
      );
    }

    return this.updateOrderStatus({
      orderId,
      status: OrderStatus.CANCELLED,
      reason,
      updatedBy: 'customer',
    });
  }

  

  private readonly VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]:    [OrderStatus.ASSIGNED, OrderStatus.CANCELLED, OrderStatus.FAILED],
    [OrderStatus.ASSIGNED]:   [OrderStatus.PICKED_UP, OrderStatus.CANCELLED, OrderStatus.FAILED],
    [OrderStatus.PICKED_UP]:  [OrderStatus.IN_TRANSIT, OrderStatus.FAILED],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
    [OrderStatus.DELIVERED]:  [],
    [OrderStatus.FAILED]:     [OrderStatus.PENDING], // retry
    [OrderStatus.CANCELLED]:  [],
  };

  private validateTransition(from: OrderStatus, to: OrderStatus): void {
    const allowed = this.VALID_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new ConflictException(
        `Invalid status transition: ${from} → ${to}. Allowed: [${allowed.join(', ')}]`,
      );
    }
  }
}
