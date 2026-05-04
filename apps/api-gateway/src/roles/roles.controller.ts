import {
  Controller,
  Get,
  Post,
  Patch,
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
import { RolesService } from './roles.service';
import { AssignRoleDto, CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@ApiTags('roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @Permissions('users.manage')
  @ApiOperation({ summary: 'List all roles' })
  async listRoles() {
    return this.rolesService.listRoles();
  }

  @Get(':id')
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Get role by ID' })
  async getRole(@Param('id') id: string) {
    return this.rolesService.getRole(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Create new role' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Patch(':id')
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Update role' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Delete role' })
  async deleteRole(@Param('id') id: string) {
    await this.rolesService.deleteRole(id);
  }

  @Post(':id/assign')
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRoleToUser(@Param('id') roleId: string, @Body() dto: AssignRoleDto) {
    return this.rolesService.assignRoleToUser(roleId, dto);
  }

  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Remove role from user' })
  async removeRoleFromUser(
    @Param('id') roleId: string,
    @Param('userId') userId: string,
  ) {
    await this.rolesService.removeRoleFromUser(roleId, userId);
  }
}