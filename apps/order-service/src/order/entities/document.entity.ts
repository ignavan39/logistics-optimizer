import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export enum DocumentType {
  TTN = 'ttn',
  AVR = 'avr',
  WAYBILL = 'waybill',
  ACT = 'act',
  INVOICE = 'invoice',
  FACTURA = 'factura',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  SIGNED = 'signed',
  CANCELLED = 'cancelled',
  SENT = 'sent',
}

export interface TTNContent {
  sender: {
    name: string
    address: string
    inn: string
    phone?: string
  }
  receiver: {
    name: string
    address: string
    inn: string
    phone?: string
  }
  cargo: Array<{
    name: string
    quantity: number
    weight: number
    packaging: string
  }>
  totalWeight: number
  totalQuantity: number
  driver?: string
  vehicle?: string
}

export interface AVRContent {
  orderId: string
  date: string
  works: Array<{
    description: string
    quantity: number
    price: number
  }>
  totalAmount: number
  executor: string
  customer: string
}

@Entity('document')
@Index(['orderId'])
@Index(['orderId', 'type'])
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({ type: 'enum', enum: DocumentType })
  type!: DocumentType;

  @Column({ length: 50 })
  number!: string;

  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.DRAFT })
  status!: DocumentStatus;

  @Column({ type: 'jsonb' })
  content!: TTNContent | AVRContent | Record<string, unknown>;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt?: Date;

  @Column({ name: 'signed_by', nullable: true })
  signedBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}