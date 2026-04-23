import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ContractEntity } from './contract.entity';

@Entity('contract_tariff')
@Index(['contractId', 'zone'], { unique: true })
export class ContractTariffEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'contract_id' })
  contractId!: string;

  @ManyToOne(() => ContractEntity)
  @JoinColumn({ name: 'contract_id' })
  contract?: ContractEntity;

  @Column({ length: 50 })
  zone!: string;

  @Column({ name: 'price_per_km', type: 'numeric', precision: 10, scale: 2 })
  pricePerKm!: number;

  @Column({ name: 'price_per_kg', type: 'numeric', precision: 10, scale: 2 })
  pricePerKg!: number;

  @Column({ name: 'min_price', type: 'numeric', precision: 10, scale: 2, nullable: true })
  minPrice?: number;

  @Column({ name: 'min_weight_kg', type: 'numeric', precision: 8, scale: 2, nullable: true })
  minWeightKg?: number;

  @Column({ name: 'loading_rate', type: 'numeric', precision: 10, scale: 2, nullable: true })
  loadingRate?: number;

  @Column({ name: 'unloading_rate', type: 'numeric', precision: 10, scale: 2, nullable: true })
  unloadingRate?: number;

  @Column({ name: 'waiting_rate', type: 'numeric', precision: 10, scale: 2, nullable: true })
  waitingRate?: number;

  @Column({ name: 'additional_insurance', type: 'numeric', precision: 5, scale: 2, nullable: true })
  additionalInsurance?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}