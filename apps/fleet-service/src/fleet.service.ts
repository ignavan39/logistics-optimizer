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

  async getVehicleDetails(id: string) {
    const vehicle = await this.vehicleRepo.findOne({ where: { id } })
    if (!vehicle) throw new NotFoundException(`Vehicle ${id} not found`)

    const driver = vehicle.currentDriverId
      ? await this.dataSource.query(
          `SELECT id, email, first_name, last_name, phone FROM users WHERE id = $1`,
          [vehicle.currentDriverId],
        ).then(rows => rows[0])
      : null

    const order = vehicle.currentOrderId
      ? await this.dataSource.query(
          `SELECT id, status, priority, pickup_address, delivery_address, created_at
           FROM orders WHERE id = $1`,
          [vehicle.currentOrderId],
        ).then(rows => rows[0])
      : null

    return {
      vehicle: {
        id: vehicle.id,
        type: vehicle.type,
        capacityKg: vehicle.capacityKg,
        capacityM3: vehicle.capacityM3,
        status: vehicle.status,
        currentLat: vehicle.currentLat,
        currentLng: vehicle.currentLng,
        currentDriverId: vehicle.currentDriverId,
        currentOrderId: vehicle.currentOrderId,
        lastUpdate: vehicle.lastUpdate,
        createdAt: vehicle.createdAt,
        driver: driver ? {
          id: driver.id,
          email: driver.email,
          firstName: driver.first_name,
          lastName: driver.last_name,
          phone: driver.phone,
        } : null,
        order: order ? {
          id: order.id,
          status: order.status,
          priority: order.priority,
          pickupAddress: order.pickup_address,
          deliveryAddress: order.delivery_address,
          createdAt: order.created_at,
        } : null,
      },
    }
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
    vehicle.currentDriverId = undefined
    vehicle.currentOrderId = undefined
    await this.vehicleRepo.save(vehicle)
  }
}