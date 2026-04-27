import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { v4 as uuidv4 } from 'uuid'

const PROTO_PATH = `${__dirname}/../../libs/proto/src/order.proto`
const GRPC_HOST = process.env.GRPC_ORDER_HOST || 'localhost:50051'

describe('OrderService E2E', () => {
  let client: any

  beforeAll(() => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH)
    const grpcPackage = grpc.loadPackageDefinition(packageDefinition) as any
    const OrderService = grpcPackage.order.OrderService

    client = new OrderService(GRPC_HOST, grpc.credentials.createInsecure())

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

  describe('CreateOrder', () => {
    it('should create new order', (done) => {
      client.createOrder(
        {
          customer_id: uuidv4(),
          origin: {
            lat: 55.7558,
            lng: 37.6173,
            address: 'ул. Ленина 1, Москва',
          },
          destination: {
            lat: 55.7644,
            lng: 37.6225,
            address: 'ул. Пушкина 10, Москва',
          },
          priority: 0,
          weight_kg: 50,
          volume_m3: 2,
          notes: 'Тестовый заказ',
        },
        (err: any, response: any) => {
          if (err) {
            console.error('CreateOrder error:', err)
          }
          expect(err).toBeNull()
          expect(response.id).toBeDefined()
          done()
        },
      )
    })
  })

  describe('ListOrders', () => {
    it('should list orders with pagination', (done) => {
      client.listOrders(
        {
          page: 1,
          limit: 10,
        },
        (err: any, response: any) => {
          if (err) {
            console.error('ListOrders error:', err)
          }
          expect(err).toBeNull()
          expect(response.orders).toBeDefined()
          expect(response.total).toBeDefined()
          done()
        },
      )
    })
  })
})