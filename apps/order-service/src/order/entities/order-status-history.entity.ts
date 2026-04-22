import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('order_status_history')
@Index(['orderId', 'createdAt'])
export class OrderStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  @Index()
  orderId!: string;

  @Column({ name: 'previous_status', nullable: true })
  previousStatus?: string;

  @Column({ name: 'new_status' })
  newStatus!: string;

  @Column({ name: 'changed_by', nullable: true })
  changedBy?: string;

  @Column({ nullable: true, type: 'text' })
  reason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
