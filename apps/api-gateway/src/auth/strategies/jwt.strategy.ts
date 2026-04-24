import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApiKey } from '../../users/entities/api-key.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access' | 'api-key';
  permissions?: string[];
  sessionId?: string;
  apiKeyId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userRepository: Repository<User>,
    private apiKeyRepository: Repository<ApiKey>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (payload.type === 'api-key') {
      const apiKey = await this.apiKeyRepository.findOne({
        where: { id: payload.apiKeyId, isActive: true },
      });

      if (!apiKey || apiKey.isExpired) {
        throw new UnauthorizedException('Invalid API key');
      }

      apiKey.lastUsedAt = new Date();
      await this.apiKeyRepository.save(apiKey);

      return {
        userId: payload.sub,
        email: payload.email,
        type: 'api-key',
        permissions: payload.permissions || [],
        apiKeyId: payload.apiKeyId,
      };
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (user.isLocked) {
      throw new UnauthorizedException('Account is locked');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      type: 'access',
      permissions: payload.permissions || [],
      sessionId: payload.sessionId,
    };
  }
}

export interface RequestUser {
  userId: string;
  email: string;
  type: 'access' | 'api-key';
  permissions: string[];
  sessionId?: string;
  apiKeyId?: string;
}