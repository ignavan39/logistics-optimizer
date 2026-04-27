import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { type SettingsService } from './settings.service';
import { type CompanySettings, type UpdateCompanySettingsDto } from './settings.dto';

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
  @Permissions('settings.manage')
  async updateCompanySettings(@Body() dto: UpdateCompanySettingsDto): Promise<CompanySettings | null> {
    return this.settingsService.updateCompanySettings(dto);
  }
}