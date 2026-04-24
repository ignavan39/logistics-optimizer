import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { ApiKeyService } from './api-key.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { User } from '../users/entities/user.entity';
import { Session } from '../users/entities/session.entity';
import { ApiKey } from '../users/entities/api-key.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { RolesService, PermissionsService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'logistics-jwt-secret'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRY', '15m'),
        },
      }),
    }),
    UsersModule,
    RolesModule,
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: AuthService,
      useFactory: (
        dataSource: DataSource,
        usersService: UsersService,
        tokenService: TokenService,
        sessionService: SessionService,
        passwordService: PasswordService,
        apiKeyService: ApiKeyService,
      ) => new AuthService(
        dataSource.getRepository(User),
        dataSource.getRepository(Session),
        usersService,
        tokenService,
        sessionService,
        passwordService,
        apiKeyService,
        dataSource,
      ),
      inject: [
        'AUTH_DATA_SOURCE',
        UsersService,
        TokenService,
        SessionService,
        PasswordService,
        ApiKeyService,
      ],
    },
    {
      provide: SessionService,
      useFactory: (dataSource: DataSource) => new SessionService(
        dataSource.getRepository(Session),
        dataSource,
      ),
      inject: ['AUTH_DATA_SOURCE'],
    },
    {
      provide: TokenService,
      useFactory: (
        dataSource: DataSource,
        jwtService: JwtService,
      ) => new TokenService(
        dataSource.getRepository(User),
        dataSource.getRepository(RefreshToken),
        jwtService,
        dataSource,
      ),
      inject: ['AUTH_DATA_SOURCE', JwtService],
    },
    {
      provide: PasswordService,
      useFactory: (dataSource: DataSource) => new PasswordService(
        dataSource.getRepository(User),
        dataSource.getRepository(Session),
      ),
      inject: ['AUTH_DATA_SOURCE'],
    },
    {
      provide: ApiKeyService,
      useFactory: (dataSource: DataSource) => new ApiKeyService(
        dataSource.getRepository(ApiKey),
        dataSource.getRepository(User),
      ),
      inject: ['AUTH_DATA_SOURCE'],
    },
    {
      provide: JwtStrategy,
      useFactory: (
        configService: ConfigService,
        dataSource: DataSource,
      ) => new JwtStrategy(
        configService,
        dataSource.getRepository(User),
        dataSource.getRepository(ApiKey),
      ),
      inject: [ConfigService, 'AUTH_DATA_SOURCE'],
    },
    JwtAuthGuard,
    RbacGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    SessionService,
    PasswordService,
    ApiKeyService,
    JwtAuthGuard,
    RbacGuard,
    RolesModule,
  ],
})
export class AuthModule {}