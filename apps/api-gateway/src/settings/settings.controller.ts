import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions as PermissionDecorator } from '../auth/decorators/permissions.decorator'
import { Permissions } from '../auth/permissions/permissions';
import { SettingsService } from './settings.service';
import { CompanySettings, type UpdateCompanySettingsDto } from './settings.dto';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company')
  async getCompanySettings(): Promise<CompanySettings | null> {
    return this.settingsService.getCompanySettings();
  }

  @Put('company')
  @UseGuards(RbacGuard)
  @PermissionDecorator(Permissions.SETTINGS_MANAGE)
  async updateCompanySettings(@Body() dto: UpdateCompanySettingsDto): Promise<CompanySettings | null> {
    return this.settingsService.updateCompanySettings(dto);
  }
}