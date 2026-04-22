-- Auth Service Database Schema
-- Version: 1.0.0

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(64),
    verification_expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255),
    device_name VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE expires_at > NOW();
CREATE INDEX idx_sessions_refresh_hash ON sessions(refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    rate_limit INT DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix) WHERE deleted_at IS NULL AND is_active = true;

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    family VARCHAR(36) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by UUID REFERENCES refresh_tokens(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family);

CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    success BOOLEAN DEFAULT false,
    reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email, created_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, created_at);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);

INSERT INTO roles (id, name, description, is_system) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', 'Full system access', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'dispatcher', 'Order and fleet management', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'driver', 'Driver access to orders and routes', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'viewer', 'Read-only access', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'api_client', 'External API access', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, resource, action, description) VALUES
    ('orders.create', 'orders', 'create', 'Create new orders'),
    ('orders.read', 'orders', 'read', 'Read orders'),
    ('orders.update', 'orders', 'update', 'Update orders'),
    ('orders.cancel', 'orders', 'cancel', 'Cancel orders'),
    ('orders.assign', 'orders', 'assign', 'Assign orders to drivers'),
    ('vehicles.read', 'vehicles', 'read', 'Read vehicle data'),
    ('vehicles.assign', 'vehicles', 'assign', 'Assign vehicle to order'),
    ('vehicles.release', 'vehicles', 'release', 'Release vehicle from order'),
    ('fleet.vehicles.read', 'fleet:vehicles', 'read', 'Read vehicle data'),
    ('fleet.vehicles.update', 'fleet:vehicles', 'update', 'Update vehicle data'),
    ('fleet.drivers.read', 'fleet:drivers', 'read', 'Read driver data'),
    ('fleet.drivers.update', 'fleet:drivers', 'update', 'Update driver data'),
    ('tracking.read', 'tracking', 'read', 'Read tracking data'),
    ('tracking.write', 'tracking', 'write', 'Write tracking data'),
    ('routes.calculate', 'routes', 'calculate', 'Calculate routes'),
    ('routes.read', 'routes', 'read', 'Read routes'),
    ('routing.calculate', 'routing', 'calculate', 'Calculate routes (legacy)'),
    ('dispatch.execute', 'dispatch', 'execute', 'Execute dispatch'),
    ('dispatch.read', 'dispatch', 'read', 'Read dispatch state'),
    ('dispatch.cancel', 'dispatch', 'cancel', 'Cancel dispatch'),
    ('users.manage', 'users', 'manage', 'Manage users and roles'),
    ('users.read', 'users', 'read', 'Read user data'),
    ('api_keys.manage', 'api_keys', 'manage', 'Manage API keys'),
    ('reports.read', 'reports', 'read', 'Read reports'),
    ('reports.export', 'reports', 'export', 'Export reports')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'dispatcher'
AND p.name IN (
    'orders.create', 'orders.read', 'orders.update', 'orders.cancel', 'orders.assign',
    'vehicles.read', 'vehicles.assign', 'vehicles.release',
    'tracking.read',
    'routes.calculate', 'routes.read',
    'dispatch.execute', 'dispatch.read', 'dispatch.cancel',
    'reports.read', 'reports.export'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'driver'
AND p.name IN (
    'orders.read', 'orders.update',
    'vehicles.read',
    'tracking.write',
    'routes.calculate'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer'
AND p.name IN (
    'orders.read',
    'vehicles.read',
    'tracking.read',
    'routes.read',
    'reports.read'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'api_client'
AND p.name IN (
    'orders.create', 'orders.read',
    'vehicles.read',
    'tracking.read',
    'routes.read'
)
ON CONFLICT DO NOTHING;
)
ON CONFLICT DO NOTHING;

INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, is_verified)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'admin@logistics.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System', 'Administrator', true, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'admin@logistics.local' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_uuid AND p.name = permission_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS SETOF TEXT AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.name::TEXT
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

VACUUM ANALYZE users;
VACUUM ANALYZE sessions;
VACUUM ANALYZE api_keys;