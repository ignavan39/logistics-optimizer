import {
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
@Index(['userId'])
@Index(['refreshTokenHash'])
@Index(['expiresAt'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'device_id', length: 255, nullable: true })
  deviceId?: string;

  @Column({ name: 'device_name', length: 255, nullable: true })
  deviceName?: string;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'refresh_token_hash', length: 255, nullable: true })
  refreshTokenHash?: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'last_used_at', type: 'timestamptz' })
  lastUsedAt!: Date;

  @ManyToOne(() => User, (u) => u.sessions, { onDelete: 'CASCADE' })
  user!: User;

  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }
}