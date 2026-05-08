import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'processed_events' })
export class ProcessedEvent {
  @PrimaryColumn({ name: 'event_id', type: 'varchar', length: 255 })
  eventId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType!: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt!: Date;
}
