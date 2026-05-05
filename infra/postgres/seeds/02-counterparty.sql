-- Seed data for counterparty-service (pg-counterparty)
-- Run: docker compose exec postgres psql -U logistics -d counterparty_db -f /docker-entrypoint-initdb.d/seeds/02-counterparty.sql

-- Insert test counterparties (carriers and shippers)
INSERT INTO counterparty (id, name, type, inn, kpp, ogrn, address, phone, email, version, created_at, updated_at) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'ООО "АвтоЛогистик"', 'carrier', '1234567890', '770101001', '1157700000000',
     '{"street": "ул. Транспортная, д. 10", "city": "Москва", "zip": "127000"}'::jsonb,
     '+7 (495) 111-22-33', 'info@autologist.ru', 0, NOW(), NOW()),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'ООО "Грузоперевозки СПб"', 'carrier', '1234567891', '780201001', '1167800000000',
     '{"street": "пр. Невский, д. 50", "city": "Санкт-Петербург", "zip": "191000"}'::jsonb,
     '+7 (812) 222-33-44', 'info@spb-cargo.ru', 0, NOW(), NOW()),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'ИП Иванов И.И.', 'carrier', '1234567892', NULL, '315770000000000',
     '{"street": "ул. Малая, д. 5", "city": "Москва", "zip": "127001"}'::jsonb,
     '+7 (495) 333-44-55', 'ivanov@carrier.ru', 0, NOW(), NOW()),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'ООО "Заказчик-Логист"', 'shipper', '1234567893', '770401001', '1177700000000',
     '{"street": "ул. Заказная, д. 20", "city": "Москва", "zip": "127002"}'::jsonb,
     '+7 (495) 444-55-66', 'order@shipper.ru', 0, NOW(), NOW()),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'АО "Экспедиция"', 'both', '1234567894', '770501001', '1187700000000',
     '{"street": "ул. Экспедиционная, д. 30", "city": "Москва", "zip": "127003"}'::jsonb,
     '+7 (495) 555-66-77', 'expedition@corp.ru', 0, NOW(), NOW())
ON CONFLICT (inn) DO NOTHING;

-- Insert test contracts
INSERT INTO contract (id, counterparty_id, number, valid_from, valid_to, status, total_limit_rub, payment_terms_days, description, version, created_at, updated_at) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'CNT-2026-001',
     '2026-01-01', '2026-12-31', 'active', 5000000.00, 30, 'Договор на перевозку грузов по ЦФО', 0, NOW(), NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'CNT-2026-002',
     '2026-01-01', '2026-12-31', 'active', 3000000.00, 45, 'Перевозка грузов в СЗФО', 0, NOW(), NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'CNT-2026-003',
     '2026-02-01', '2026-12-31', 'active', 10000000.00, 15, 'Основной договор заказчика', 0, NOW(), NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'CNT-2026-004',
     '2026-03-01', '2026-12-31', 'active', 7000000.00, 30, 'Экспедирование сборных грузов', 0, NOW(), NOW())
ON CONFLICT (number) DO NOTHING;

-- Insert contract tariffs (zone-based pricing)
INSERT INTO contract_tariff (id, contract_id, zone, price_per_km, price_per_kg, min_price, min_weight_kg, loading_rate, unloading_rate, waiting_rate, vat_rate, version, created_at, updated_at) VALUES
    -- Contract 1 (Autologist) - Moscow zone
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'moscow', 25.00, 15.00, 1500.00, 100, 500.00, 500.00, 300.00, 20.00, 0, NOW(), NOW()),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'spb', 30.00, 18.00, 2000.00, 100, 600.00, 600.00, 350.00, 20.00, 0, NOW(), NOW()),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'kazan', 22.00, 12.00, 1200.00, 100, 450.00, 450.00, 250.00, 20.00, 0, NOW(), NOW()),
    -- Contract 2 (SPb Cargo)
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'spb', 28.00, 16.00, 1800.00, 100, 550.00, 550.00, 320.00, 20.00, 0, NOW(), NOW()),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'moscow', 32.00, 19.00, 2100.00, 100, 650.00, 650.00, 380.00, 20.00, 0, NOW(), NOW()),
    -- Contract 3 (Shipper)
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'moscow', 20.00, 10.00, 1000.00, 50, 400.00, 400.00, 200.00, 20.00, 0, NOW(), NOW()),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d07', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'spb', 25.00, 12.00, 1300.00, 50, 450.00, 450.00, 250.00, 20.00, 0, NOW(), NOW()),
    -- Contract 4 (Expedition)
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d08', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'moscow', 27.00, 14.00, 1400.00, 80, 480.00, 480.00, 280.00, 20.00, 0, NOW(), NOW()),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d09', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'spb', 31.00, 17.00, 1900.00, 80, 580.00, 580.00, 340.00, 20.00, 0, NOW(), NOW()),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d10', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'kazan', 24.00, 13.00, 1100.00, 80, 420.00, 420.00, 240.00, 20.00, 0, NOW(), NOW()),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'nsk', 35.00, 20.00, 2500.00, 80, 700.00, 700.00, 400.00, 20.00, 0, NOW(), NOW())
ON CONFLICT (contract_id, zone) DO NOTHING;
