import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey } from '../users/entities/api-key.entity';
import { User } from '../users/entities/user.entity';
import { CreateApiKeyDto } from './dto/user-auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class ApiKeyService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

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

  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    await this.apiKeyRepository.delete({ id: keyId, userId });
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}