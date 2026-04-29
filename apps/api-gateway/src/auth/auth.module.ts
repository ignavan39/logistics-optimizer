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
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
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
        dataSource,
        usersService,
        tokenService,
        sessionService,
        passwordService,
        apiKeyService,
      ),
      inject: [DataSource, UsersService, TokenService, SessionService, PasswordService, ApiKeyService],
    },
    {
      provide: SessionService,
      useFactory: (dataSource: DataSource) => new SessionService(dataSource),
      inject: [DataSource],
    },
    {
      provide: TokenService,
      useFactory: (
        dataSource: DataSource,
        jwtService: JwtService,
      ) => new TokenService(dataSource, jwtService),
      inject: [DataSource, JwtService],
    },
    {
      provide: PasswordService,
      useFactory: (dataSource: DataSource) => new PasswordService(dataSource),
      inject: [DataSource],
    },
    {
      provide: ApiKeyService,
      useFactory: (dataSource: DataSource) => new ApiKeyService(dataSource),
      inject: [DataSource],
    },
    {
      provide: JwtStrategy,
      useFactory: (
        configService: ConfigService,
        dataSource: DataSource,
      ) => new JwtStrategy(configService, dataSource),
      inject: [ConfigService, DataSource],
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
