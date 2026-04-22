import { FleetGrpcController } from './fleet.grpc.controller'
import { FleetService } from './fleet.service'

describe('FleetGrpcController', () => {
  let controller: FleetGrpcController
  let mockFleetService: jest.Mocked<FleetService>

  beforeEach(() => {
    mockFleetService = {
      getAvailableVehicles: jest.fn(),
      getVehicle: jest.fn(),
      getVehicleDetails: jest.fn(),
      assignVehicle: jest.fn(),
      releaseVehicle: jest.fn(),
    } as any

    controller = new FleetGrpcController(mockFleetService)
  })

  describe('getAvailableVehicles', () => {
    it('should return available vehicles', async () => {
      mockFleetService.getAvailableVehicles.mockResolvedValue([
        {
          id: 'vehicle-1',
          type: 'VAN',
          capacityKg: 1500,
          capacityM3: 8,
          status: 'available',
          version: 1,
          currentLat: 55.7558,
          currentLng: 37.6173,
          lastUpdate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

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
  })

  describe('getVehicle', () => {
    it('should return vehicle by id', async () => {
      mockFleetService.getVehicle.mockResolvedValue({
        id: 'vehicle-1',
        type: 'VAN',
        capacityKg: 1500,
        capacityM3: 8,
        status: 'available',
        version: 1,
      } as any)

      const result = await controller.getVehicle({ vehicleId: 'vehicle-1' })

      expect(result.vehicle).toBeDefined()
      expect(result.vehicle.id).toBe('vehicle-1')
    })

    it('should throw error for non-existent vehicle', async () => {
      mockFleetService.getVehicle.mockResolvedValue(null)

      await expect(
        controller.getVehicle({ vehicleId: 'non-existent' }),
      ).rejects.toThrow()
    })
  })

  describe('getVehicleDetails', () => {
    it('should return vehicle details', async () => {
      mockFleetService.getVehicleDetails.mockResolvedValue({
        vehicle: {
          id: 'vehicle-1',
          type: 'VAN',
          capacityKg: 1500,
          capacityM3: 8,
          status: 'available',
          currentLat: 55.7558,
          currentLng: 37.6173,
          currentDriverId: 'driver-1',
          currentOrderId: 'order-1',
          lastUpdate: new Date(),
          createdAt: new Date(),
          driver: { id: 'driver-1', email: 'driver@test.com', firstName: 'John', lastName: 'Doe', phone: '+1234567890' },
          order: { id: 'order-1', status: 'in_progress', priority: 'high', pickupAddress: 'A', deliveryAddress: 'B', createdAt: new Date() },
        },
      })

      const result = await controller.getVehicleDetails({ vehicleId: 'vehicle-1' })

      expect(result.vehicle).toBeDefined()
      expect(result.vehicle.current_driver_id).toBe('driver-1')
      expect(result.vehicle.driver).toEqual({
        id: 'driver-1',
        email: 'driver@test.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890',
      })
      expect(result.vehicle.order).toBeDefined()
      expect(result.vehicle.order?.id).toBe('order-1')
    })
  })

  describe('assignVehicle', () => {
    it('should successfully assign vehicle', async () => {
      mockFleetService.assignVehicle.mockResolvedValue({} as any)

      const result = await controller.assignVehicle({
        vehicle_id: 'vehicle-1',
        order_id: 'order-123',
        expected_version: 1,
      })

      expect(result.success).toBe(true)
    })

    it('should fail on error', async () => {
      mockFleetService.assignVehicle.mockRejectedValue(new Error('Version mismatch'))

      const result = await controller.assignVehicle({
        vehicle_id: 'vehicle-1',
        order_id: 'order-123',
        expected_version: 999,
      })

      expect(result.success).toBe(false)
    })
  })

  describe('releaseVehicle', () => {
    it('should successfully release vehicle', async () => {
      mockFleetService.releaseVehicle.mockResolvedValue()

      const result = await controller.releaseVehicle({
        vehicle_id: 'vehicle-1',
        order_id: 'order-123',
      })

      expect(result.success).toBe(true)
    })

    it('should fail on error', async () => {
      mockFleetService.releaseVehicle.mockRejectedValue(new Error('Not found'))

      const result = await controller.releaseVehicle({
        vehicle_id: 'vehicle-1',
        order_id: 'order-123',
      })

      expect(result.success).toBe(false)
    })
  })
})
