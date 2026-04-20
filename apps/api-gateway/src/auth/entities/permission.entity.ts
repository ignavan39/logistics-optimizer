import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { RolePermission } from './role-permission.entity';

@Entity('permissions')
@Index(['name'], { unique: true })
@Index(['resource', 'action'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100, unique: true })
  name!: string;

  @Column({ length: 50 })
  resource!: string;

  @Column({ length: 50 })
  action!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions!: RolePermission[];
}