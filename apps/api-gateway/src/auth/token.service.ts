import { Injectable, UnauthorizedException } from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';
import { type Repository, type DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { type User } from '../users/entities/user.entity';
import { type RefreshToken } from '../users/entities/refresh-token.entity';

@Injectable()
export class TokenService {
  private readonly SALT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;

  constructor(
    private userRepository: Repository<User>,
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private dataSource: DataSource,
  ) {}

  async generateTokens(
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
    const refreshTokenHash = await this.hashToken(refreshToken);
    const family = uuidv4();

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: refreshTokenHash,
      family,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
    };
  }

  async generateTokensWithSession(
    user: User,
    session: { id: string },
    sessionData?: {
      deviceId?: string;
      deviceName?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const tokens = await this.generateTokens(user, sessionData);
    return {
      ...tokens,
      sessionId: session.id,
    };
  }

  async validateRefreshToken(token: string): Promise<{ userId: string; tokenId: string } | null> {
    const tokens = await this.refreshTokenRepository.find({
      where: { revokedAt: undefined },
      order: { createdAt: 'DESC' },
    });

    for (const rt of tokens) {
      const isValid = await this.compareToken(token, rt.tokenHash);
      if (isValid && !rt.isExpired) {
        return { userId: rt.userId, tokenId: rt.id };
      }
    }

    return null;
  }

  async rotateRefreshToken(oldTokenId: string): Promise<string> {
    const oldToken = await this.refreshTokenRepository.findOne({
      where: { id: oldTokenId },
    });

    if (!oldToken) {
      throw new UnauthorizedException('Token not found');
    }

    oldToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(oldToken);

    const newToken = crypto.randomBytes(64).toString('hex');
    const newTokenHash = await this.hashToken(newToken);

    await this.refreshTokenRepository.save({
      userId: oldToken.userId,
      tokenHash: newTokenHash,
      family: oldToken.family,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      replacedBy: oldToken.id,
    });

    return newToken;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const result = await this.dataSource.query(
      `SELECT * FROM get_user_permissions($1)`,
      [userId],
    );
    return result.map((row: { get_user_permissions: string }) => row.get_user_permissions) || [];
  }

  async generateAccessToken(user: User): Promise<string> {
    const permissions = await this.getUserPermissions(user.id);

    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'access',
        permissions,
      },
      { expiresIn: this.ACCESS_TOKEN_EXPIRY },
    );
  }

  hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, this.SALT_ROUNDS);
  }

  compareToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }
}