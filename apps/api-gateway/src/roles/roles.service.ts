import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import {
  type CreateRoleDto,
  type UpdateRoleDto,
  type CreatePermissionDto,
} from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    private dataSource: DataSource,
  ) {}

  async listRoles() {
    return this.dataSource.getRepository(Role).find({
      relations: ['rolePermissions'],
      order: { name: 'ASC' },
    });
  }

  async getRole(id: string) {
    return this.dataSource.getRepository(Role).findOne({
      where: { id },
      relations: ['rolePermissions'],
    });
  }

  async createRole(dto: CreateRoleDto) {
    const role = this.dataSource.getRepository(Role).create({
      name: dto.name,
      description: dto.description,
    });
    const savedRole = await this.dataSource.getRepository(Role).save(role);

    if (dto.permissions?.length) {
      const permissions = await this.dataSource.getRepository(Permission).findBy({
        name: dto.permissions as any,
      });
      const rolePermissions = permissions.map((p) =>
        this.dataSource.getRepository(UserRole).manager.create('role_permission', {
          roleId: savedRole.id,
          permissionId: p.id,
        }),
      );
      if (rolePermissions.length) {
        await this.dataSource.getRepository(UserRole).manager.save('role_permission', rolePermissions);
      }
    }

    return savedRole;
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.dataSource.getRepository(Role).findOne({ where: { id } });
    if (!role) {
      return { error: 'Role not found' };
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    await this.dataSource.getRepository(Role).save(role);

    if (dto.permissions) {
      await this.dataSource.getRepository(Role).manager.query(
        'DELETE FROM role_permission WHERE role_id = $1',
        [id],
      );

      const permissions = await this.dataSource.getRepository(Permission).findBy({
        name: dto.permissions as any,
      });
      const rolePermissions = permissions.map((p) =>
        this.dataSource.getRepository(Role).manager.create('role_permission', {
          roleId: id,
          permissionId: p.id,
        }),
      );
      if (rolePermissions.length) {
        await this.dataSource.getRepository(Role).manager.save('role_permission', rolePermissions);
      }
    }

    return this.dataSource.getRepository(Role).findOne({ where: { id }, relations: ['rolePermissions'] });
  }

  async deleteRole(id: string) {
    await this.dataSource.getRepository(Role).manager.query(
      'DELETE FROM role_permission WHERE role_id = $1',
      [id],
    );
    await this.dataSource.getRepository(Role).manager.query(
      'DELETE FROM user_roles WHERE role_id = $1',
      [id],
    );
    await this.dataSource.getRepository(Role).delete({ id });
  }

  async assignRoleToUser(roleId: string, dto: { userId: string }) {
    const exists = await this.dataSource.getRepository(UserRole).findOne({
      where: { userId: dto.userId, roleId },
    });
    if (exists) {
      return { message: 'Role already assigned' };
    }

    await this.dataSource.getRepository(UserRole).save({
      userId: dto.userId,
      roleId,
    });

    return { message: 'Role assigned successfully' };
  }

  async removeRoleFromUser(roleId: string, userId: string) {
    await this.dataSource.getRepository(UserRole).delete({ userId, roleId });
  }

  async bulkAssignRoles(userId: string, roleIds: string[]) {
    const results = [];
    for (const roleId of roleIds) {
      const exists = await this.dataSource.getRepository(UserRole).findOne({
        where: { userId, roleId },
      });
      if (exists) {
        results.push({ roleId, status: 'already_assigned' });
        continue;
      }
      await this.dataSource.getRepository(UserRole).save({ userId, roleId });
      results.push({ roleId, status: 'assigned' });
    }
    return results;
  }
}

@Injectable()
export class PermissionsService {
  constructor(
    private dataSource: DataSource,
  ) {}

  async listPermissions() {
    return this.dataSource.getRepository(Permission).find({
      order: { name: 'ASC' },
    });
  }

  async getPermission(id: string) {
    return this.dataSource.getRepository(Permission).findOne({ where: { id } });
  }

  async createPermission(dto: CreatePermissionDto) {
    const permission = this.dataSource.getRepository(Permission).create({
      name: dto.name,
      description: dto.description,
      resource: dto.resource,
    });
    return this.dataSource.getRepository(Permission).save(permission);
  }

  async deletePermission(id: string) {
    await this.dataSource.getRepository(Permission).manager.query(
      'DELETE FROM role_permission WHERE permission_id = $1',
      [id],
    );
    await this.dataSource.getRepository(Permission).delete({ id });
  }
}
