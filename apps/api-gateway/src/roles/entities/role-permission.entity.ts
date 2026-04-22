import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('role_permissions')
@Index(['roleId'])
@Index(['permissionId'])
export class RolePermission {
  @PrimaryColumn({ name: 'role_id' })
  roleId!: string;

  @PrimaryColumn({ name: 'permission_id' })
  permissionId!: string;

  @Column({ name: 'granted_at', type: 'timestamptz', default: () => 'NOW()' })
  grantedAt!: Date;

  @ManyToOne(() => Role, (r) => r.rolePermissions, { onDelete: 'CASCADE' })
  role!: Role;

  @ManyToOne(() => Permission, (p) => p.rolePermissions, { onDelete: 'CASCADE' })
  permission!: Permission;
}