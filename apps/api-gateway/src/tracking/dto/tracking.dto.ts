import { IsString, IsNumber, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GetLatestPositionDto {
  @ApiProperty({ example: 'vehicle-123' })
  @IsString()
  vehicle_id: string
}

export class GetTrackDto {
  @ApiProperty({ example: 'vehicle-123' })
  @IsString()
  vehicle_id: string

  @ApiPropertyOptional({ example: 1700000000 })
  @IsNumber()
  @IsOptional()
  from_unix?: number

  @ApiPropertyOptional({ example: 1700100000 })
  @IsNumber()
  @IsOptional()
  to_unix?: number

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  max_points?: number
}