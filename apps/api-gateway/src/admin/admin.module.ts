import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    UsersModule,
    RolesModule,
  ],
  controllers: [AdminController],
  providers: [
    JwtAuthGuard,
    RbacGuard,
    {
      provide: AuditLog,
      useFactory: (dataSource: DataSource) => dataSource.getRepository(AuditLog),
      inject: [DataSource],
    },
  ],
})
export class AdminModule {}