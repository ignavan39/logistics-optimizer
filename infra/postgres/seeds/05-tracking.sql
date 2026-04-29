-- Seed data for tracking-service (pg-tracking)
-- Run: docker compose exec postgres psql -U logistics -d tracking_db -f /docker-entrypoint-initdb.d/seeds/05-tracking.sql

-- Create a partition for April 2026 if not exists
CREATE TABLE IF NOT EXISTS telemetry_points_2026_04 PARTITION OF telemetry_points
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Insert telemetry points for 3 vehicles (100 points each, last 2 hours)
-- Vehicle 1: e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04 (SPb, in transit)
INSERT INTO telemetry_points (vehicle_id, location, speed, heading, accuracy, recorded_at, ingested_at, metadata)
SELECT 
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04'::UUID,
    ST_SetSRID(ST_MakePoint(30.3351 + (n * 0.001), 59.9343 + (n * 0.0005)), 4326)::GEOMETRY(Point, 4326),
    45.5 + (n % 10),
    180.0 + (n * 0.5),
    3.5,
    NOW() - (100 - n) * INTERVAL '1 minute',
    NOW() - (100 - n) * INTERVAL '59 seconds',
    '{"source": "GPS", "satellites": 12}'::JSONB
FROM generate_series(1, 100) AS n;

-- Vehicle 2: e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01 (Moscow, idle)
INSERT INTO telemetry_points (vehicle_id, location, speed, heading, accuracy, recorded_at, ingested_at, metadata)
SELECT 
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01'::UUID,
    ST_SetSRID(ST_MakePoint(37.6173 + (n * 0.0001), 55.7558 + (n * 0.0001)), 4326)::GEOMETRY(Point, 4326),
    0.0,
    0.0,
    2.0,
    NOW() - (100 - n) * INTERVAL '1 minute',
    NOW() - (100 - n) * INTERVAL '59 seconds',
    '{"source": "GPS", "satellites": 10}'::JSONB
FROM generate_series(1, 100) AS n;

-- Vehicle 3: e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e06 (Kazan, idle)
INSERT INTO telemetry_points (vehicle_id, location, speed, heading, accuracy, recorded_at, ingested_at, metadata)
SELECT 
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e06'::UUID,
    ST_SetSRID(ST_MakePoint(49.0661 + (n * 0.0002), 55.8304 + (n * 0.0002)), 4326)::GEOMETRY(Point, 4326),
    0.0,
    0.0,
    2.5,
    NOW() - (100 - n) * INTERVAL '1 minute',
    NOW() - (100 - n) * INTERVAL '59 seconds',
    '{"source": "GPS", "satellites": 8}'::JSONB
FROM generate_series(1, 100) AS n;

-- Verify
SELECT 'Telemetry summary:' AS info;
SELECT vehicle_id, COUNT(*) as points, MIN(recorded_at) as first, MAX(recorded_at) as last 
FROM telemetry_points 
GROUP BY vehicle_id 
ORDER BY vehicle_id;
