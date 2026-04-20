import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';

@Entity('user_roles')
@Index(['userId'])
@Index(['roleId'])
export class UserRole {
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ name: 'role_id' })
  roleId!: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'NOW()' })
  assignedAt!: Date;

  @Column({ name: 'assigned_by', nullable: true })
  assignedBy?: string;

  @ManyToOne(() => User, (u) => u.userRoles, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Role, (r) => r.userRoles, { onDelete: 'CASCADE' })
  role!: Role;
}