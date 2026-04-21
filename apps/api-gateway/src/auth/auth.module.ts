import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { AuthService } from './auth.service';
import { RolesService, PermissionsService } from './roles.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import {
  User,
  Role,
  Permission,
  UserRole,
  RolePermission,
  Session,
  ApiKey,
  RefreshToken,
} from './entities';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      UserRole,
      RolePermission,
      Session,
      ApiKey,
      RefreshToken,
    ]),
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
  ],
  controllers: [AuthController, RolesController, PermissionsController],
  providers: [AuthService, RolesService, PermissionsService, JwtStrategy, JwtAuthGuard, RbacGuard],
  exports: [AuthService, JwtAuthGuard, RbacGuard],
})
export class AuthModule {}