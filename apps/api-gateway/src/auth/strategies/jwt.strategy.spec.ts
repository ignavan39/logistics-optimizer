import { JwtStrategy } from './jwt.strategy';
import { type ConfigService } from '@nestjs/config';
import { type Repository } from 'typeorm';
import { type User } from '../../users/entities/user.entity';
import { type ApiKey } from '../../users/entities/api-key.entity';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let userRepository: Repository<User>;
  let apiKeyRepository: Repository<ApiKey>;

  beforeEach(() => {
    configService = {
      get: jest.fn(key => {
        if (key === 'JWT_SECRET') {
          return 'test-secret';
        }
        return null;
      }),
    } as Partial<ConfigService> as ConfigService;

    userRepository = {} as Partial<Repository<User>> as Repository<User>;
    apiKeyRepository = {} as Partial<Repository<ApiKey>> as Repository<ApiKey>;

    strategy = new JwtStrategy(
      configService as ConfigService,
      userRepository as Repository<User>,
      apiKeyRepository as Repository<ApiKey>,
    );
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('should call ConfigService.get for JWT_SECRET without default value', () => {
      // Пересоздаем стратегию с шпионом на configService.get
      const configServiceSpy = {
        get: jest.fn(key => {
          if (key === 'JWT_SECRET') {
            return 'test-secret';
          }
          return null;
        }),
      } as Partial<ConfigService> as ConfigService;

      new JwtStrategy(configServiceSpy, userRepository, apiKeyRepository);
      expect(configServiceSpy.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('validate', () => {
    it('should throw UnauthorizedException for invalid API key', async () => {
      // Мокируем репозитории
      apiKeyRepository.findOne = jest.fn().mockResolvedValue(null);

      const payload = {
        sub: 'api-key-id',
        email: 'test@example.com',
        type: 'api-key' as const,
        apiKeyId: 'some-id',
      };

      await expect(strategy.validate(payload as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue(null);
      apiKeyRepository.findOne = jest.fn().mockResolvedValue({
        id: 'api-key-id',
        isActive: true,
        user: { id: 'user-id', isActive: false },
      } as any);

      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
        type: 'access' as const,
      };

      await expect(strategy.validate(payload as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});