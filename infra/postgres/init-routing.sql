-- Routing Service Database Initialization

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    origin geography(POINT, 4326) NOT NULL,
    destination geography(POINT, 4326) NOT NULL,
    distance_meters INTEGER,
    duration_seconds INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'ROUTE_STATUS_PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_order ON routes(order_id);
CREATE INDEX idx_routes_vehicle ON routes(vehicle_id);
CREATE INDEX idx_routes_status ON routes(status);

-- Route waypoints (for polyline)
CREATE TABLE IF NOT EXISTS route_waypoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    location geography(POINT, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_route_waypoints_route ON route_waypoints(route_id);

-- Route cache table (Redis + PostgreSQL for routes)
CREATE TABLE IF NOT EXISTS route_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_key VARCHAR(100) NOT NULL UNIQUE,
    origin_lat DECIMAL(10,6) NOT NULL,
    origin_lng DECIMAL(10,6) NOT NULL,
    dest_lat DECIMAL(10,6) NOT NULL,
    dest_lng DECIMAL(10,6) NOT NULL,
    route_data JSONB NOT NULL,
    vehicle_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_route_cache_key ON route_cache(route_key);
CREATE INDEX idx_route_cache_expiry ON route_cache(created_at);
CREATE INDEX idx_route_cache_coords ON route_cache(origin_lat, origin_lng, dest_lat, dest_lng);