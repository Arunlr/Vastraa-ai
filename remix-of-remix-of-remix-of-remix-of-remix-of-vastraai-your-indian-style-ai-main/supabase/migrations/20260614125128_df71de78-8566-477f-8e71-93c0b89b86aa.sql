
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'Confirmed' BEFORE 'Processing';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'Returned' AFTER 'Cancelled';
