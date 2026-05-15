import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { OrderTariffSnapshotEntity } from './order-tariff-snapshot.entity';

export enum OrderStatus {
  PENDING    = 'pending',
  ASSIGNED   = 'assigned',
  PICKED_UP  = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED  = 'delivered',
  FAILED     = 'failed',
  CANCELLED  = 'cancelled',
}

export enum OrderPriority {
  NORMAL   = 'normal',
  HIGH     = 'high',
  CRITICAL = 'critical',
}

@Entity('orders')
@Index(['status', 'createdAt'])
@Index(['customerId', 'status'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id' })
  @Index()
  customerId!: string;

  
  @Column({ name: 'origin_lat', type: 'numeric', precision: 10, scale: 7 })
  originLat!: number;

  @Column({ name: 'origin_lng', type: 'numeric', precision: 10, scale: 7 })
  originLng!: number;

  @Column({ name: 'origin_address', nullable: true })
  originAddress?: string;

  
  @Column({ name: 'destination_lat', type: 'numeric', precision: 10, scale: 7 })
  destinationLat!: number;

  @Column({ name: 'destination_lng', type: 'numeric', precision: 10, scale: 7 })
  destinationLng!: number;

  @Column({ name: 'destination_address', nullable: true })
  destinationAddress?: string;

  
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  @Index()
  status!: OrderStatus;

  @Column({ type: 'enum', enum: OrderPriority, default: OrderPriority.NORMAL })
  priority!: OrderPriority;

  
  @Column({ name: 'weight_kg', type: 'numeric', precision: 8, scale: 2, default: 0 })
  weightKg!: number;

  @Column({ name: 'volume_m3', type: 'numeric', precision: 8, scale: 3, default: 0 })
  volumeM3!: number;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  
  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId?: string;

  @Column({ name: 'driver_id', nullable: true })
  driverId?: string;

  @Column({ name: 'route_id', nullable: true })
  routeId?: string;

  @Column({ name: 'counterparty_id', nullable: true })
  counterpartyId?: string;

  @Column({ name: 'sender_counterparty_id', nullable: true })
  senderCounterpartyId?: string;

  @Column({ name: 'receiver_counterparty_id', nullable: true })
  receiverCounterpartyId?: string;

  @Column({ name: 'contract_id', nullable: true })
  contractId?: string;

  @Column({ name: 'estimated_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  estimatedPrice?: number;

  @Column({ name: 'currency', length: 3, default: 'RUB' })
  currency!: string;

  @OneToOne(() => OrderTariffSnapshotEntity)
  @JoinColumn({ name: 'tariff_snapshot_id' })
  tariffSnapshot?: OrderTariffSnapshotEntity;

  
  @Column({ name: 'sla_deadline', type: 'timestamptz', nullable: true })
  slaDeadline?: Date;

  
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  /**
   * Optimistic locking — prevents concurrent assignment race conditions.
   * TypeORM increments this on every UPDATE automatically.
   */
  @VersionColumn()
  version!: number;
}
