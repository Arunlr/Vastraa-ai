
-- ORDERS extensions
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Unpaid';

UPDATE public.orders
   SET order_number = 'VAI-' || upper(substr(replace(id::text, '-', ''), 1, 8))
 WHERE order_number IS NULL;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP POLICY IF EXISTS "Customers cancel own pending orders" ON public.orders;
CREATE POLICY "Customers cancel own pending orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('Pending','Confirmed','Processing'))
  WITH CHECK (user_id = auth.uid() AND status = 'Cancelled');

-- CART ITEMS
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 20),
  size text NOT NULL DEFAULT 'M',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, size)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own cart read"   ON public.cart_items FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own cart insert" ON public.cart_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own cart update" ON public.cart_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own cart delete" ON public.cart_items FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_cart_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- WISHLIST
CREATE TABLE IF NOT EXISTS public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlist TO authenticated;
GRANT ALL ON public.wishlist TO service_role;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own wishlist read"   ON public.wishlist FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own wishlist insert" ON public.wishlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own wishlist delete" ON public.wishlist FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ADDRESSES
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  name text NOT NULL,
  phone text NOT NULL,
  line text NOT NULL,
  city text NOT NULL,
  state text,
  pincode text NOT NULL,
  country text NOT NULL DEFAULT 'India',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own addresses all" ON public.addresses FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_addresses_updated_at ON public.addresses;
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reviews"     ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers write review"  ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Customers update review" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Customers delete own / admin any" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- AI RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_image_path text,
  occasion text,
  analysis jsonb,
  recommendations jsonb,
  recommended_product_ids text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_recommendations TO authenticated;
GRANT ALL ON public.ai_recommendations TO service_role;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own recs read or admin" ON public.ai_recommendations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own recs insert"        ON public.ai_recommendations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- RPC: place_order
CREATE OR REPLACE FUNCTION public.place_order(
  _shipping_address jsonb,
  _payment_method text,
  _items jsonb
)
RETURNS TABLE(order_id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _new_order_id uuid;
  _new_order_number text;
  _total integer := 0;
  _it jsonb;
  _pid text;
  _qty integer;
  _prod record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _pid := _it->>'product_id';
    _qty := COALESCE((_it->>'quantity')::int, 1);
    IF _qty <= 0 THEN RAISE EXCEPTION 'Bad quantity'; END IF;
    SELECT * INTO _prod FROM public.products WHERE id = _pid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', _pid; END IF;
    IF _prod.stock < _qty THEN RAISE EXCEPTION 'Insufficient stock for %', _prod.name; END IF;
    _total := _total + (_prod.price * _qty);
  END LOOP;

  _new_order_number := 'VAI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.orders(user_id, total, status, shipping_address, payment_method, payment_status, order_number)
  VALUES (_user, _total, 'Pending', _shipping_address, _payment_method,
          CASE WHEN _payment_method ILIKE '%cod%' OR _payment_method ILIKE '%cash%' THEN 'Unpaid' ELSE 'Paid' END,
          _new_order_number)
  RETURNING id INTO _new_order_id;

  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _pid := _it->>'product_id';
    _qty := COALESCE((_it->>'quantity')::int, 1);
    SELECT * INTO _prod FROM public.products WHERE id = _pid;
    INSERT INTO public.order_items(order_id, product_id, product_name, product_image, price, quantity)
    VALUES (_new_order_id, _prod.id, _prod.name, _prod.image_url, _prod.price, _qty);
    UPDATE public.products SET stock = stock - _qty, updated_at = now() WHERE id = _pid;
  END LOOP;

  DELETE FROM public.cart_items WHERE user_id = _user;

  RETURN QUERY SELECT _new_order_id, _new_order_number;
END $$;

REVOKE ALL ON FUNCTION public.place_order(jsonb, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, text, jsonb) TO authenticated;

-- RPC: cancel_order
CREATE OR REPLACE FUNCTION public.cancel_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _is_admin boolean := public.has_role(_user, 'admin');
  _o record;
  _it record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT _is_admin AND _o.user_id <> _user THEN RAISE EXCEPTION 'Not your order'; END IF;
  IF _o.status IN ('Delivered','Cancelled','Returned') THEN RAISE EXCEPTION 'Cannot cancel order in status %', _o.status; END IF;
  IF NOT _is_admin AND _o.status = 'Shipped' THEN RAISE EXCEPTION 'Shipped orders cannot be self-cancelled'; END IF;

  FOR _it IN SELECT product_id, quantity FROM public.order_items WHERE order_id = _order_id LOOP
    UPDATE public.products SET stock = stock + _it.quantity, updated_at = now() WHERE id = _it.product_id;
  END LOOP;

  UPDATE public.orders SET status = 'Cancelled', updated_at = now() WHERE id = _order_id;
END $$;

REVOKE ALL ON FUNCTION public.cancel_order(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated;

-- REALTIME publication
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders','order_items','products','profiles','ai_usage','ai_recommendations','cart_items','wishlist']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.cart_items REPLICA IDENTITY FULL;
ALTER TABLE public.wishlist REPLICA IDENTITY FULL;
