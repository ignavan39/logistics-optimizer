import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { v4 as uuidv4 } from 'uuid'

const PROTO_PATH = `${__dirname}/../../libs/proto/src`

describe('gRPC Cross-Service Integration', () => {
  let orderClient: any
  let invoiceClient: any
  let fleetClient: any
  let routingClient: any
  let counterpartyClient: any
  let trackingClient: any
  let dispatcherClient: any

  beforeAll(async () => {
    // Загружаем proto файлы
    const orderProto = protoLoader.loadSync(`${PROTO_PATH}/order.proto`)
    const invoiceProto = protoLoader.loadSync(`${PROTO_PATH}/invoice.proto`)
    const fleetProto = protoLoader.loadSync(`${PROTO_PATH}/fleet.proto`)
    const routingProto = protoLoader.loadSync(`${PROTO_PATH}/routing.proto`)
    const counterpartyProto = protoLoader.loadSync(`${PROTO_PATH}/counterparty.proto`)
    const trackingProto = protoLoader.loadSync(`${PROTO_PATH}/tracking.proto`)
    const dispatcherProto = protoLoader.loadSync(`${PROTO_PATH}/dispatcher.proto`)

    const orderPkg = grpc.loadPackageDefinition(orderProto) as any
    const invoicePkg = grpc.loadPackageDefinition(invoiceProto) as any
    const fleetPkg = grpc.loadPackageDefinition(fleetProto) as any
    const routingPkg = grpc.loadPackageDefinition(routingProto) as any
    const counterpartyPkg = grpc.loadPackageDefinition(counterpartyProto) as any
    const trackingPkg = grpc.loadPackageDefinition(trackingProto) as any
    const dispatcherPkg = grpc.loadPackageDefinition(dispatcherProto) as any

    // Создаем gRPC клиенты - используем env vars для docker networking
    const createClient = (Service: any, hostEnv: string) => {
      const host = process.env[hostEnv] || hostEnv
      console.log(`Creating ${hostEnv} client for ${host}`)
      return new Service(host, grpc.credentials.createInsecure())
    }

    orderClient = createClient(orderPkg.order.OrderService, 'GRPC_ORDER_HOST')
    invoiceClient = createClient(invoicePkg.invoice.InvoiceService, 'GRPC_INVOICE_HOST')
    fleetClient = createClient(fleetPkg.fleet.FleetService, 'GRPC_FLEET_HOST')
    routingClient = createClient(routingPkg.routing.RoutingService, 'GRPC_ROUTING_HOST')
    trackingClient = createClient(trackingPkg.tracking.TrackingService, 'GRPC_TRACKING_HOST')
    dispatcherClient = createClient(dispatcherPkg.dispatcher.DispatcherService, 'GRPC_DISPATCHER_HOST')
    counterpartyClient = createClient(counterpartyPkg.counterparty.CounterpartyService, 'GRPC_COUNTERPARTY_HOST')

    // Ждем готовности сервисов (увеличенный таймаут для docker)
    const waitForReady = (client: any, name: string) => new Promise<void>((resolve, reject) => {
      console.log(`Waiting for ${name}...`)
      client.waitForReady(Date.now() + 30000, (err: any) => {
        if (err) {
          console.error(`Failed to connect to ${name}:`, err.message)
          reject(err)
        } else {
          console.log(`${name} ready`)
          resolve()
        }
      })
    })

    await Promise.all([
      waitForReady(orderClient, 'order-service'),
      waitForReady(invoiceClient, 'invoice-service'),
      waitForReady(fleetClient, 'fleet-service'),
      waitForReady(routingClient, 'routing-service'),
      waitForReady(trackingClient, 'tracking-service'),
      waitForReady(dispatcherClient, 'dispatcher-service'),
      waitForReady(counterpartyClient, 'counterparty-service'),
    ])
  })

  afterAll(() => {
    orderClient?.close()
    invoiceClient?.close()
    fleetClient?.close()
    routingClient?.close()
    trackingClient?.close()
    dispatcherClient?.close()
    counterpartyClient?.close()
  })

  describe('Order Service → Invoice integration', () => {
    it('should create order and retrieve via invoice-service', async () => {
      const customerId = `grpc-test-${uuidv4()}`

      // Создаем заказ в order-service
      const order = await new Promise<any>((resolve, reject) => {
        orderClient.createOrder({
          customer_id: customerId,
          origin: { lat: 55.7558, lng: 37.6173, address: 'Москва, ул. Ленина 1' },
          destination: { lat: 55.7644, lng: 37.6225, address: 'СПб, Невский пр. 10' },
          priority: 0,
          weight_kg: 100,
          volume_m3: 2,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(order.id).toBeDefined()
      expect(order.status).toBe(1) // PENDING

      // Получаем заказ через invoice-service (который проксирует к order-service)
      // Note: invoice-service имеет метод GetOrder
      const invoiceByOrder = await new Promise<any>((resolve, reject) => {
        invoiceClient.getInvoiceByOrder({
          order_id: order.id,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      // Если счет еще не создан, будет null - это нормально
      expect(invoiceByOrder === null || invoiceByOrder.id !== undefined).toBe(true)
    })
  })

  describe('Fleet Service → Routing integration', () => {
    it('should calculate route for vehicle', async () => {
      const route = await new Promise<any>((resolve, reject) => {
        routingClient.calculateRoute({
          origin: { lat: 55.7558, lng: 37.6173 },
          destination: { lat: 55.7644, lng: 37.6225 },
          vehicle_id: 'test-vehicle',
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(route).toBeDefined()
      expect(route.waypoints).toBeDefined()
    })
  })

  describe('Fleet Service', () => {
    it('should get available vehicles', async () => {
      const vehicles = await new Promise<any>((resolve, reject) => {
        fleetClient.getAvailableVehicles({
          near_point: { lat: 55.7558, lng: 37.6173 },
          radius_km: 50,
          limit: 10,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(vehicles).toBeDefined()
      expect(vehicles.vehicles).toBeDefined()
    })

    it('should assign vehicle to order', async () => {
      const result = await new Promise<any>((resolve, reject) => {
        fleetClient.assignVehicle({
          vehicle_id: 'test-vehicle',
          order_id: `test-order-${uuidv4()}`,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(result).toBeDefined()
    })
  })

  describe('Routing Service', () => {
    it('should calculate route between two points', async () => {
      const route = await new Promise<any>((resolve, reject) => {
        routingClient.calculateRoute({
          origin: { lat: 55.7558, lng: 37.6173 },
          destination: { lat: 59.9343, lng: 30.3351 }, // Москва → СПб
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(route).toBeDefined()
      expect(route.waypoints).toBeDefined()
      expect(route.distance).toBeGreaterThan(0)
    })
  })

  describe('Counterparty Service', () => {
    it('should list counterparties', async () => {
      const counterparties = await new Promise<any>((resolve, reject) => {
        counterpartyClient.listCounterparties({
          page: 1,
          limit: 10,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(counterparties).toBeDefined()
      expect(counterparties.items).toBeDefined()
    })
  })

  describe('Dispatcher Service', () => {
    it('should start dispatch saga', async () => {
      const orderId = `saga-test-${uuidv4()}`

      // Сначала создадим заказ
      await new Promise<any>((resolve, reject) => {
        orderClient.createOrder({
          customer_id: 'saga-tester',
          order_id: orderId,
          origin: { lat: 55.7558, lng: 37.6173 },
          destination: { lat: 55.7644, lng: 37.6225 },
          priority: 0,
          weight_kg: 10,
          volume_m3: 0.5,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      // Запускаем dispatch saga
      const saga = await new Promise<any>((resolve, reject) => {
        dispatcherClient.startDispatch({
          order_id: orderId,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(saga).toBeDefined()
      expect(saga.saga_id).toBeDefined()
    })
  })

  describe('API Gateway integration (full flow)', () => {
    it('should complete order → dispatch → tracking flow', async () => {
      const testOrderId = `flow-test-${uuidv4()}`
      const customerId = `flow-customer-${uuidv4()}`

      // 1. Создаем заказ
      const order = await new Promise<any>((resolve, reject) => {
        orderClient.createOrder({
          customer_id: customerId,
          order_id: testOrderId,
          origin: { lat: 55.7558, lng: 37.6173, address: 'Москва' },
          destination: { lat: 55.7644, lng: 37.6225, address: 'Подольск' },
          priority: 1,
          weight_kg: 50,
          volume_m3: 1,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(order.id).toBeDefined()

      // 2. Получаем маршрут
      const route = await new Promise<any>((resolve, reject) => {
        routingClient.calculateRoute({
          order_id: testOrderId,
          origin: { lat: 55.7558, lng: 37.6173 },
          destination: { lat: 55.7644, lng: 37.6225 },
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(route.waypoints).toBeDefined()

      // 3. Получаем ТС
      const vehicles = await new Promise<any>((resolve, reject) => {
        fleetClient.getAvailableVehicles({
          near_point: { lat: 55.7558, lng: 37.6173 },
          limit: 5,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(vehicles.vehicles).toBeDefined()

      // 4. Запускаем dispatch
      const saga = await new Promise<any>((resolve, reject) => {
        dispatcherClient.startDispatch({
          order_id: testOrderId,
        }, (err: any, res: any) => err ? reject(err) : resolve(res))
      })

      expect(saga.saga_id).toBeDefined()

      //Flow успешен если все сервисы отвечают
    })
  })
})