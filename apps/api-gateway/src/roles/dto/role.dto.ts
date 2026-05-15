import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'dispatcher' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Can manage dispatches' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Can manage dispatches' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class AssignRoleDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty()
  @IsUUID()
  roleId!: string;
}

export class CreatePermissionDto {
  @ApiProperty({ example: 'orders.create' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Can create orders' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'orders' })
  @IsString()
  @IsOptional()
  resource?: string;
}
