import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const PROTO_PATH = `${__dirname}/../../libs/proto/src/fleet.proto`

describe('FleetService E2E', () => {
  let client: any

  beforeAll(() => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH)
    const grpcPackage = grpc.loadPackageDefinition(packageDefinition) as any
    const FleetService = grpcPackage.fleet.FleetService

    client = new FleetService('localhost:50053', grpc.credentials.createInsecure())
  })

  afterAll(() => {
    client?.close()
  })

  it('should connect to fleet-service gRPC', (done) => {
    client.waitForReady(Date.now() + 5000, (err: any) => {
      if (err) done(err)
      else done()
    })
  })

  it('should get available vehicles', (done) => {
    client.getAvailableVehicles(
      {
        near_point: { lat: 55.7558, lng: 37.6173 },
        radius_km: 10,
        min_capacity_kg: 100,
        min_capacity_m3: 5,
        limit: 5,
      },
      (err: any, response: any) => {
        expect(err).toBeNull()
        expect(response.vehicles).toBeDefined()
        done()
      },
    )
  })
})