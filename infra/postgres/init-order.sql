CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT
);

CREATE INDEX idx_outbox_unprocessed ON outbox_events (created_at)
WHERE
    processed_at IS NULL;

CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    order_id UUID NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order ON order_status_history (order_id);

CREATE INDEX idx_order_status_history_created ON order_status_history (created_at);

-- Migration: Add counterparty relations to orders (v2)
-- Run manually after counterparty table is created
ALTER TABLE orders ADD COLUMN IF NOT EXISTS counterparty_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sender_counterparty_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_counterparty_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contract_id UUID;

CREATE INDEX IF NOT EXISTS idx_orders_counterparty ON orders(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_orders_sender_counterparty ON orders(sender_counterparty_id);
CREATE INDEX IF NOT EXISTS idx_orders_receiver_counterparty ON orders(receiver_counterparty_id);
CREATE INDEX IF NOT EXISTS idx_orders_contract ON orders(contract_id);

-- Cargo table (v2)
CREATE TABLE IF NOT EXISTS cargo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    weight_kg DECIMAL(8,2) DEFAULT 0,
    volume_m3 DECIMAL(8,3) DEFAULT 0,
    packaging VARCHAR(100),
    value_rub DECIMAL(12,2),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    units VARCHAR(50),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cargo_order ON cargo(order_id);
CREATE INDEX IF NOT EXISTS idx_cargo_order_status ON cargo(order_id, status);

-- Document table (v2)
CREATE TABLE IF NOT EXISTS document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    content JSONB NOT NULL,
    signed_at TIMESTAMPTZ,
    signed_by VARCHAR(255),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_order ON document(order_id);
CREATE INDEX IF NOT EXISTS idx_document_order_type ON document(order_id, type);

-- Invoice table (v2)
CREATE TABLE IF NOT EXISTS invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    number VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    amount_rub DECIMAL(12,2) NOT NULL,
    vat_rate DECIMAL(4,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(100),
    counterparty_id UUID,
    contract_id UUID,
    description TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_order ON invoice(order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_order_status ON invoice(order_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_due_date ON invoice(due_date);

-- Add estimated_price and currency to orders (v3)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_price DECIMAL(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'RUB';

-- Tariff snapshot (v4 - separate table instead of JSONB)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tariff_snapshot_id UUID REFERENCES order_tariff_snapshots(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS order_tariff_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    price_per_km DECIMAL(10,2) NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    min_price DECIMAL(10,2),
    zone VARCHAR(50) NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_tariffs_order ON order_tariff_snapshots(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tariffs_calc ON order_tariff_snapshots(calculated_at);

-- Settings table (v5)
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default company settings
INSERT INTO settings (key, value) VALUES
    ('company_name', 'ООО "Логистическая Компания"'),
    ('company_inn', '7712345678'),
    ('company_kpp', '771201001'),
    ('company_address', 'г. Москва, ул. Примерная, д. 1'),
    ('company_phone', '+7 (495) 123-45-67'),
    ('company_email', 'info@example.ru'),
    ('default_payment_terms_days', '30'),
    ('default_vat_rate', '20')
ON CONFLICT (key) DO NOTHING;