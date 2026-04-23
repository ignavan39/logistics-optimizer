import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export enum InvoiceType {
  INVOICE = 'invoice',
  ACT = 'act',
  FACTURA = 'factura',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity('invoice')
@Index(['orderId'])
@Index(['orderId', 'status'])
@Index(['dueDate'])
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({ length: 50 })
  number!: string;

  @Column({ type: 'enum', enum: InvoiceType })
  type!: InvoiceType;

  @Column({ name: 'amount_rub', type: 'numeric', precision: 12, scale: 2 })
  amountRub!: number;

  @Column({ name: 'vat_rate', type: 'numeric', precision: 4, scale: 2, default: 0 })
  vatRate!: number;

  @Column({ name: 'vat_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  vatAmount!: number;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod?: string;

  @Column({ name: 'counterparty_id', nullable: true })
  counterpartyId?: string;

  @Column({ name: 'contract_id', nullable: true })
  contractId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}