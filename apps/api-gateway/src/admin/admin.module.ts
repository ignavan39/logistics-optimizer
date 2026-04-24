import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';

@Module({
  imports: [
    UsersModule,
    RolesModule,
  ],
  controllers: [AdminController],
  providers: [JwtAuthGuard, RbacGuard],
})
export class AdminModule {}