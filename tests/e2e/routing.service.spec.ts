import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const PROTO_PATH = `${__dirname}/../../libs/proto/src/routing.proto`

describe('RoutingService E2E', () => {
  let client: any

  beforeAll(async () => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH)
    const grpcPackage = grpc.loadPackageDefinition(packageDefinition) as any
    const RoutingService = grpcPackage.routing.RoutingService

    client = new RoutingService('localhost:50053', grpc.credentials.createInsecure())

    await new Promise<void>((resolve, reject) => {
      client.waitForReady(Date.now() + 10000, (err: any) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  afterAll(() => {
    client?.close()
  })

  describe('CalculateRoute', () => {
    it('should calculate route between two points', (done) => {
      client.calculateRoute(
        {
          origin: { lat: 55.7558, lng: 37.6173 },
          destination: { lat: 55.7644, lng: 37.6225 },
          waypoints: [
            { lat: 55.7599, lng: 37.6200 },
          ],
          optimize_for: 'distance',
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.route_id).toBeDefined()
          expect(response.distance_km).toBeDefined()
          expect(response.duration_min).toBeDefined()
          expect(response.geometry).toBeDefined()
          done()
        },
      )
    })

    it('should calculate multiple routes', (done) => {
      client.calculateRoutes(
        {
          origin: { lat: 55.7558, lng: 37.6173 },
          destinations: [
            { lat: 55.7644, lng: 37.6225 },
            { lat: 55.7700, lng: 37.6300 },
            { lat: 55.7800, lng: 37.6400 },
          ],
          optimize_for: 'time',
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.routes).toBeDefined()
          expect(response.routes.length).toBeGreaterThan(0)
          done()
        },
      )
    })
  })

  describe('OptimizeRoute', () => {
    it('should optimize multi-stop route', (done) => {
      client.optimizeRoute(
        {
          vehicle_id: 'vehicle-001',
          stops: [
            { order_id: 'order-001', lat: 55.7558, lng: 37.6173 },
            { order_id: 'order-002', lat: 55.7644, lng: 37.6225 },
            { order_id: 'order-003', lat: 55.7700, lng: 37.6300 },
            { order_id: 'order-004', lat: 55.7800, lng: 37.6400 },
          ],
          start_depot: { lat: 55.7500, lng: 37.6100 },
          end_depot: { lat: 55.7500, lng: 37.6100 },
          constraints: {
            max_distance_km: 100,
            max_duration_min: 180,
            max_stops: 10,
          },
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.route_id).toBeDefined()
          expect(response.optimized_stops).toBeDefined()
          expect(response.total_distance_km).toBeDefined()
          expect(response.total_duration_min).toBeDefined()
          done()
        },
      )
    })
  })

  describe('GetTraffic', () => {
    it('should get traffic data for route', (done) => {
      client.getTraffic(
        {
          origin: { lat: 55.7558, lng: 37.6173 },
          destination: { lat: 55.7644, lng: 37.6225 },
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.congestion_level).toBeDefined()
          expect(response.estimated_delay_min).toBeDefined()
          done()
        },
      )
    })
  })
})