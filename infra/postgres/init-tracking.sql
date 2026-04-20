CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

CREATE TABLE IF NOT EXISTS telemetry_points (
id BIGSERIAL,
vehicle_id UUID NOT NULL,
location GEOMETRY(Point, 4326) NOT NULL,
speed NUMERIC(6,2),
heading NUMERIC(6,2),
accuracy NUMERIC(6,2),
recorded_at TIMESTAMPTZ NOT NULL,
ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
metadata JSONB
) PARTITION BY RANGE (recorded_at);

CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_time ON telemetry_points (vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_location ON telemetry_points USING GIST (location);
