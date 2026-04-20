import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { Session } from './entities/session.entity';
import { ApiKey } from './entities/api-key.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto, LoginDto, CreateApiKeyDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;
  private readonly SESSION_EXPIRY_DAYS = 7;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      isActive: true,
      isVerified: false,
    });

    await this.userRepository.save(user);

    return this.generateTokens(user);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      await this.recordLoginAttempt(dto.email, ipAddress, false, 'user_not_found');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await this.recordLoginAttempt(dto.email, ipAddress, false, 'user_inactive');
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.isLocked) {
      await this.recordLoginAttempt(dto.email, ipAddress, false, 'user_locked');
      throw new UnauthorizedException('Account is locked');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isValidPassword) {
      await this.handleFailedLogin(user, ipAddress);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.handleSuccessfulLogin(user);

    const tokens = await this.generateTokens(user, {
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      ipAddress,
      userAgent,
    });

    await this.recordLoginAttempt(dto.email, ipAddress, true);

    return tokens;
  }

  async refreshAccessToken(refreshToken: string) {
    const tokenData = await this.validateRefreshToken(refreshToken);

    if (!tokenData) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: tokenData.userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newRefreshToken = await this.rotateRefreshToken(tokenData.tokenId);

    const permissions = await this.getUserPermissions(user.id);

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'access',
        permissions,
      },
      { expiresIn: this.ACCESS_TOKEN_EXPIRY },
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.sessionRepository.delete({ id: sessionId });
    } else {
      await this.sessionRepository.delete({ userId });
    }
  }

  async createApiKey(userId: string, dto: CreateApiKeyDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const rawKey = `lk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, this.SALT_ROUNDS);
    const keyPrefix = rawKey.substring(0, 8);

    const apiKey = this.apiKeyRepository.create({
      userId,
      name: dto.name,
      keyHash,
      keyPrefix,
      scopes: dto.scopes || [],
      rateLimit: dto.rateLimit || 1000,
      expiresAt: dto.expiresAt,
      isActive: true,
    });

    await this.apiKeyRepository.save(apiKey);

    return {
      id: apiKey.id,
      key: rawKey,
      name: dto.name,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      expiresAt: dto.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async validateApiKey(apiKey: string): Promise<JwtPayload | null> {
    const keyPrefix = apiKey.substring(0, 8);
    const apiKeys = await this.apiKeyRepository.find({
      where: { keyPrefix, isActive: true },
      relations: ['user'],
    });

    for (const key of apiKeys) {
      if (key.isExpired || !key.user.isActive) {
        continue;
      }

      const isValid = await bcrypt.compare(apiKey, key.keyHash);
      if (isValid) {
        return {
          sub: key.user.id,
          email: key.user.email,
          type: 'api-key',
          apiKeyId: key.id,
          permissions: key.scopes,
        };
      }
    }

    return null;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const result = await this.dataSource.query(
      `SELECT get_user_permissions($1) as permissions`,
      [userId],
    );
    return result[0]?.permissions || [];
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    user.passwordChangedAt = new Date();
    await this.userRepository.save(user);

    await this.sessionRepository.delete({ userId });

    return { message: 'Password changed successfully' };
  }

  async getUserRoles(userId: string) {
    return this.dataSource.query(
      `SELECT r.id, r.name, r.description
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId],
    );
  }

  async assignRoles(userId: string, roleIds: string[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      await queryRunner.query(
        'DELETE FROM user_roles WHERE user_id = $1',
        [userId],
      );

      for (const roleId of roleIds) {
        await queryRunner.query(
          'INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES ($1, $2, NOW())',
          [userId, roleId],
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async generateTokens(
    user: User,
    sessionData?: {
      deviceId?: string;
      deviceName?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const permissions = await this.getUserPermissions(user.id);

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'access',
        permissions,
      },
      { expiresIn: this.ACCESS_TOKEN_EXPIRY },
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
    const family = uuidv4();

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: refreshTokenHash,
      family,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    let session: Session | null = null;
    if (sessionData) {
      session = await this.sessionRepository.save({
        userId: user.id,
        deviceId: sessionData.deviceId,
        deviceName: sessionData.deviceName,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      sessionId: session?.id,
    };
  }

  private async validateRefreshToken(token: string): Promise<{ userId: string; tokenId: string } | null> {
    const tokens = await this.refreshTokenRepository.find({
      where: { revokedAt: undefined },
      order: { createdAt: 'DESC' },
    });

    for (const rt of tokens) {
      const isValid = await bcrypt.compare(token, rt.tokenHash);
      if (isValid && !rt.isExpired) {
        return { userId: rt.userId, tokenId: rt.id };
      }
    }

    return null;
  }

  private async rotateRefreshToken(oldTokenId: string): Promise<string> {
    const oldToken = await this.refreshTokenRepository.findOne({
      where: { id: oldTokenId },
    });

    if (!oldToken) {
      throw new UnauthorizedException('Token not found');
    }

    oldToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(oldToken);

    const newToken = crypto.randomBytes(64).toString('hex');
    const newTokenHash = await bcrypt.hash(newToken, this.SALT_ROUNDS);

    await this.refreshTokenRepository.save({
      userId: oldToken.userId,
      tokenHash: newTokenHash,
      family: oldToken.family,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      replacedBy: oldToken.id,
    });

    return newToken;
  }

  private async handleFailedLogin(user: User, ipAddress?: string) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= 5) {
      const lockDuration = Math.min(2 ** (user.failedLoginAttempts - 5) * 60 * 1000, 30 * 60 * 1000);
      user.lockedUntil = new Date(Date.now() + lockDuration);
    }

    await this.userRepository.save(user);
    await this.recordLoginAttempt(user.email, ipAddress, false, 'invalid_password');
  }

  private async handleSuccessfulLogin(user: User) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);
  }

  private async recordLoginAttempt(
    email: string,
    ipAddress?: string,
    success?: boolean,
    reason?: string,
  ) {
    await this.dataSource.query(
      `INSERT INTO login_attempts (email, ip_address, success, reason)
       VALUES ($1, $2, $3, $4)`,
      [email, ipAddress, success || false, reason],
    );
  }
}
