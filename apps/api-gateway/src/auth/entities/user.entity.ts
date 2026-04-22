import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { Session } from './session.entity';
import { ApiKey } from './api-key.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'])
@Index(['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'first_name', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', length: 100 })
  lastName!: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @Column({ name: 'verification_token', length: 64, nullable: true })
  verificationToken?: string;

  @Column({ name: 'verification_expires_at', type: 'timestamptz', nullable: true })
  verificationExpiresAt?: Date;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'password_changed_at', type: 'timestamptz', default: () => 'NOW()' })
  passwordChangedAt!: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date;

  @OneToMany(() => UserRole, (ur) => ur.user)
  userRoles!: UserRole[];

  @OneToMany(() => Session, (s) => s.user)
  sessions!: Session[];

  @OneToMany(() => ApiKey, (ak) => ak.user)
  apiKeys!: ApiKey[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isLocked(): boolean {
    return this.lockedUntil !== undefined && this.lockedUntil > new Date();
  }
}