import { Module } from '@nestjs/common';
import { SettingEntity } from './entities/setting.entity';
import { SettingsService } from './settings.service';
import { SettingsGrpcController } from './settings.grpc.controller';

@Module({
  controllers: [SettingsGrpcController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}