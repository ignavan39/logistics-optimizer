import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('api_keys')
@Index(['userId'])
@Index(['keyHash'])
@Index(['keyPrefix', 'isActive'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ name: 'key_hash', length: 255 })
  keyHash!: string;

  @Column({ name: 'key_prefix', length: 20 })
  keyPrefix!: string;

  @Column('text', { default: '{}', array: true })
  scopes!: string[];

  @Column({ name: 'rate_limit', default: 1000 })
  rateLimit!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date;

  @ManyToOne(() => User, (u) => u.apiKeys, { onDelete: 'CASCADE' })
  user!: User;

  get isExpired(): boolean {
    return this.expiresAt !== undefined && this.expiresAt < new Date();
  }
}