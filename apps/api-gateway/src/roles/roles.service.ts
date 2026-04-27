import { Injectable } from '@nestjs/common';
import { type Repository } from 'typeorm';
import { type Role } from './entities/role.entity';
import { type Permission } from './entities/permission.entity';
import { type UserRole } from './entities/user-role.entity';
import {
  type CreateRoleDto,
  type UpdateRoleDto,
  type CreatePermissionDto,
} from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    private roleRepository: Repository<Role>,
    private permissionRepository: Repository<Permission>,
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async listRoles() {
    return this.roleRepository.find({
      relations: ['rolePermissions'],
      order: { name: 'ASC' },
    });
  }

  async getRole(id: string) {
    return this.roleRepository.findOne({
      where: { id },
      relations: ['rolePermissions'],
    });
  }

  async createRole(dto: CreateRoleDto) {
    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description,
    });
    const savedRole = await this.roleRepository.save(role);

    if (dto.permissions.length) {
      const permissions = await this.permissionRepository.findBy({
        name: dto.permissions as any,
      });
      const rolePermissions = permissions.map((p) =>
        this.userRoleRepository.manager.create('role_permission', {
          roleId: savedRole.id,
          permissionId: p.id,
        }),
      );
      if (rolePermissions.length) {
        await this.userRoleRepository.manager.save('role_permission', rolePermissions);
      }
    }

    return savedRole;
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      return { error: 'Role not found' };
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    await this.roleRepository.save(role);

    if (dto.permissions) {
      await this.userRoleRepository.manager.query(
        'DELETE FROM role_permission WHERE role_id = $1',
        [id],
      );

      const permissions = await this.permissionRepository.findBy({
        name: dto.permissions as any,
      });
      const rolePermissions = permissions.map((p) =>
        this.userRoleRepository.manager.create('role_permission', {
          roleId: id,
          permissionId: p.id,
        }),
      );
      if (rolePermissions.length) {
        await this.userRoleRepository.manager.save('role_permission', rolePermissions);
      }
    }

    return this.roleRepository.findOne({ where: { id }, relations: ['rolePermissions'] });
  }

  async deleteRole(id: string) {
    await this.userRoleRepository.manager.query(
      'DELETE FROM role_permission WHERE role_id = $1',
      [id],
    );
    await this.userRoleRepository.manager.query(
      'DELETE FROM user_roles WHERE role_id = $1',
      [id],
    );
    await this.roleRepository.delete({ id });
  }

  async assignRoleToUser(roleId: string, dto: { userId: string }) {
    const exists = await this.userRoleRepository.findOne({
      where: { userId: dto.userId, roleId },
    });
    if (exists) {
      return { message: 'Role already assigned' };
    }

    await this.userRoleRepository.save({
      userId: dto.userId,
      roleId,
    });

    return { message: 'Role assigned successfully' };
  }

  async removeRoleFromUser(roleId: string, userId: string) {
    await this.userRoleRepository.delete({ userId, roleId });
  }

  async bulkAssignRoles(userId: string, roleIds: string[]) {
    const results = [];
    for (const roleId of roleIds) {
      const exists = await this.userRoleRepository.findOne({
        where: { userId, roleId },
      });
      if (exists) {
        results.push({ roleId, status: 'already_assigned' });
        continue;
      }
      await this.userRoleRepository.save({ userId, roleId });
      results.push({ roleId, status: 'assigned' });
    }
    return results;
  }
}

@Injectable()
export class PermissionsService {
  constructor(
    private permissionRepository: Repository<Permission>,
  ) {}

  async listPermissions() {
    return this.permissionRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getPermission(id: string) {
    return this.permissionRepository.findOne({ where: { id } });
  }

  async createPermission(dto: CreatePermissionDto) {
    const permission = this.permissionRepository.create({
      name: dto.name,
      description: dto.description,
      resource: dto.resource,
    });
    return this.permissionRepository.save(permission);
  }

  async deletePermission(id: string) {
    await this.permissionRepository.manager.query(
      'DELETE FROM role_permission WHERE permission_id = $1',
      [id],
    );
    await this.permissionRepository.delete({ id });
  }
}
