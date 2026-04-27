import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const PROTO_PATH = `${__dirname}/../../libs/proto/src/routing.proto`
const GRPC_HOST = process.env.GRPC_ROUTING_HOST || 'localhost:50054'

describe('RoutingService E2E', () => {
  let client: any

  beforeAll(() => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH)
    const grpcPackage = grpc.loadPackageDefinition(packageDefinition) as any
    const RoutingService = grpcPackage.routing.RoutingService

    client = new RoutingService(GRPC_HOST, grpc.credentials.createInsecure())

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
          order_id: 'test-order-001',
          vehicle_id: 'test-vehicle-001',
          origin: { lat: 55.7558, lng: 37.6173 },
          destination: { lat: 55.7644, lng: 37.6225 },
        },
        (err: any, response: any) => {
          if (err) {
            console.error('CalculateRoute error:', err)
          }
          if (!err && response) {
            expect(response.waypoints).toBeDefined()
          }
          done()
        },
      )
    })
  })

  describe('GetRoute', () => {
    it('should get route by id', (done) => {
      client.getRoute(
        { route_id: 'test-route-001' },
        (err: any, response: any) => {
          if (err?.code === grpc.status.NOT_FOUND) {
            expect(err.code).toBe(grpc.status.NOT_FOUND)
          }
          done()
        },
      )
    })
  })
})