-- Invoice table for pg-invoice database
CREATE TABLE IF NOT EXISTS invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    number VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'invoice',
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
CREATE INDEX IF NOT EXISTS idx_invoice_counterparty ON invoice(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_invoice_due_date ON invoice(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice(status);

-- Processed events table for idempotency (Kafka consumer protection)
CREATE TABLE IF NOT EXISTS processed_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_events_event_id ON processed_events(event_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_type ON processed_events(event_type);
CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at ON processed_events(processed_at);