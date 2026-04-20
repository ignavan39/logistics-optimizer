/**
 * k6 Load Test — Logistics Route Optimizer
 * ─────────────────────────────────────────────────────────────
 * Сценарий:
 *   Stage 1 (warm-up):   50 RPS × 30s
 *   Stage 2 (ramp-up):   → 300 RPS × 60s
 *   Stage 3 (sustained): 500 RPS × 120s
 *   Stage 4 (spike):     → 800 RPS × 30s
 *   Stage 5 (cool-down): → 0 RPS × 30s
 *
 * Запуск:
 *   k6 run --env BASE_URL=http://localhost:3000 load-test.js
 *
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ── Custom metrics ─────────────────────────────────────────────
const orderCreated      = new Counter('orders_created');
const orderFailed       = new Counter('orders_failed');
const orderLatency      = new Trend('order_create_latency_ms', true);
const etaLatency        = new Trend('eta_request_latency_ms', true);
const errorRate         = new Rate('error_rate');

// ── Config ─────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL ?? 'http://localhost:3000';

// Pregenerate customer IDs to simulate realistic load
const CUSTOMERS = new SharedArray('customers', () =>
  Array.from({ length: 1000 }, (_, i) => `customer-${String(i).padStart(5, '0')}`)
);

// Moscow bounding box for random coordinates
const BOUNDS = { minLat: 55.60, maxLat: 55.85, minLng: 37.40, maxLng: 37.85 };

function randomCoord() {
  return {
    lat: BOUNDS.minLat + Math.random() * (BOUNDS.maxLat - BOUNDS.minLat),
    lng: BOUNDS.minLng + Math.random() * (BOUNDS.maxLng - BOUNDS.minLng),
  };
}

// ── Load profile ───────────────────────────────────────────────
export const options = {
  scenarios: {
    order_creation: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 50  },   // warm-up
        { duration: '60s', target: 300 },   // ramp-up
        { duration: '120s', target: 500 },  // sustained load
        { duration: '30s', target: 800 },   // spike
        { duration: '30s', target: 0   },   // cool-down
      ],
    },
    eta_requests: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      duration: '270s',
    },
  },
  thresholds: {
    'http_req_duration{scenario:order_creation}': ['p(95)<200', 'p(99)<500'],
    'http_req_duration{scenario:eta_requests}':   ['p(95)<150', 'p(99)<300'],
    'http_req_failed':                            ['rate<0.01'],
    'error_rate':                                 ['rate<0.01'],
    'order_create_latency_ms':                    ['p(95)<200'],
    'eta_latency_ms':                             ['p(95)<150'],
  },
};

// ── Scenario: create order ─────────────────────────────────────
export default function orderCreation() {
  const customerId = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  const origin = randomCoord();
  const dest = randomCoord();
  const priorities = ['ORDER_PRIORITY_NORMAL', 'ORDER_PRIORITY_HIGH', 'ORDER_PRIORITY_CRITICAL'];

  const payload = JSON.stringify({
    customer_id: customerId,
    origin: { lat: origin.lat, lng: origin.lng, address: 'Test origin' },
    destination: { lat: dest.lat, lng: dest.lng, address: 'Test destination' },
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    weight_kg: 1 + Math.random() * 100,
    volume_m3: 0.01 + Math.random() * 2,
    notes: 'Load test order',
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/orders`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.JWT_TOKEN ?? 'test-token'}`,
    },
    timeout: '5s',
    tags: { name: 'CreateOrder' },
  });
  orderLatency.add(Date.now() - start);

  const ok = check(res, {
    'order created (201)': (r) => r.status === 201,
    'has order id':        (r) => {
      try { return !!JSON.parse(r.body).id; } catch { return false; }
    },
  });

  if (ok) {
    orderCreated.add(1);
  } else {
    orderFailed.add(1);
    errorRate.add(1);
    if (__ENV.DEBUG) console.error(`Order failed: ${res.status} — ${res.body?.slice(0, 200)}`);
  }

  sleep(0.1);
}

// ── Scenario: ETA requests ─────────────────────────────────────
export function etaRequests() {
  const vehicleId = `vehicle-${Math.floor(Math.random() * 300).toString().padStart(3, '0')}`;
  const pos = randomCoord();

  const start = Date.now();
  const res = http.get(
    `${BASE_URL}/api/v1/tracking/vehicles/${vehicleId}/position`,
    {
      headers: { 'Authorization': `Bearer ${__ENV.JWT_TOKEN ?? 'test-token'}` },
      timeout: '3s',
      tags: { name: 'GetVehiclePosition' },
    }
  );
  etaLatency.add(Date.now() - start);

  check(res, {
    'position ok (200/404)': (r) => [200, 404].includes(r.status),
  });
}
