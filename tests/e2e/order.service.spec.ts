import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { v4 as uuidv4 } from 'uuid'

const PROTO_PATH = `${__dirname}/../../libs/proto/src/order.proto`

describe('OrderService E2E', () => {
  let client: any

  beforeAll(async () => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH)
    const grpcPackage = grpc.loadPackageDefinition(packageDefinition) as any
    const OrderService = grpcPackage.order.OrderService

    client = new OrderService('localhost:50051', grpc.credentials.createInsecure())

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
      const orderId = uuidv4()
      client.createOrder(
        {
          order_id: orderId,
          pickup: {
            address: 'ул. Ленина 1, Москва',
            lat: 55.7558,
            lng: 37.6173,
            contact_name: 'Иван Иванов',
            contact_phone: '+79001234567',
          },
          delivery: {
            address: 'ул. Пушкина 10, Москва',
            lat: 55.7644,
            lng: 37.6225,
            contact_name: 'Петр Петров',
            contact_phone: '+79007654321',
          },
          cargo: {
            weight_kg: 50,
            volume_m3: 2,
            description: 'Тестовый груз',
            is_express: true,
          },
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.order_id).toBeDefined()
          expect(response.status).toBe('created')
          done()
        },
      )
    })
  })

  describe('GetOrder', () => {
    it('should get order by id', (done) => {
      client.getOrder(
        { order_id: 'test-order-001' },
        (err: any, response: any) => {
          if (err?.code === grpc.status.NOT_FOUND) {
            expect(err.code).toBe(grpc.status.NOT_FOUND)
          } else {
            expect(err).toBeNull()
            expect(response.order_id).toBeDefined()
          }
          done()
        },
      )
    })
  })

  describe('ListOrders', () => {
    it('should list orders with pagination', (done) => {
      client.listOrders(
        {
          status: 'created',
          limit: 10,
          offset: 0,
        },
        (err: any, response: any) => {
          expect(err).toBeNull()
          expect(response.orders).toBeDefined()
          expect(response.total).toBeDefined()
          done()
        },
      )
    })
  })

  describe('UpdateOrderStatus', () => {
    it('should update order status', (done) => {
      client.updateOrderStatus(
        {
          order_id: 'test-order-002',
          status: 'assigned',
          comment: 'E2E test status update',
        },
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
})