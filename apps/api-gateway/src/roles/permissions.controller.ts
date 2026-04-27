import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { type PermissionsService } from './roles.service';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @Permissions('users.manage')
  @ApiOperation({ summary: 'List all permissions' })
  async listPermissions() {
    return this.permissionsService.listPermissions();
  }

  @Get(':id')
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Get permission by ID' })
  async getPermission(@Param('id') id: string) {
    return this.permissionsService.getPermission(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Create new permission' })
  async createPermission(@Body() dto: any) {
    return this.permissionsService.createPermission(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Delete permission' })
  async deletePermission(@Param('id') id: string) {
    await this.permissionsService.deletePermission(id);
  }
}