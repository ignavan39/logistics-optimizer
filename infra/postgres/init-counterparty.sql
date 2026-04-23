-- Counterparty Service Database Initialization

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Counterparty table
CREATE TABLE IF NOT EXISTS counterparty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'carrier',
    inn VARCHAR(20) UNIQUE NOT NULL,
    kpp VARCHAR(9),
    ogrn VARCHAR(15),
    address JSONB,
    contacts JSONB,
    phone VARCHAR(50),
    email VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_counterparty_type ON counterparty(type);
CREATE INDEX idx_counterparty_name ON counterparty(name);

-- Contract table
CREATE TABLE IF NOT EXISTS contract (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    counterparty_id UUID NOT NULL REFERENCES counterparty(id),
    number VARCHAR(50) UNIQUE NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    total_limit_rub DECIMAL(14,2),
    payment_terms_days INTEGER NOT NULL DEFAULT 30,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_counterparty ON contract(counterparty_id);
CREATE INDEX idx_contract_status ON contract(status);

-- Contract Tariff table
CREATE TABLE IF NOT EXISTS contract_tariff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contract(id),
    zone VARCHAR(50) NOT NULL,
    price_per_km DECIMAL(10,2) NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    min_price DECIMAL(10,2),
    min_weight_kg DECIMAL(8,2),
    loading_rate DECIMAL(10,2),
    unloading_rate DECIMAL(10,2),
    waiting_rate DECIMAL(10,2),
    additional_insurance DECIMAL(5,2),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, zone)
);

CREATE INDEX idx_contract_tariff_contract ON contract_tariff(contract_id);