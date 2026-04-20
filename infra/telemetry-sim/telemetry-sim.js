#!/usr/bin/env node
/**
 * GPS Telemetry Simulator
 * ─────────────────────────────────────────────────────────────
 * Эмулирует N машин, движущихся по сетке города.
 * Публикует в Kafka топик vehicle.telemetry с частотой 1-5 Гц.
 *
 * Запуск:
 *   node telemetry-sim.js
 *
 * Переменные окружения:
 *   KAFKA_BROKER      — адрес брокера (default: localhost:9094)
 *   SIM_VEHICLE_COUNT — кол-во машин (default: 300)
 *   SIM_TELEMETRY_HZ  — частота публикации в Гц (default: 2)
 *   SIM_GRID_SIZE     — размер сетки дорог (default: 50)
 *
 * При SIM_VEHICLE_COUNT=300, SIM_TELEMETRY_HZ=2 генерирует ~600 msg/sec.
 * При SIM_VEHICLE_COUNT=3000, SIM_TELEMETRY_HZ=3 → ~9000 msg/sec.
 */

const { Kafka, CompressionTypes } = require('kafkajs');

// ── Config ─────────────────────────────────────────────────────
const BROKER        = process.env.KAFKA_BROKER ?? 'localhost:9094';
const VEHICLE_COUNT = parseInt(process.env.SIM_VEHICLE_COUNT ?? '300', 10);
const HZ            = parseFloat(process.env.SIM_TELEMETRY_HZ ?? '2');
const GRID_SIZE     = parseInt(process.env.SIM_GRID_SIZE ?? '50', 10);
const TOPIC         = 'vehicle.telemetry';
const INTERVAL_MS   = Math.round(1000 / HZ);
const BATCH_SIZE    = Math.min(VEHICLE_COUNT, 200); // Kafka batch size

// ── City grid bounds (Moscow-like coordinates as default) ──────
const BOUNDS = {
  minLat: 55.60, maxLat: 55.85,
  minLng: 37.40, maxLng: 37.85,
};

// ── Vehicle state ──────────────────────────────────────────────
const { randomUUID } = require('crypto');

class Vehicle {
  constructor(id) {
    this.id = id;
    this.lat = BOUNDS.minLat + Math.random() * (BOUNDS.maxLat - BOUNDS.minLat);
    this.lng = BOUNDS.minLng + Math.random() * (BOUNDS.maxLng - BOUNDS.minLng);
    this.headingDeg = Math.random() * 360;
    this.speedKmh = 20 + Math.random() * 60; // 20-80 km/h
    this.orderId = Math.random() > 0.3 ? randomUUID() : null;
    this.changeDirectionAt = Date.now() + this.randomInterval();
  }

  randomInterval() {
    return 5000 + Math.random() * 15000; // change direction every 5-20s
  }

  move() {
    const now = Date.now();

    // Occasionally change direction and speed
    if (now >= this.changeDirectionAt) {
      this.headingDeg = (this.headingDeg + (Math.random() - 0.5) * 90 + 360) % 360;
      this.speedKmh = Math.max(5, Math.min(90, this.speedKmh + (Math.random() - 0.5) * 20));
      this.changeDirectionAt = now + this.randomInterval();
    }

    // Simulate occasional traffic jams
    const trafficFactor = Math.random() > 0.95 ? 0.1 : 1.0;
    const effectiveSpeed = this.speedKmh * trafficFactor;

    // Convert speed to lat/lng delta per tick
    const distanceKm = (effectiveSpeed / 3600) * (INTERVAL_MS / 1000);
    const deltaLat = distanceKm / 111.0 * Math.cos(this.headingDeg * Math.PI / 180);
    const deltaLng = distanceKm / (111.0 * Math.cos(this.lat * Math.PI / 180)) * Math.sin(this.headingDeg * Math.PI / 180);

    this.lat = Math.max(BOUNDS.minLat, Math.min(BOUNDS.maxLat, this.lat + deltaLat));
    this.lng = Math.max(BOUNDS.minLng, Math.min(BOUNDS.maxLng, this.lng + deltaLng));

    // Bounce off boundaries
    if (this.lat <= BOUNDS.minLat || this.lat >= BOUNDS.maxLat) {
      this.headingDeg = (180 - this.headingDeg + 360) % 360;
    }
    if (this.lng <= BOUNDS.minLng || this.lng >= BOUNDS.maxLng) {
      this.headingDeg = (360 - this.headingDeg + 360) % 360;
    }
  }

  toMessage() {
    return {
      vehicle_id: this.id,
      lat: parseFloat(this.lat.toFixed(7)),
      lng: parseFloat(this.lng.toFixed(7)),
      speed_kmh: parseFloat(this.speedKmh.toFixed(2)),
      heading_deg: parseFloat(this.headingDeg.toFixed(2)),
      accuracy_m: parseFloat((3 + Math.random() * 7).toFixed(1)),
      recorded_at_unix: Math.floor(Date.now() / 1000),
      metadata: this.orderId ? { order_id: this.orderId } : {},
    };
  }
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  const kafka = new Kafka({
    clientId: 'telemetry-simulator',
    brokers: [BROKER],
    retry: { retries: 10, initialRetryTime: 1000 },
  });

  const producer = kafka.producer({
    compression: CompressionTypes.GZIP,
    idempotent: false, // simulator doesn't need exactly-once
    maxInFlightRequests: 10,
    allowAutoTopicCreation: false,
  });

  await producer.connect();
  console.log(`✅ Connected to Kafka: ${BROKER}`);

  // Initialize vehicles
  const vehicleIds = Array.from({ length: VEHICLE_COUNT }, () => randomUUID());
  const vehicles = vehicleIds.map(id => new Vehicle(id));
  console.log(`🚗 Simulating ${VEHICLE_COUNT} vehicles at ${HZ} Hz → ~${Math.round(VEHICLE_COUNT * HZ)} msg/sec`);

  // Stats
  let totalSent = 0;
  let batchCount = 0;
  const startTime = Date.now();

  setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = Math.round(totalSent / elapsed);
    console.log(
      `📊 Stats: ${totalSent.toLocaleString()} msgs sent | ${rate} msg/sec | ${batchCount} batches | ${vehicles.length} vehicles`
    );
  }, 5000);

  // Produce loop
  setInterval(async () => {
    vehicles.forEach(v => v.move());

    // Send in batches for efficiency
    const messages = vehicles.map(v => ({
      key: v.id,
      value: JSON.stringify(v.toMessage()),
      timestamp: String(Date.now()),
    }));

    try {
      // Split into chunks to avoid overwhelming producer
      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const chunk = messages.slice(i, i + BATCH_SIZE);
        await producer.send({
          topic: TOPIC,
          messages: chunk,
          compression: CompressionTypes.GZIP,
          acks: 1, // Leader ack only for performance
        });
        totalSent += chunk.length;
        batchCount++;
      }
    } catch (err) {
      console.error('Producer error:', err.message);
    }
  }, INTERVAL_MS);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down simulator...');
    await producer.disconnect();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
