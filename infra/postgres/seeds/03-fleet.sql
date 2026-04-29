-- Seed data for fleet-service (pg-fleet)
-- Run: docker compose exec -T logistics-pg-fleet psql -U logistics -d fleet_db -f /docker-entrypoint-initdb.d/seeds/03-fleet.sql

-- Insert test vehicles (PostGIS geography points: Moscow, SPb, Kazan)
-- Using ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
INSERT INTO vehicles (id, type, capacity_kg, capacity_m3, status, current_location, last_update, version, created_at, updated_at) VALUES
    -- Moscow vehicles (available)
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'truck', 15000, 30.00, 'VEHICLE_STATUS_IDLE', ST_SetSRID(ST_MakePoint(37.6173, 55.7558), 4326)::geography, NOW(), 0, NOW(), NOW()),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'van', 5000, 15.00, 'VEHICLE_STATUS_IDLE', ST_SetSRID(ST_MakePoint(37.6250, 55.7600), 4326)::geography, NOW(), 0, NOW(), NOW()),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'truck', 20000, 40.00, 'VEHICLE_STATUS_IDLE', ST_SetSRID(ST_MakePoint(37.5900, 55.7500), 4326)::geography, NOW(), 0, NOW(), NOW()),
    -- SPb vehicles (one in transit)
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', 'truck', 18000, 35.00, 'VEHICLE_STATUS_IN_TRANSIT', ST_SetSRID(ST_MakePoint(30.3351, 59.9343), 4326)::geography, NOW(), 0, NOW(), NOW()),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e05', 'van', 4000, 12.00, 'VEHICLE_STATUS_IDLE', ST_SetSRID(ST_MakePoint(30.3600, 59.9500), 4326)::geography, NOW(), 0, NOW(), NOW()),
    -- Kazan vehicles
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e06', 'truck', 12000, 25.00, 'VEHICLE_STATUS_IDLE', ST_SetSRID(ST_MakePoint(49.0661, 55.8304), 4326)::geography, NOW(), 0, NOW(), NOW()),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e07', 'van', 3500, 10.00, 'VEHICLE_STATUS_MAINTENANCE', ST_SetSRID(ST_MakePoint(49.1000, 55.8200), 4326)::geography, NOW(), 0, NOW(), NOW()),
    -- Additional available vehicles
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e08', 'truck', 25000, 50.00, 'VEHICLE_STATUS_IDLE', ST_SetSRID(ST_MakePoint(37.7000, 55.8000), 4326)::geography, NOW(), 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT 'Vehicles:' AS info;
SELECT id, type, status, ST_AsText(current_location::geometry) as location FROM vehicles ORDER BY status, type;
