import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { VehicleEntity } from './entities/vehicle.entity'
import { TypeOrmModule } from '@nestjs/typeorm'

@Injectable()
export class FleetService {
  private readonly logger = new Logger(FleetService.name)

  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepo: Repository<VehicleEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getAvailableVehicles(nearPoint?: { lat: number; lng: number }, radiusM = 5000): Promise<VehicleEntity[]> {
    const qb = this.vehicleRepo
      .createQueryBuilder('v')
      .where('v.status = :status', { status: 'available' })

    if (nearPoint) {
      // PostGIS distance query would go here
      // For now, simple bounding box
      qb.andWhere('v.current_lat BETWEEN :minLat AND :maxLat', {
        minLat: nearPoint.lat - 0.1,
        maxLat: nearPoint.lat + 0.1,
      })
      qb.andWhere('v.current_lng BETWEEN :minLng AND :maxLng', {
        minLng: nearPoint.lng - 0.1,
        maxLng: nearPoint.lng + 0.1,
      })
    }

    return qb.take(20).getMany()
  }

  async getVehicle(id: string): Promise<VehicleEntity | null> {
    return this.vehicleRepo.findOne({ where: { id } })
  }

  async assignVehicle(vehicleId: string, driverId: string, orderId: string): Promise<VehicleEntity> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } })
    if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`)

    vehicle.status = 'assigned'
    vehicle.currentDriverId = driverId
    vehicle.currentOrderId = orderId
    return this.vehicleRepo.save(vehicle)
  }

  async releaseVehicle(vehicleId: string, reason?: string): Promise<void> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } })
    if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`)

    vehicle.status = 'available'
    vehicle.currentDriverId = null
    vehicle.currentOrderId = null
    await this.vehicleRepo.save(vehicle)
  }
}