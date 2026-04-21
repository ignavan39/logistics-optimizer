import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum OrderStatusEnum {
  PENDING = 1,
  ASSIGNED = 2,
  PICKED_UP = 3,
  IN_TRANSIT = 4,
  DELIVERED = 5,
  FAILED = 6,
  CANCELLED = 7,
}

export enum OrderPriorityEnum {
  NORMAL = 0,
  HIGH = 1,
  CRITICAL = 2,
}

export class GeoPointDto {
  @ApiProperty({ example: 55.7558 })
  @IsNumber()
  lat!: number

  @ApiProperty({ example: 37.6173 })
  @IsNumber()
  lng!: number

  @ApiPropertyOptional({ example: 'ул. Ленина 1, Москва' })
  @IsString()
  @IsOptional()
  address?: string
}

export class CreateOrderDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' })
  @IsString()
  customer_id!: string

  @ApiProperty({ type: GeoPointDto })
  @IsOptional()
  origin?: GeoPointDto

  @ApiProperty({ type: GeoPointDto })
  @IsOptional()
  destination?: GeoPointDto

  @ApiPropertyOptional({ enum: OrderPriorityEnum, example: 0 })
  @IsEnum(OrderPriorityEnum)
  @IsOptional()
  priority?: OrderPriorityEnum

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @IsOptional()
  weight_kg?: number

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  volume_m3?: number

  @ApiPropertyOptional({ example: 'Хрупкий груз' })
  @IsString()
  @IsOptional()
  notes?: string

  @ApiPropertyOptional({ example: 1735689600 })
  @IsNumber()
  @IsOptional()
  sla_deadline_unix?: number
}

export class GetOrderDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' })
  @IsString()
  order_id!: string
}

export class ListOrdersDto {
  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' })
  @IsString()
  @IsOptional()
  customer_id?: string

  @ApiPropertyOptional({ enum: OrderStatusEnum, example: 1 })
  @IsEnum(OrderStatusEnum)
  @IsOptional()
  status?: OrderStatusEnum

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20
}

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' })
  @IsString()
  order_id!: string

  @ApiProperty({ enum: OrderStatusEnum, example: 2 })
  @IsEnum(OrderStatusEnum)
  status!: OrderStatusEnum

  @ApiPropertyOptional({ example: 'Доставлен' })
  @IsString()
  @IsOptional()
  reason?: string

  @ApiPropertyOptional({ example: 'api-gateway' })
  @IsString()
  @IsOptional()
  updated_by?: string
}

export class CancelOrderDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' })
  @IsString()
  order_id!: string

  @ApiPropertyOptional({ example: 'Клиент отменил' })
  @IsString()
  @IsOptional()
  reason?: string
}