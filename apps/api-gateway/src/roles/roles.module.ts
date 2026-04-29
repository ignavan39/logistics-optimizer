import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GuardsModule } from '../auth/guards/guards.module';
import { Role, Permission, UserRole } from './entities';
import { RolesService, PermissionsService } from './roles.service';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';

@Module({
  imports: [GuardsModule],
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
  ],
  exports: [RolesService, PermissionsService],
})
export class RolesModule {}