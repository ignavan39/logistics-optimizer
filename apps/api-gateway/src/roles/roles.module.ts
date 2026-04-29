import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GuardsModule } from '../auth/guards/guards.module';
import { RolesService, PermissionsService } from './roles.service';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [GuardsModule, DatabaseModule.forRoot()],
  controllers: [RolesController, PermissionsController],
  providers: [
    {
      provide: RolesService,
      useFactory: (dataSource: DataSource) => new RolesService(dataSource),
      inject: [DataSource],
    },
    {
      provide: PermissionsService,
      useFactory: (dataSource: DataSource) => new PermissionsService(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [RolesService, PermissionsService],
})
export class RolesModule {}