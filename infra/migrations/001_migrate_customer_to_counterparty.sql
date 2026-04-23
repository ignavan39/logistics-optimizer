-- Migration: customerId → counterparty
-- Run this script AFTER counterparty table is created and before adding foreign keys

-- Step 1: Create counterparty records from unique customer_id values
INSERT INTO counterparty (id, name, type, inn, created_at)
SELECT 
    uuid_generate_v4(),
    'Customer ' || LEFT(customer_id, 8),
    'carrier',
    customer_id,
    NOW()
FROM orders
WHERE customer_id IS NOT NULL
GROUP BY customer_id
ON CONFLICT (inn) DO NOTHING;

-- Step 2: Link existing orders to counterparty records
UPDATE orders o
SET counterparty_id = c.id,
    updated_at = NOW()
FROM counterparty c
WHERE c.inn = o.customer_id
  AND o.counterparty_id IS NULL;

-- Step 3: (Optional) Update customer_id to NULL after migration
-- ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;
-- Only run after verifying the migration was successful!