import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role, Permission, UserRole, RolePermission } from './entities';
import { RolesService, PermissionsService } from './roles.service';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';

@Module({
  controllers: [RolesController, PermissionsController],
  providers: [
    {
      provide: RolesService,
      useFactory: (dataSource: DataSource) => new RolesService(
        dataSource.getRepository(Role),
        dataSource.getRepository(Permission),
        dataSource.getRepository(UserRole),
      ),
      inject: ['AUTH_DATA_SOURCE'],
    },
    {
      provide: PermissionsService,
      useFactory: (dataSource: DataSource) => new PermissionsService(
        dataSource.getRepository(Permission),
      ),
      inject: ['AUTH_DATA_SOURCE'],
    },
    JwtAuthGuard,
    RbacGuard,
  ],
  exports: [RolesService, PermissionsService],
})
export class RolesModule {}