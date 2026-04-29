import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm'

@Entity('vehicles')
export class VehicleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 50 })
  type!: string

  @Column({ name: 'capacity_kg', type: 'integer' })
  capacityKg!: number

  @Column({ name: 'capacity_m3', type: 'decimal', precision: 10, scale: 2 })
  capacityM3!: number

  @Column({ type: 'varchar', length: 50, default: 'VEHICLE_STATUS_IDLE' })
  status!: string

  @VersionColumn()
  version!: number

  @Column({ name: 'current_location', type: 'geography', nullable: true })
  currentLocation?: unknown

  @Column({ name: 'current_driver_id', type: 'uuid', nullable: true })
  currentDriverId?: string

  @Column({ name: 'current_order_id', type: 'uuid', nullable: true })
  currentOrderId?: string

  @Column({ name: 'last_update', type: 'timestamptz' })
  lastUpdate!: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
