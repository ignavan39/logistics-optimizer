-- Fleet Service Database Initialization

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    capacity_kg INTEGER NOT NULL,
    capacity_m3 DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'VEHICLE_STATUS_IDLE',
    version INTEGER NOT NULL DEFAULT 1,
    current_location geography(POINT, 4326),
    current_driver_id UUID,
    current_order_id UUID,
    license_plate VARCHAR(20),
    last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_location ON vehicles USING GIST(current_location);

-- Vehicle assignments (for tracking which vehicle is assigned to which order)
CREATE TABLE IF NOT EXISTS vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    order_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_vehicle_assignments_vehicle ON vehicle_assignments(vehicle_id);
CREATE INDEX idx_vehicle_assignments_order ON vehicle_assignments(order_id);