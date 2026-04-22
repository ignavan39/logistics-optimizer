import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role, Permission, UserRole, RolePermission } from './entities';
import { RolesService, PermissionsService } from './roles.service';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, UserRole, RolePermission])],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, PermissionsService, JwtAuthGuard, RbacGuard],
  exports: [RolesService, PermissionsService],
})
export class RolesModule {}