import { IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class DispatchOrderDto {
  @ApiProperty({ example: 'order-123' })
  @IsString()
  order_id: string
}

export class GetDispatchStateDto {
  @ApiProperty({ example: 'saga-123' })
  @IsString()
  saga_id: string
}

export class CancelDispatchDto {
  @ApiProperty({ example: 'saga-123' })
  @IsString()
  saga_id: string

  @ApiPropertyOptional({ example: 'User cancelled' })
  @IsString()
  @IsOptional()
  reason?: string
}