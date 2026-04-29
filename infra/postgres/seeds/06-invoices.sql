-- Seed data for invoice-service (pg-invoices)
-- Run: docker compose exec postgres psql -U logistics -d logistics_invoices -f /docker-entrypoint-initdb.d/seeds/06-invoices.sql

-- Insert test invoices (linked to delivered/completed orders)
INSERT INTO invoice (id, order_id, number, type, amount_rub, vat_rate, vat_amount, status, due_date, paid_at, payment_method, counterparty_id, contract_id, description, version, created_at, updated_at) VALUES
    -- Draft invoices
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'INV-2026-001', 'invoice', 12000.00, 20.00, 2000.00, 'draft', '2026-05-15', NULL, NULL, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'Первая доставка', 0, NOW() - INTERVAL '7 days', NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'INV-2026-002', 'invoice', 15500.00, 20.00, 2583.33, 'draft', '2026-05-10', NULL, NULL, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'Вторая доставка', 0, NOW() - INTERVAL '5 days', NOW()),
    -- Sent invoices
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'INV-2026-003', 'invoice', 17500.00, 20.00, 2916.67, 'sent', '2026-05-20', NULL, 'bank_transfer', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'Третья доставка', 0, NOW() - INTERVAL '10 days', NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'INV-2026-004', 'invoice', 18000.00, 20.00, 3000.00, 'sent', '2026-05-18', NULL, 'card', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'Четвертая доставка', 0, NOW() - INTERVAL '8 days', NOW()),
    -- Paid invoices
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'INV-2026-005', 'invoice', 16800.00, 20.00, 2800.00, 'paid', '2026-05-01', NOW() - INTERVAL '3 days', 'bank_transfer', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'Текущая доставка', 0, NOW() - INTERVAL '4 days', NOW()),
    -- Cancelled invoice
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'INV-2026-006', 'invoice', 19000.00, 20.00, 3166.67, 'cancelled', '2026-05-05', NULL, NULL, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'Отмененная доставка', 0, NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (number) DO NOTHING;

-- Update pdf fields for paid invoices (simulate PDF generation)
UPDATE invoice SET 
    pdf_url = 'http://minio:9000/invoices/2026/04/' || id || '.pdf',
    pdf_status = 'ready',
    pdf_generated_at = NOW() - INTERVAL '2 days'
WHERE status = 'paid';

-- Verify
SELECT 'Invoices:' AS info;
SELECT number, status, amount_rub, counterparty_id FROM invoice ORDER BY created_at DESC;

SELECT 'Invoices by status:' AS info;
SELECT status, COUNT(*) as count FROM invoice GROUP BY status ORDER BY status;
