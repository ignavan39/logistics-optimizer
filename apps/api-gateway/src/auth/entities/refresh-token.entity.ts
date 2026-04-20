import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['userId'])
@Index(['tokenHash'])
@Index(['family'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'token_hash', length: 255 })
  tokenHash!: string;

  @Column({ length: 36 })
  family!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'replaced_by', nullable: true })
  replacedBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => User, (u) => u.sessions, { onDelete: 'CASCADE' })
  user!: User;

  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  get isRevoked(): boolean {
    return this.revokedAt !== undefined;
  }
}