CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS outbox_events (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
aggregate_type VARCHAR(100) NOT NULL,
aggregate_id UUID NOT NULL,
event_type VARCHAR(100) NOT NULL,
payload JSONB NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
processed_at TIMESTAMPTZ,
retry_count INT NOT NULL DEFAULT 0,
last_error TEXT
);
CREATE INDEX idx_outbox_unprocessed ON outbox_events (created_at) WHERE processed_at IS NULL;

CREATE TABLE IF NOT EXISTS order_status_history (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
order_id UUID NOT NULL,
previous_status VARCHAR(50),
new_status VARCHAR(50) NOT NULL,
changed_by UUID,
reason TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created ON order_status_history(created_at);
