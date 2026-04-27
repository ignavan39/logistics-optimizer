import { IsString, IsNumber, IsOptional, Min, Max, IsInt } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GeoPointDto {
  @ApiProperty({ example: 55.7558 })
  @IsNumber()
  @IsOptional()
  lat?: number

  @ApiProperty({ example: 37.6173 })
  @IsNumber()
  @IsOptional()
  lng?: number
}

export class GetAvailableVehiclesDto {
  @ApiPropertyOptional({ type: GeoPointDto })
  @IsOptional()
  near_point?: GeoPointDto

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  radius_km?: number

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  min_capacity_kg?: number

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  min_capacity_m3?: number

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number
}

export class GetVehicleDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' })
  @IsString()
  vehicle_id!: string
}

export class AssignVehicleDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' })
  @IsString()
  vehicle_id!: string

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02' })
  @IsString()
  order_id!: string

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  expected_version?: number
}

export class ReleaseVehicleDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' })
  @IsString()
  vehicle_id!: string

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02' })
  @IsString()
  order_id!: string
}

export class UpdateVehicleDto {
  @ApiPropertyOptional({ enum: ['CAR', 'VAN', 'TRUCK'] })
  @IsOptional()
  @IsString()
  type?: 'CAR' | 'VAN' | 'TRUCK'

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity_kg?: number

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity_m3?: number

  @ApiPropertyOptional({ example: 55.7558 })
  @IsOptional()
  @IsNumber()
  current_lat?: number

  @ApiPropertyOptional({ example: 37.6173 })
  @IsOptional()
  @IsNumber()
  current_lng?: number

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  expected_version?: number
}