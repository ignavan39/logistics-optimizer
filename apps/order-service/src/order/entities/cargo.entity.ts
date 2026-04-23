import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export enum CargoStatus {
  PENDING = 'pending',
  LOADED = 'loaded',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
}

@Entity('cargo')
@Index(['orderId'])
@Index(['orderId', 'status'])
export class CargoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ name: 'weight_kg', type: 'numeric', precision: 8, scale: 2, default: 0 })
  weightKg!: number;

  @Column({ name: 'volume_m3', type: 'numeric', precision: 8, scale: 3, default: 0 })
  volumeM3!: number;

  @Column({ nullable: true })
  packaging?: string;

  @Column({ name: 'value_rub', type: 'numeric', precision: 12, scale: 2, nullable: true })
  valueRub?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: CargoStatus, default: CargoStatus.PENDING })
  status!: CargoStatus;

  @Column({ nullable: true })
  units?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}