import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123!' })
  @IsString()
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'My API Key' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: ['orders.read', 'orders.create'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  rateLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  expiresAt?: Date;
}

export class AssignRolesDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];
}

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Иван' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Петров' })
  @IsString()
  lastName!: string;
}