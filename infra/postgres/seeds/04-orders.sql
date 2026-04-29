-- Seed data for order-service (pg-order)
-- Run: docker compose exec postgres psql -U logistics -d order_db -f /docker-entrypoint-initdb.d/seeds/04-orders.sql

-- Insert test orders with different statuses
INSERT INTO orders (id, customer_id, status, origin_address, destination_address, 
                   origin_lat, origin_lng, destination_lat, destination_lng,
                   priority, estimated_price, currency, counterparty_id, contract_id,
                   tariff_snapshot_id, created_at, updated_at, version) VALUES
    -- PENDING orders
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'PENDING', 
     'Москва, ул. Тверская, 1', 'Санкт-Петербург, Невский пр., 10',
     55.7558, 37.6173, 59.9343, 30.3351, 'normal', 15000.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', NOW() - INTERVAL '2 days', NOW(), 0),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'PENDING',
     'Москва, ул. Садовая, 5', 'Казань, ул. Баумана, 15',
     55.7600, 37.6200, 55.8304, 49.0661, 'high', 8500.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', NOW() - INTERVAL '1 day', NOW(), 0),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'PENDING',
     'Санкт-Петербург, ул. Ленина, 20', 'Москва, ул. Новый Арбат, 10',
     59.9343, 30.3351, 55.7558, 37.6173, 'normal', 14500.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f03', NOW() - INTERVAL '12 hours', NOW(), 0),
    -- ASSIGNED orders
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'ASSIGNED',
     'Москва, ул. Профсоюзная, 30', 'Санкт-Петербург, ул. Рубинштейна, 5',
     55.7000, 37.5800, 59.9300, 30.3400, 'urgent', 16000.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f04', NOW() - INTERVAL '3 days', NOW(), 0),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'ASSIGNED',
     'Казань, ул. Петербургская, 10', 'Москва, ул. Тверская, 15',
     55.8304, 49.0661, 55.7558, 37.6173, 'normal', 11000.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f05', NOW() - INTERVAL '2 days', NOW(), 0),
    -- IN_TRANSIT orders
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'IN_TRANSIT',
     'Москва, ул. Ленинградская, 1', 'Санкт-Петербург, ул. Московский пр., 100',
     55.8000, 37.5500, 59.9100, 30.3200, 'normal', 14000.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f06', NOW() - INTERVAL '4 days', NOW(), 0),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'IN_TRANSIT',
     'Санкт-Петербург, ул. Лиговский пр., 50', 'Москва, ул. Садовая, 20',
     59.9300, 30.3600, 55.7600, 37.6200, 'high', 15500.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f07', NOW() - INTERVAL '3 days', NOW(), 0),
    -- DELIVERED orders
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'DELIVERED',
     'Москва, ул. Марксистская, 10', 'Казань, ул. Ленина, 5',
     55.7400, 37.6800, 55.8304, 49.0661, 'normal', 9000.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f08', NOW() - INTERVAL '7 days', NOW(), 0),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'DELIVERED',
     'Казань, ул. Чернышевского, 20', 'Санкт-Петербург, ул. Невский пр., 50',
     55.8200, 49.1000, 59.9343, 30.3351, 'high', 13500.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f09', NOW() - INTERVAL '5 days', NOW(), 0),
    -- COMPLETED orders
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'COMPLETED',
     'Москва, ул. Таганская, 25', 'Санкт-Петербург, ул. Гороховая, 15',
     55.7300, 37.6600, 59.9300, 30.3400, 'normal', 14800.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f10', NOW() - INTERVAL '10 days', NOW(), 0),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'COMPLETED',
     'Санкт-Петербург, ул. Каменноостровский пр., 30', 'Москва, ул. Тверская, 20',
     59.9500, 30.3000, 55.7558, 37.6173, 'high', 15000.00, 'RUB',
     'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03',
     'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f11', NOW() - INTERVAL '8 days', NOW(), 0)
ON CONFLICT (id) DO NOTHING;

-- Insert cargo for each order
INSERT INTO cargo (id, order_id, name, quantity, weight_kg, volume_m3, packaging, value_rub, status, version, created_at, updated_at) VALUES
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g10', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'Электроника', 10, 500.00, 2.50, 'коробки', 100000.00, 'pending', 0, NOW() - INTERVAL '2 days', NOW()),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Мебель', 5, 1200.00, 8.00, 'паллеты', 250000.00, 'pending', 0, NOW() - INTERVAL '1 day', NOW()),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Одежда', 20, 300.00, 1.50, 'коробки', 50000.00, 'pending', 0, NOW() - INTERVAL '12 hours', NOW()),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Техника', 3, 800.00, 4.00, 'коробки', 150000.00, 'assigned', 0, NOW() - INTERVAL '3 days', NOW()),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Продукты', 50, 1500.00, 10.00, 'коробки', 80000.00, 'assigned', 0, NOW() - INTERVAL '2 days', NOW()),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Строительные материалы', 8, 2000.00, 12.00, 'паллеты', 300000.00, 'in_transit', 0, NOW() - INTERVAL '4 days', NOW()),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Химия', 15, 900.00, 5.00, 'бочки', 120000.00, 'in_transit', 0, NOW() - INTERVAL '3 days', NOW()),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g17', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'Книги', 30, 400.00, 1.20, 'коробки', 40000.00, 'delivered', 0, NOW() - INTERVAL '7 days', NOW()),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g18', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'Оборудование', 2, 1800.00, 6.00, 'коробки', 200000.00, 'delivered', 0, NOW() - INTERVAL '5 days', NOW()),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g19', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'Мебель', 6, 1000.00, 7.00, 'паллеты', 180000.00, 'completed', 0, NOW() - INTERVAL '10 days', NOW()),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g20', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'Электроника', 12, 600.00, 3.00, 'коробки', 110000.00, 'completed', 0, NOW() - INTERVAL '8 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert tariff snapshots
INSERT INTO order_tariff_snapshots (id, order_id, price_per_km, price_per_kg, min_price, zone, calculated_at) VALUES
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 20.00, 10.00, 1000.00, 'moscow', NOW() - INTERVAL '2 days'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 20.00, 10.00, 1000.00, 'moscow', NOW() - INTERVAL '1 day'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 25.00, 12.00, 1300.00, 'spb', NOW() - INTERVAL '12 hours'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 25.00, 15.00, 1500.00, 'moscow', NOW() - INTERVAL '3 days'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 22.00, 12.00, 1200.00, 'kazan', NOW() - INTERVAL '2 days'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 25.00, 15.00, 1500.00, 'moscow', NOW() - INTERVAL '4 days'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f07', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 28.00, 16.00, 1800.00, 'spb', NOW() - INTERVAL '3 days'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f08', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 27.00, 14.00, 1400.00, 'moscow', NOW() - INTERVAL '7 days'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f09', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 24.00, 13.00, 1100.00, 'kazan', NOW() - INTERVAL '5 days'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f10', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 20.00, 10.00, 1000.00, 'moscow', NOW() - INTERVAL '10 days'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 25.00, 15.00, 1500.00, 'spb', NOW() - INTERVAL '8 days')
ON CONFLICT (order_id) DO NOTHING;

-- Insert order status history
INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by, reason, created_at) VALUES
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h10', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Order created', NOW() - INTERVAL '2 days'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'Order created', NOW() - INTERVAL '1 day'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Order created', NOW() - INTERVAL '12 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'Order created', NOW() - INTERVAL '3 days'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'PENDING', 'ASSIGNED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle assigned', NOW() - INTERVAL '2 days 23 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Order created', NOW() - INTERVAL '2 days'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'PENDING', 'ASSIGNED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle assigned', NOW() - INTERVAL '1 day 23 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h17', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'Order created', NOW() - INTERVAL '4 days'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h18', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'PENDING', 'ASSIGNED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle assigned', NOW() - INTERVAL '3 days 23 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h19', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'ASSIGNED', 'IN_TRANSIT', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle departed', NOW() - INTERVAL '3 days 22 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h20', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Order created', NOW() - INTERVAL '3 days'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'PENDING', 'ASSIGNED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle assigned', NOW() - INTERVAL '2 days 23 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'ASSIGNED', 'IN_TRANSIT', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle departed', NOW() - INTERVAL '2 days 22 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'Order created', NOW() - INTERVAL '7 days'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h24', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'PENDING', 'ASSIGNED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle assigned', NOW() - INTERVAL '6 days 23 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h25', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'ASSIGNED', 'IN_TRANSIT', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle departed', NOW() - INTERVAL '6 days 22 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h26', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'IN_TRANSIT', 'DELIVERED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Order delivered', NOW() - INTERVAL '6 days 20 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h27', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Order created', NOW() - INTERVAL '5 days'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h28', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'PENDING', 'ASSIGNED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle assigned', NOW() - INTERVAL '4 days 23 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h29', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'ASSIGNED', 'IN_TRANSIT', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle departed', NOW() - INTERVAL '4 days 22 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h30', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'IN_TRANSIT', 'DELIVERED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Order delivered', NOW() - INTERVAL '4 days 20 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'Order created', NOW() - INTERVAL '10 days'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h32', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'PENDING', 'ASSIGNED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle assigned', NOW() - INTERVAL '9 days 23 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'ASSIGNED', 'IN_TRANSIT', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle departed', NOW() - INTERVAL '9 days 22 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h34', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'IN_TRANSIT', 'DELIVERED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Order delivered', NOW() - INTERVAL '9 days 20 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h35', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'DELIVERED', 'COMPLETED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Order completed', NOW() - INTERVAL '9 days 18 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h36', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', NULL, 'PENDING', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Order created', NOW() - INTERVAL '8 days'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h37', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'PENDING', 'ASSIGNED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle assigned', NOW() - INTERVAL '7 days 23 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h38', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'ASSIGNED', 'IN_TRANSIT', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Vehicle departed', NOW() - INTERVAL '7 days 22 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h39', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'IN_TRANSIT', 'DELIVERED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Order delivered', NOW() - INTERVAL '7 days 20 hours'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380h40', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'DELIVERED', 'COMPLETED', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Order completed', NOW() - INTERVAL '7 days 18 hours')
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT 'Orders by status:' AS info;
SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY status;

SELECT 'Cargo summary:' AS info;
SELECT COUNT(*) as total_cargo FROM cargo;
