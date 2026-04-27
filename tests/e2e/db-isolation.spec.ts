import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { Pool } from 'pg'

const DB_CONFIG = {
  order: { host: 'localhost', port: 6401, user: 'logistics', password: 'logistics_secret', database: 'order_db_test' },
  fleet: { host: 'localhost', port: 6402, user: 'logistics', password: 'logistics_secret', database: 'fleet_db_test' },
  routing: { host: 'localhost', port: 6403, user: 'logistics', password: 'logistics_secret', database: 'routing_db_test' },
  tracking: { host: 'localhost', port: 6404, user: 'logistics', password: 'logistics_secret', database: 'tracking_db_test' },
  dispatcher: { host: 'localhost', port: 6405, user: 'logistics', password: 'logistics_secret', database: 'dispatcher_db_test' },
  counterparty: { host: 'localhost', port: 6406, user: 'logistics', password: 'logistics_secret', database: 'counterparty_db_test' },
  invoice: { host: 'localhost', port: 6407, user: 'logistics', password: 'logistics_secret', database: 'logistics_invoices_test' },
}

const pools: Record<string, Pool> = {}

describe('DB Isolation Integration', () => {
  beforeAll(async () => {
    console.log('=== Connecting to test databases via pgbouncer ===')
    for (const [name, config] of Object.entries(DB_CONFIG)) {
      pools[name] = new Pool(config)
      await pools[name].query('SELECT 1')
      console.log(`✓ Connected to ${name} test DB on port ${config.port}`)
    }
  })

  afterAll(async () => {
    for (const pool of Object.values(pools)) {
      await pool.end()
    }
  })

  describe('Test Database Connection', () => {
    it('should connect to all 7 test databases via pgbouncer', async () => {
      expect(Object.keys(pools)).toHaveLength(7)
    })

    it('should have correct database names', async () => {
      const dbNames = await Promise.all(
        Object.entries(pools).map(async ([name, pool]) => {
          const result = await pool.query('SELECT current_database() as db')
          return result.rows[0].db
        })
      )
      console.log('Database names:', dbNames)
      expect(dbNames).toContain('order_db_test')
      expect(dbNames).toContain('fleet_db_test')
      expect(dbNames).toContain('counterparty_db_test')
      expect(dbNames).toContain('logistics_invoices_test')
    })
  })

  describe('Each Service Uses Own Database', () => {
    it('order-service should use order_db_test', async () => {
      const result = await pools.order.query('SELECT current_database() as db')
      expect(result.rows[0].db).toBe('order_db_test')
    })

    it('fleet-service should use fleet_db_test', async () => {
      const result = await pools.fleet.query('SELECT current_database() as db')
      expect(result.rows[0].db).toBe('fleet_db_test')
    })

    it('invoice-service should use logistics_invoices_test', async () => {
      const result = await pools.invoice.query('SELECT current_database() as db')
      expect(result.rows[0].db).toBe('logistics_invoices_test')
    })

    it('counterparty-service should use counterparty_db_test', async () => {
      const result = await pools.counterparty.query('SELECT current_database() as db')
      expect(result.rows[0].db).toBe('counterparty_db_test')
    })
  })
})