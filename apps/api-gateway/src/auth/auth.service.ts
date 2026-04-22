import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Session } from '../users/entities/session.entity';
import { LoginDto, CreateApiKeyDto, CreateUserDto } from './dto/user-auth.dto';
import { RegisterDto } from '../users/dto/user.dto';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly SESSION_EXPIRY_DAYS = 7;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private usersService: UsersService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private passwordService: PasswordService,
    private apiKeyService: ApiKeyService,
    private dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.register(dto);
    const fullUser = await this.userRepository.findOne({ where: { id: user.userId } });
    return this.tokenService.generateTokens(fullUser!);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      await this.sessionService.recordLoginAttempt(dto.email, ipAddress, false, 'user_not_found');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await this.sessionService.recordLoginAttempt(dto.email, ipAddress, false, 'user_inactive');
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.isLocked) {
      await this.sessionService.recordLoginAttempt(dto.email, ipAddress, false, 'user_locked');
      throw new UnauthorizedException('Account is locked');
    }

    const isValidPassword = await this.passwordService.comparePassword(dto.password, user.passwordHash);

    if (!isValidPassword) {
      await this.passwordService.handleFailedLogin(
        user,
        this.sessionService.recordLoginAttempt.bind(this.sessionService),
        ipAddress,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.passwordService.handleSuccessfulLogin(
      user,
      this.sessionService.recordLoginAttempt.bind(this.sessionService),
    );

    const tokens = await this.tokenService.generateTokens(user, {
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      ipAddress,
      userAgent,
    });

    let session = null;
    if (dto.deviceId || dto.deviceName || dto.ipAddress || dto.userAgent) {
      const refreshToken = await this.getRefreshTokenHash(tokens.refreshToken);
      session = await this.sessionService.createSession({
        userId: user.id,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        ipAddress,
        userAgent,
        refreshTokenHash: refreshToken,
        expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      });
    }

    await this.sessionService.recordLoginAttempt(dto.email, ipAddress, true);

    return {
      ...tokens,
      sessionId: session?.id,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const tokenData = await this.tokenService.validateRefreshToken(refreshToken);

    if (!tokenData) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: tokenData.userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newRefreshToken = await this.tokenService.rotateRefreshToken(tokenData.tokenId);

    const accessToken = await this.tokenService.generateAccessToken(user);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid verification token');
    }

    if (user.verificationExpiresAt && user.verificationExpiresAt < new Date()) {
      throw new UnauthorizedException('Verification token expired');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpiresAt = undefined;
    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.sessionService.deleteSession(sessionId);
    } else {
      await this.sessionService.deleteUserSessions(userId);
    }
  }

  async createApiKey(userId: string, dto: CreateApiKeyDto) {
    return this.apiKeyService.createApiKey(userId, dto);
  }

  async validateApiKey(apiKey: string) {
    return this.apiKeyService.validateApiKey(apiKey);
  }

  async getUserPermissions(userId: string) {
    return this.tokenService.getUserPermissions(userId);
  }

  async getUserRoles(userId: string) {
    return this.usersService.getUserRoles(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    return this.passwordService.changePassword(userId, currentPassword, newPassword);
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

  async createUser(dto: CreateUserDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      isActive: true,
      isVerified: true,
    });

    await this.userRepository.save(user);

    await this.assignDefaultRole(user.id);

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  private async getRefreshTokenHash(token: string): Promise<string> {
    return this.passwordService.hashPassword(token);
  }

  private async assignDefaultRole(userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_at)
         SELECT $1, id, NOW() FROM roles WHERE name = 'user'`,
        [userId],
      );
    } finally {
      await queryRunner.release();
    }
  }
}