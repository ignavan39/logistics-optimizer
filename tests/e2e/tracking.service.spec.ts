import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const PROTO_PATH = `${__dirname}/../../libs/proto/src/tracking.proto`

describe('TrackingService E2E', () => {
  let client: any

  beforeAll(async () => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH)
    const grpcPackage = grpc.loadPackageDefinition(packageDefinition) as any
    const TrackingService = grpcPackage.tracking.TrackingService

    client = new TrackingService('localhost:50054', grpc.credentials.createInsecure())

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

  describe('TrackVehicle', () => {
    it('should track vehicle position', (done) => {
      client.trackVehicle(
        {
          vehicle_id: 'test-vehicle-tracking',
          position: {
            lat: 55.7558,
            lng: 37.6173,
            heading: 180,
            speed_kmh: 40,
          },
          timestamp: Date.now(),
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.vehicle_id).toBeDefined()
          done()
        },
      )
    })
  })

  describe('GetVehiclePosition', () => {
    it('should get vehicle current position', (done) => {
      client.getVehiclePosition(
        { vehicle_id: 'test-vehicle-001' },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.vehicle_id).toBeDefined()
          done()
        },
      )
    })
  })

  describe('GetVehicleHistory', () => {
    it('should get vehicle position history', (done) => {
      client.getVehicleHistory(
        {
          vehicle_id: 'test-vehicle-001',
          from: Date.now() - 3600000,
          to: Date.now(),
          limit: 100,
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.positions).toBeDefined()
          done()
        },
      )
    })
  })

  describe('GetVehiclesInArea', () => {
    it('should get vehicles in area', (done) => {
      client.getVehiclesInArea(
        {
          center: { lat: 55.7558, lng: 37.6173 },
          radius_km: 5,
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.vehicles).toBeDefined()
          done()
        },
      )
    })
  })
})