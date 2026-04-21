import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const PROTO_PATH = `${__dirname}/../../libs/proto/src/dispatcher.proto`

describe('DispatcherService E2E', () => {
  let client: any

  beforeAll(async () => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH)
    const grpcPackage = grpc.loadPackageDefinition(packageDefinition) as any
    const DispatcherService = grpcPackage.dispatcher.DispatcherService

    client = new DispatcherService('localhost:50055', grpc.credentials.createInsecure())

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

  describe('DispatchOrder', () => {
    it('should dispatch order to vehicle', (done) => {
      client.dispatchOrder(
        {
          order_id: 'test-order-dispatch-001',
          vehicle_id: 'test-vehicle-001',
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.dispatch_id).toBeDefined()
          expect(response.status).toBeDefined()
          done()
        },
      )
    })
  })

  describe('AutoDispatch', () => {
    it('should auto-dispatch order', (done) => {
      client.autoDispatch(
        {
          order_id: 'test-order-auto-001',
          preferences: {
            nearest_vehicle: true,
            min_capacity_kg: 10,
          },
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.dispatch_id).toBeDefined()
          done()
        },
      )
    })
  })

  describe('GetDispatchStatus', () => {
    it('should get dispatch status', (done) => {
      client.getDispatchStatus(
        { dispatch_id: 'dispatch-status-001' },
        (err: any, response: any) => {
          if (err?.code === grpc.status.NOT_FOUND) {
            expect(err.code).toBe(grpc.status.NOT_FOUND)
          } else {
            expect(err).toBeNull()
            expect(response.dispatch_id).toBeDefined()
          }
          done()
        },
      )
    })
  })

  describe('CancelDispatch', () => {
    it('should cancel dispatch', (done) => {
      client.cancelDispatch(
        { dispatch_id: 'dispatch-cancel-001' },
        (err: any, response: any) => {
          if (err?.code === grpc.status.NOT_FOUND) {
            expect(err.code).toBe(grpc.status.NOT_FOUND)
          } else {
            expect(err).toBeNull()
          }
          done()
        },
      )
    })
  })

  describe('GetActiveDispatches', () => {
    it('should get active dispatches', (done) => {
      client.getActiveDispatches(
        { vehicle_id: 'test-vehicle-001' },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.dispatches).toBeDefined()
          done()
        },
      )
    })
  })
})