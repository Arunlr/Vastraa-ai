ALTER TABLE public.products
  ADD CONSTRAINT products_price_max CHECK (price <= 30000),
  ADD CONSTRAINT products_mrp_max CHECK (mrp <= 30000);