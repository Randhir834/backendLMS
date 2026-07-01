-- Migration: Update payments table for Razorpay integration
-- This migration adds Razorpay-specific columns to the payments table

-- Add new columns if they don't exist
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(500);

-- Rename transaction_id to maintain compatibility
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'transaction_id'
  ) THEN
    -- Copy data to razorpay_payment_id if it exists
    UPDATE payments SET razorpay_payment_id = transaction_id WHERE transaction_id IS NOT NULL;
    -- Drop old column
    ALTER TABLE payments DROP COLUMN transaction_id;
  END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
