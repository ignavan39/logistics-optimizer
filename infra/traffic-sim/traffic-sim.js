#!/usr/bin/env node
/**
 * Traffic Incident Simulator
 * ─────────────────────────────────────────────────────────────
 * Периодически генерирует дорожные инциденты (пробки, аварии, перекрытия).
 * routing-service слушает топик traffic.incident и пересчитывает маршруты.
 *
 * Запуск: node traffic-sim.js
 */

const { Kafka } = require('kafkajs');
const { randomUUID } = require('crypto');

const BROKER = process.env.KAFKA_BROKER ?? 'localhost:9094';
const TOPIC  = 'traffic.incident';

const BOUNDS = {
  minLat: 55.60, maxLat: 55.85,
  minLng: 37.40, maxLng: 37.85,
};

const INCIDENT_TYPES = [
  { type: 'traffic_jam',    weight_factor: 3.0, duration_min: 15, probability: 0.50 },
  { type: 'road_works',     weight_factor: 2.5, duration_min: 60, probability: 0.20 },
  { type: 'accident',       weight_factor: 5.0, duration_min: 30, probability: 0.15 },
  { type: 'road_closed',    weight_factor: 999, duration_min: 120, probability: 0.05 },
  { type: 'incident_clear', weight_factor: 1.0, duration_min: 0,  probability: 0.10 },
];

function randomCoord() {
  return {
    lat: BOUNDS.minLat + Math.random() * (BOUNDS.maxLat - BOUNDS.minLat),
    lng: BOUNDS.minLng + Math.random() * (BOUNDS.maxLng - BOUNDS.minLng),
  };
}

function pickIncidentType() {
  const rand = Math.random();
  let cumulative = 0;
  for (const t of INCIDENT_TYPES) {
    cumulative += t.probability;
    if (rand <= cumulative) return t;
  }
  return INCIDENT_TYPES[0];
}

async function main() {
  const kafka = new Kafka({ clientId: 'traffic-simulator', brokers: [BROKER] });
  const producer = kafka.producer();
  await producer.connect();
  console.log(`✅ Traffic simulator connected to Kafka: ${BROKER}`);

  async function emitIncident() {
    const incident = pickIncidentType();
    const coord = randomCoord();
    const radiusKm = 0.2 + Math.random() * 1.5;

    const event = {
      event_id: randomUUID(),
      type: incident.type,
      lat: parseFloat(coord.lat.toFixed(6)),
      lng: parseFloat(coord.lng.toFixed(6)),
      radius_km: parseFloat(radiusKm.toFixed(2)),
      weight_factor: incident.weight_factor,
      duration_minutes: incident.duration_min,
      occurred_at_unix: Math.floor(Date.now() / 1000),
      expires_at_unix: Math.floor(Date.now() / 1000) + incident.duration_min * 60,
    };

    await producer.send({
      topic: TOPIC,
      messages: [{ key: event.event_id, value: JSON.stringify(event) }],
    });

    console.log(
      `🚧 Incident: ${incident.type.padEnd(15)} at (${event.lat}, ${event.lng}) radius=${radiusKm.toFixed(1)}km factor=${incident.weight_factor}x duration=${incident.duration_min}min`
    );
  }

  // Emit incidents with random intervals between 3-15 seconds
  async function scheduleNext() {
    const delay = 3000 + Math.random() * 12000;
    setTimeout(async () => {
      await emitIncident().catch(console.error);
      scheduleNext();
    }, delay);
  }

  scheduleNext();
  console.log('🚦 Traffic simulator running (Ctrl+C to stop)');

  process.on('SIGINT', async () => {
    await producer.disconnect();
    process.exit(0);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
