-- Seed script for creating admin user
-- Run: psql -U logistics -d auth_db -f infra/postgres/seeds/01-admin.sql

-- Create admin user if not exists (bcrypt hash for 'admin123')
INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, is_verified, failed_login_attempts, created_at, updated_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'admin@logistics.local', '$2b$12$5tjfA3sS4MSrivkhYBZ7NOnKhmBrf/VXRd89NDhDuCFvLiu6y4utm', 'Admin', 'User', true, true, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@logistics.local');

-- Update password if user exists
UPDATE users 
SET password_hash = '$2b$12$5tjfA3sS4MSrivkhYBZ7NOnKhmBrf/VXRd89NDhDuCFvLiu6y4utm',
    is_active = true,
    is_verified = true,
    updated_at = NOW()
WHERE email = 'admin@logistics.local';