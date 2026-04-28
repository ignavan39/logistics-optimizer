import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type AuthService } from './auth.service';
import { type UsersService } from '../users/users.service';
import {
  type RegisterDto,
  type LoginDto,
  type RefreshTokenDto,
  type ChangePasswordDto,
  type CreateApiKeyDto,
  type CreateUserDto,
} from './dto/user-auth.dto';
import { JwtAuthGuard, CurrentUser } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
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
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
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
  @ApiOperation({ summary: 'Logout and invalidate session' })
  async logout(@CurrentUser() user: { userId: string }, @Req() req: Request) {
    const sessionId = req.headers['x-session-id'] as string | undefined;
    return this.authService.logout(user.userId, sessionId);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user info' })
  async getMe(@CurrentUser() user: { userId: string }) {
    return this.usersService.findUserById(user.userId);
  }

  @Get('me/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get active sessions' })
  async getMySessions(@CurrentUser() user: { userId: string }) {
    return this.usersService.getUserSessions(user.userId);
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create API key' })
  async createApiKey(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.authService.createApiKey(user.userId, dto);
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List API keys' })
  async listApiKeys(@CurrentUser() user: { userId: string }) {
    return this.authService.listApiKeys(user.userId);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user (admin)' })
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.usersService.createUser(dto);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List users' })
  async listUsers(
    @CurrentUser() _user: { userId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const currentPage = page ? parseInt(page, 10) :1;
    const currentLimit = limit ? parseInt(limit, 10) :20;
    return this.usersService.findUsers({
      limit: currentLimit,
      offset: (currentPage - 1) * currentLimit,
    });
  }
}