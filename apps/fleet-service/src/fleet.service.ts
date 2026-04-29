import type { Logger } from '@nestjs/common'
import { Logger as NestLogger, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
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

// Интерфейс для строки из БД (с полями current_lat/current_lng от PostGIS)
interface VehicleDetailsRow {
  id: string
  type: string
  capacity_kg: number
  capacity_m3: number
  status: string
  current_lat: number | null
  current_lng: number | null
  current_driver_id: string | null
  current_order_id: string | null
  last_update: Date
  created_at: Date
  updated_at: Date
  version: number
}

interface VehicleRow {
  id: string
  type: string
  capacity_kg: number
  capacity_m3: number
  status: string
  current_lat: number
  current_lng: number
  current_driver_id: string | null
  current_order_id: string | null
  last_update: Date
  created_at: Date
  updated_at: Date
  version: number
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
  ): Promise<Array<VehicleEntity & { current_lat?: number; current_lng?: number }>> {
    let query = `
      SELECT
        v.id, v.type, v.capacity_kg, v.capacity_m3, v.status, v.version,
        v.current_driver_id, v.current_order_id, v.last_update, v.created_at, v.updated_at,
        ST_Y(v.current_location::geometry) as current_lat,
        ST_X(v.current_location::geometry) as current_lng
      FROM vehicles v
      WHERE v.status = 'VEHICLE_STATUS_IDLE'
    `
    const params: unknown[] = []

    if (nearPoint) {
      query += ` AND ST_DWithin(v.current_location::geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)`
      params.push(nearPoint.lng, nearPoint.lat, radiusM)
    }

    query += ` LIMIT 20`

    const rows = await this.dataSource.query<Array<VehicleEntity & { current_lat?: number; current_lng?: number }>>(query, params)
    return rows
  }

  async getVehicle(id: string): Promise<VehicleEntity | null> {
    return this.vehicleRepo.findOne({ where: { id } })
  }

  async getVehicleDetails(id: string): Promise<GetVehicleDetailsResult> {
    const vehicleRows = await this.dataSource.query<VehicleRow[]>(
      `SELECT
        v.id, v.type, v.capacity_kg, v.capacity_m3, v.status,
        v.current_driver_id, v.current_order_id, v.last_update, v.created_at, v.updated_at, v.version,
        ST_Y(v.current_location::geometry) as current_lat,
        ST_X(v.current_location::geometry) as current_lng
      FROM vehicles v
      WHERE v.id = $1`,
      [id]
    )

    if (vehicleRows.length === 0) {
      throw new NotFoundException(`Vehicle ${id} not found`)
    }

    const vehicleRow = vehicleRows[0]

    let driver: DriverInfo | null = null
    if (vehicleRow.current_driver_id) {
      const driverRows = await this.dataSource.query<DriverRow[]>(
        `SELECT id, email, first_name, last_name, phone FROM users WHERE id = $1`,
        [vehicleRow.current_driver_id],
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
    if (vehicleRow.current_order_id) {
      const orderRows = await this.dataSource.query<OrderRow[]>(
        `SELECT id, status, priority, pickup_address, delivery_address, created_at
         FROM orders WHERE id = $1`,
        [vehicleRow.current_order_id],
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
        id: vehicleRow.id,
        type: vehicleRow.type,
        capacityKg: vehicleRow.capacity_kg,
        capacityM3: Number(vehicleRow.capacity_m3),
        status: vehicleRow.status,
        currentLat: vehicleRow.current_lat,
        currentLng: vehicleRow.current_lng,
        currentDriverId: vehicleRow.current_driver_id || undefined,
        currentOrderId: vehicleRow.current_order_id || undefined,
        lastUpdate: vehicleRow.last_update,
        createdAt: vehicleRow.created_at,
        version: vehicleRow.version,
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
    if (data.currentLat !== undefined && data.currentLng !== undefined) {
      vehicle.currentLocation = data.currentLat !== null && data.currentLng !== null
        ? `SRID=4326;POINT(${data.currentLng} ${data.currentLat})`
        : null
    }

    await this.vehicleRepo.save(vehicle)

    return {
      success: true,
      message: 'Vehicle updated',
      vehicle: await this.getVehicleDetails(vehicleId),
    }
  }
}