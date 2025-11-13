-- Add Stripe test mode fields to courses table
-- This allows storing both test and live Stripe product information

ALTER TABLE courses ADD COLUMN stripe_test_product_id TEXT;
ALTER TABLE courses ADD COLUMN stripe_test_price_id TEXT;
ALTER TABLE courses ADD COLUMN stripe_test_payment_link TEXT;
