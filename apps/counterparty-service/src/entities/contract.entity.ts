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
import { CounterpartyEntity } from './counterparty.entity';

export enum ContractStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  DRAFT = 'draft',
}

@Entity('contract')
@Index(['counterpartyId', 'status'])
@Index(['number'], { unique: true })
export class ContractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'counterparty_id' })
  counterpartyId!: string;

  @ManyToOne(() => CounterpartyEntity)
  @JoinColumn({ name: 'counterparty_id' })
  counterparty?: CounterpartyEntity;

  @Column({ length: 50 })
  number!: string;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: 'timestamptz' })
  validTo!: Date;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status!: ContractStatus;

  @Column({ name: 'total_limit_rub', type: 'numeric', precision: 14, scale: 2, nullable: true })
  totalLimitRub?: number;

  @Column({ name: 'payment_terms_days', type: 'int', default: 30 })
  paymentTermsDays!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}