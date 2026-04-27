import { RoutingGrpcController } from './routing.grpc.controller'

describe('RoutingGrpcController', () => {
  let controller: RoutingGrpcController

  beforeEach(() => {
    controller = new RoutingGrpcController()
  })

  describe('calculateRoute', () => {
    it('should calculate route between two points', async () => {
      const request = {
        order_id: 'order-123',
        vehicle_id: 'vehicle-1',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7558, lng: 37.6173 },
      }

      const result = await controller.calculateRoute(request)

      expect(result.route_id).toBeDefined()
      expect(typeof result.route_id).toBe('string')
      expect(result.distance_meters).toBeDefined()
      expect(result.duration_seconds).toBeDefined()
      expect(result.waypoints).toBeDefined()
      expect(result.waypoints.length).toBe(2)
    })

    it('should calculate non-zero distance for different points', async () => {
      const request = {
        order_id: 'order-123',
        vehicle_id: 'vehicle-1',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 56.0, lng: 38.0 },
      }

      const result = await controller.calculateRoute(request)

      expect(result.distance_meters).toBeGreaterThan(0)
    })
  })

  describe('getRoute', () => {
    it('should return route by id', async () => {
      const calcRequest = {
        order_id: 'order-123',
        vehicle_id: 'vehicle-1',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 56.0, lng: 38.0 },
      }
      const calcResult = await controller.calculateRoute(calcRequest)

      const getRequest = { route_id: calcResult.route_id }
      const result = await controller.getRoute(getRequest)

      expect(result.route).toBeDefined()
      expect(result.route.id).toBe(calcResult.route_id)
      expect(result.route.order_id).toBe('order-123')
      expect(result.route.vehicle_id).toBe('vehicle-1')
    })

    it('should throw error for non-existent route', async () => {
      const request = { route_id: 'non-existent-route' }

      await expect(controller.getRoute(request)).rejects.toThrow()
    })
  })
})