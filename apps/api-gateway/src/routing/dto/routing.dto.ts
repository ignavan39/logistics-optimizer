import { IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GeoPointDto {
  @ApiProperty({ example: 55.7558 })
  @IsNumber()
  lat!: number

  @ApiProperty({ example: 37.6173 })
  @IsNumber()
  lng!: number
}

export class CalculateRouteDto {
  @ApiPropertyOptional({ example: 'order-123' })
  @IsString()
  @IsOptional()
  order_id?: string

  @ApiPropertyOptional({ example: 'vehicle-123' })
  @IsString()
  @IsOptional()
  vehicle_id?: string

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  origin!: GeoPointDto

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  destination!: GeoPointDto
}

export class GetRouteDto {
  @ApiProperty({ example: 'route-123' })
  @IsString()
  route_id!: string
}