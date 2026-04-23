import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingEntity } from './entities/setting.entity';
import { SettingsService } from './settings.service';
import { SettingsGrpcController } from './settings.grpc.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SettingEntity])],
  controllers: [SettingsGrpcController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}