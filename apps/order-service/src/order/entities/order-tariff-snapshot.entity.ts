import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('order_tariff_snapshots')
@Index(['orderId'], { unique: true })
@Index(['calculatedAt'])
export class OrderTariffSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({ name: 'price_per_km', type: 'decimal', precision: 10, scale: 2 })
  pricePerKm!: number;

  @Column({ name: 'price_per_kg', type: 'decimal', precision: 10, scale: 2 })
  pricePerKg!: number;

  @Column({ name: 'min_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minPrice?: number;

  @Column({ length: 50 })
  zone!: string;

  @CreateDateColumn({ name: 'calculated_at', type: 'timestamptz' })
  calculatedAt!: Date;
}