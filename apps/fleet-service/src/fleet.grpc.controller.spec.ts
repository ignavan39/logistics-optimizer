import { FleetGrpcController } from './fleet.grpc.controller'

describe('FleetGrpcController', () => {
  let controller: FleetGrpcController

  beforeEach(() => {
    controller = new FleetGrpcController()
  })

  describe('getAvailableVehicles', () => {
    it('should return available vehicles', async () => {
      const request = {
        near_point: { lat: 55.7558, lng: 37.6173 },
        radius_km: 10,
        min_capacity_kg: 100,
        min_capacity_m3: 5,
        limit: 5,
      }

      const result = await controller.getAvailableVehicles(request)

      expect(result.vehicles).toBeDefined()
      expect(Array.isArray(result.vehicles)).toBe(true)
    })

    it('should respect limit parameter', async () => {
      const request = {
        near_point: { lat: 55.7558, lng: 37.6173 },
        radius_km: 10,
        min_capacity_kg: 0,
        min_capacity_m3: 0,
        limit: 3,
      }

      const result = await controller.getAvailableVehicles(request)

      expect(result.vehicles.length).toBeLessThanOrEqual(3)
    })
  })

  describe('getVehicle', () => {
    it('should return vehicle by id', async () => {
      const request = { vehicle_id: 'vehicle-1' }

      const result = await controller.getVehicle(request)

      expect(result.vehicle).toBeDefined()
      expect(result.vehicle.id).toBe('vehicle-1')
    })

    it('should throw error for non-existent vehicle', async () => {
      const request = { vehicle_id: 'non-existent' }

      await expect(controller.getVehicle(request)).rejects.toThrow()
    })
  })

  describe('assignVehicle', () => {
    it('should successfully assign idle vehicle', async () => {
      const request = {
        vehicle_id: 'vehicle-1',
        order_id: 'order-123',
        expected_version: 1,
      }

      const result = await controller.assignVehicle(request)

      expect(result.success).toBe(true)
    })

    it('should fail for version mismatch', async () => {
      const request = {
        vehicle_id: 'vehicle-1',
        order_id: 'order-123',
        expected_version: 999,
      }

      const result = await controller.assignVehicle(request)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Version')
    })

    it('should fail for non-idle vehicle', async () => {
      const request1 = {
        vehicle_id: 'vehicle-1',
        order_id: 'order-123',
        expected_version: 1,
      }
      await controller.assignVehicle(request1)

      const request2 = {
        vehicle_id: 'vehicle-1',
        order_id: 'order-456',
        expected_version: 2,
      }

      const result = await controller.assignVehicle(request2)

      expect(result.success).toBe(false)
      expect(result.message).toContain('available')
    })
  })

  describe('releaseVehicle', () => {
    it('should successfully release vehicle', async () => {
      const request = {
        vehicle_id: 'vehicle-1',
        order_id: 'order-123',
      }

      const result = await controller.releaseVehicle(request)

      expect(result.success).toBe(true)
    })
  })
})