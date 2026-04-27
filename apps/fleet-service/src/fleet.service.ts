import type { Logger } from '@nestjs/common'
import { Logger as NestLogger, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository, DataSource } from 'typeorm'
import { VehicleEntity } from './entities/vehicle.entity'

interface DriverRow {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
}

interface OrderRow {
  id: string
  status: string
  priority: string
  pickup_address: string
  delivery_address: string
  created_at: Date
}

interface DriverInfo {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
}

interface OrderInfo {
  id: string
  status: string
  priority: string
  pickupAddress: string
  deliveryAddress: string
  createdAt: Date
}

interface VehicleDetails {
  id: string
  type: string
  capacityKg: number
  capacityM3: number
  status: string
  currentLat: number | undefined
  currentLng: number | undefined
  currentDriverId: string | undefined
  currentOrderId: string | undefined
  lastUpdate: Date
  createdAt: Date
  version: number
  driver: DriverInfo | null
  order: OrderInfo | null
}

interface GetVehicleDetailsResult {
  vehicle: VehicleDetails | null
}

interface UpdateVehicleResult {
  success: boolean
  message: string
  vehicle: GetVehicleDetailsResult
}

@Injectable()
export class FleetService {
  private readonly logger: Logger

  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepo: Repository<VehicleEntity>,
    private readonly dataSource: DataSource,
  ) {
    this.logger = new NestLogger(FleetService.name)
  }

  async getAvailableVehicles(
    nearPoint?: { lat: number; lng: number },
    radiusM = 5000,
  ): Promise<VehicleEntity[]> {
    const qb = this.vehicleRepo
      .createQueryBuilder('v')
      .where('v.status = :status', { status: 'available' })

    if (nearPoint) {
      qb.andWhere('v.current_lat BETWEEN :minLat AND :maxLat', {
        minLat: nearPoint.lat - 0.1,
        maxLat: nearPoint.lat + 0.1,
      })
      qb.andWhere('v.current_lng BETWEEN :minLng AND :maxLng', {
        minLng: nearPoint.lng - 0.1,
        maxLng: nearPoint.lng + 0.1,
      })
    }

    void radiusM
    return qb.take(20).getMany()
  }

  async getVehicle(id: string): Promise<VehicleEntity | null> {
    return this.vehicleRepo.findOne({ where: { id } })
  }

  async getVehicleDetails(id: string): Promise<GetVehicleDetailsResult> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id } })
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`)
    }

    let driver: DriverInfo | null = null
    if (vehicle.currentDriverId) {
      const driverRows = await this.dataSource.query<DriverRow[]>(
        `SELECT id, email, first_name, last_name, phone FROM users WHERE id = $1`,
        [vehicle.currentDriverId],
      )
      if (driverRows.length > 0) {
        const driverRow = driverRows[0]
        driver = {
          id: driverRow.id,
          email: driverRow.email,
          firstName: driverRow.first_name,
          lastName: driverRow.last_name,
          phone: driverRow.phone,
        }
      }
    }

    let order: OrderInfo | null = null
    if (vehicle.currentOrderId) {
      const orderRows = await this.dataSource.query<OrderRow[]>(
        `SELECT id, status, priority, pickup_address, delivery_address, created_at
         FROM orders WHERE id = $1`,
        [vehicle.currentOrderId],
      )
      if (orderRows.length > 0) {
        const orderRow = orderRows[0]
        order = {
          id: orderRow.id,
          status: orderRow.status,
          priority: orderRow.priority,
          pickupAddress: orderRow.pickup_address,
          deliveryAddress: orderRow.delivery_address,
          createdAt: orderRow.created_at,
        }
      }
    }

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
        version: vehicle.version,
        driver,
        order,
      },
    }
  }

  async assignVehicle(vehicleId: string, driverId: string, orderId: string): Promise<VehicleEntity> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } })
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`)
    }

    vehicle.status = 'assigned'
    vehicle.currentDriverId = driverId
    vehicle.currentOrderId = orderId
    return this.vehicleRepo.save(vehicle)
  }

  async releaseVehicle(vehicleId: string, _reason?: string): Promise<void> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } })
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`)
    }

    vehicle.status = 'available'
    vehicle.currentDriverId = undefined
    vehicle.currentOrderId = undefined
    await this.vehicleRepo.save(vehicle)
  }

  async updateVehicle(
    vehicleId: string,
    data: {
      type?: string
      capacityKg?: number
      capacityM3?: number
      currentLat?: number | null
      currentLng?: number | null
    },
    expectedVersion?: number,
  ): Promise<UpdateVehicleResult> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } })
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`)
    }

    if (expectedVersion !== undefined && vehicle.version !== expectedVersion) {
      throw new ConflictException(`Version mismatch: expected ${expectedVersion}, got ${vehicle.version}`)
    }

    if (data.type) vehicle.type = data.type
    if (data.capacityKg) vehicle.capacityKg = data.capacityKg
    if (data.capacityM3) vehicle.capacityM3 = data.capacityM3
    if (data.currentLat !== undefined) vehicle.currentLat = data.currentLat ?? undefined
    if (data.currentLng !== undefined) vehicle.currentLng = data.currentLng ?? undefined

    await this.vehicleRepo.save(vehicle)

    return {
      success: true,
      message: 'Vehicle updated',
      vehicle: await this.getVehicleDetails(vehicleId),
    }
  }
}