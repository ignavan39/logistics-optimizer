import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RolesService, PermissionsService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  CreateApiKeyDto,
  CreateUserDto,
} from './dto/user-auth.dto';
import { JwtAuthGuard, CurrentUser } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { Permissions } from './decorators/permissions.decorator';
import { Public } from './decorators/public.decorator';
import { RequestUser } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private rolesService: RolesService,
    private permissionsService: PermissionsService,
    private usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @Throttle({ default: { ttl: 60000, limit: 1000 } })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @Throttle({ default: { ttl: 60000, limit: 1000 } })
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate session' })
  async logout(@CurrentUser() user: RequestUser) {
    await this.authService.logout(user.userId, user.sessionId);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  async getMe(@CurrentUser() user: RequestUser) {
    return {
      userId: user.userId,
      email: user.email,
      type: user.type,
      permissions: user.permissions,
    };
  }

  @Post('refresh-permissions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh user permissions from DB without re-login' })
  async refreshPermissions(@CurrentUser() user: RequestUser) {
    const permissions = await this.authService.getUserPermissions(user.userId);
    return {
      userId: user.userId,
      permissions,
    };
  }

  @Get('my-roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user roles' })
  async getMyRoles(@CurrentUser() user: RequestUser) {
    return this.usersService.getUserRoles(user.userId);
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all available permissions' })
  async getAllPermissions() {
    return this.permissionsService.listPermissions();
  }

  @Get('all-roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all roles' })
  async getAllRoles() {
    return this.rolesService.listRoles();
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new API key' })
  async createApiKey(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.authService.createApiKey(user.userId, dto);
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (admin only)' })
  async findUsers(
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.findUsers();
  }

  @Post('admin/users')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new user (admin only)' })
  async createUser(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.authService.createUser(dto);
  }

  @Get('user-roles/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user roles by user ID' })
  async getUserRoles(
    @CurrentUser() user: RequestUser,
    @Param('userId') userId?: string,
  ) {
    const targetUserId = userId || user.userId;
    return this.authService.getUserRoles(targetUserId);
  }
}