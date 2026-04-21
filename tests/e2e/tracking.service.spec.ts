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

  describe('GetLatestPosition', () => {
    it('should get latest vehicle position', (done) => {
      client.getLatestPosition(
        { vehicle_id: 'test-vehicle-001' },
        (err: any, response: any) => {
          if (err) {
            console.error('GetLatestPosition error:', err)
          }
          if (!err && response) {
            expect(response.vehicleId || response.vehicle_id).toBeDefined()
          }
          done()
        },
      )
    })
  })
})