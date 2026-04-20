import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const PROTO_PATH = `${__dirname}/../../libs/proto/src/routing.proto`

describe('RoutingService E2E', () => {
  let client: any

  beforeAll(() => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH)
    const grpcPackage = grpc.loadPackageDefinition(packageDefinition) as any
    const RoutingService = grpcPackage.routing.RoutingService

    client = new RoutingService('localhost:50053', grpc.credentials.createInsecure())
  })

  afterAll(() => {
    client?.close()
  })

  it('should connect to routing-service gRPC', (done) => {
    client.waitForReady(Date.now() + 5000, (err: any) => {
      if (err) done(err)
      else done()
    })
  })

  it('should calculate route', (done) => {
    client.calculateRoute(
      {
        order_id: 'test-order-1',
        vehicle_id: 'vehicle-1',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 56.0, lng: 38.0 },
      },
      (err: any, response: any) => {
        expect(err).toBeNull()
        expect(response.route_id).toBeDefined()
        expect(response.distance_meters).toBeGreaterThan(0)
        done()
      },
    )
  })
})