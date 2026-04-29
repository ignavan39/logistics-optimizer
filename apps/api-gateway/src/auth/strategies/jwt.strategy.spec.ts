import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let dataSource: DataSource;

  beforeEach(() => {
    configService = {
      get: jest.fn(key => {
        if (key === 'JWT_SECRET') {
          return 'test-secret';
        }
        return null;
      }),
    } as Partial<ConfigService> as ConfigService;

    dataSource = {
      getRepository: jest.fn(),
    } as Partial<DataSource> as DataSource;

    strategy = new JwtStrategy(
      configService as ConfigService,
      dataSource as DataSource,
    );
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('should call ConfigService.get for JWT_SECRET without default value', () => {
      const configServiceSpy = {
        get: jest.fn(key => {
          if (key === 'JWT_SECRET') {
            return 'test-secret';
          }
          return null;
        }),
      } as Partial<ConfigService> as ConfigService;

      new JwtStrategy(configServiceSpy, dataSource);
      expect(configServiceSpy.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('validate', () => {
    it('should throw UnauthorizedException for invalid API key', async () => {
      const apiKeyRepo = { findOne: jest.fn().mockResolvedValue(null) };
      (dataSource.getRepository as jest.Mock).mockReturnValue(apiKeyRepo);

      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
        type: 'api-key' as const,
        apiKeyId: 'some-id',
      };

      await expect(strategy.validate(payload as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const userRepo = { findOne: jest.fn().mockResolvedValue(null) };
      (dataSource.getRepository as jest.Mock).mockReturnValue(userRepo);

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