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
import { Permissions as PermissionDecorator } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../auth/permissions/permissions';
import { PermissionsService } from './roles.service';
import { CreatePermissionDto } from './dto/role.dto';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @PermissionDecorator(Permissions.USERS_MANAGE)
  @ApiOperation({ summary: 'List all permissions' })
  async listPermissions() {
    return this.permissionsService.listPermissions();
  }

  @Get(':id')
  @PermissionDecorator(Permissions.USERS_MANAGE)
  @ApiOperation({ summary: 'Get permission by ID' })
  async getPermission(@Param('id') id: string) {
    return this.permissionsService.getPermission(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @PermissionDecorator(Permissions.USERS_MANAGE)
  @ApiOperation({ summary: 'Create new permission' })
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.createPermission(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @PermissionDecorator(Permissions.USERS_MANAGE)
  @ApiOperation({ summary: 'Delete permission' })
  async deletePermission(@Param('id') id: string) {
    await this.permissionsService.deletePermission(id);
  }
}