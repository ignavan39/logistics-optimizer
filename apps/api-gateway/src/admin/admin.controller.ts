import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { type Repository } from 'typeorm';
import { type UsersService } from '../users/users.service';
import { type RolesService } from '../roles/roles.service';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { type ListAuditLogsQueryDto } from './dto/audit-log.dto';
import { type AssignRolesDto } from './dto/assign-roles.dto';
import { type ListUsersQueryDto } from '../users/dto/user.dto';
import { type UpdateUserDto } from '../users/dto/user.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
@Permissions('users.manage')
export class AdminController {
  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    @Inject(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users with filters' })
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.findUsers({
      limit: query.limit,
      offset: query.offset,
      search: query.search,
      status: query.status,
      roleId: query.roleId,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  async getUser(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }

  @Patch('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate user' })
  async deactivateUser(@Param('id') id: string) {
    await this.usersService.deactivateUser(id);
  }

  @Post('users/:id/roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign roles to user' })
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.rolesService.bulkAssignRoles(id, dto.roleIds);
  }

  @Delete('users/:id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove role from user' })
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
  ) {
    await this.rolesService.removeRoleFromUser(roleId, id);
  }

  @Get('users/:id/sessions')
  @ApiOperation({ summary: 'Get user sessions' })
  async getUserSessions(@Param('id') id: string) {
    return this.usersService.getUserSessions(id);
  }

  @Delete('users/:id/sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Terminate all user sessions' })
  async terminateUserSessions(@Param('id') id: string) {
    await this.usersService.terminateUserSessions(id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'List audit logs' })
  async listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const conditions: any[] = [];
    const params: any[] = [];

    if (query.userId) {
      params.push(query.userId);
      conditions.push(`user_id = $${params.length}`);
    }
    if (query.action) {
      params.push(query.action);
      conditions.push(`action = $${params.length}`);
    }
    if (query.resource) {
      params.push(query.resource);
      conditions.push(`resource = $${params.length}`);
    }
    if (query.from) {
      params.push(query.from);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (query.to) {
      params.push(query.to);
      conditions.push(`created_at <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.unshift(limit, offset);
    const [logs, countResult] = await Promise.all([
      this.auditLogRepository.query(
        `SELECT id, user_id, action, resource, resource_id, changes, ip_address, created_at
         FROM audit_logs
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        params,
      ),
      this.auditLogRepository.query(
        `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
        params.slice(2),
      ),
    ]);

    return {
      logs,
      total: parseInt(countResult[0]?.total || '0', 10),
      limit,
      offset,
    };
  }
}