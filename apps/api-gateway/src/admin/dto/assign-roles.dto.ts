import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRolesDto {
  @ApiProperty({ isArray: true })
  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];
}