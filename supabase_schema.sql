-- ==========================================
-- Migration: 20260613053658_54bcc1c0-8078-4515-9c8b-7186368e572d.sql
-- ==========================================

-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('admin','customer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name) VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email) SELECT id, email FROM auth.users ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role) SELECT id, 'customer' FROM auth.users ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users ON CONFLICT DO NOTHING;

-- ===== Categories / Brands =====
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.categories (name, slug) VALUES
  ('Lehenga','lehenga'),('Saree','saree'),('Anarkali','anarkali'),('Kurta','kurta'),('Sherwani','sherwani');

CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admin manage brands" ON public.brands FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== Products =====
CREATE TABLE public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  brand text NOT NULL,
  price integer NOT NULL,
  mrp integer NOT NULL,
  image_key text NOT NULL,
  image_url text,
  category text NOT NULL,
  gender text NOT NULL,
  occasion text[] NOT NULL DEFAULT '{}',
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  reviews integer NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 100,
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.products (id,name,brand,price,mrp,image_key,category,gender,occasion,rating,reviews,stock,featured) VALUES
('wl1','Royal Emerald Bridal Lehenga','Sabyasachi Edit',124999,189999,'wl1.jpg','Lehenga','Women',ARRAY['Wedding','Reception']::text[],4.9,1284,100,true),
('wl2','Crimson Bandhani Couture Lehenga','Anita Dongre',89999,149999,'wl2.jpg','Lehenga','Women',ARRAY['Wedding']::text[],4.8,612,100,true),
('wl3','Ivory Pearl Zardozi Lehenga','Manish Malhotra',159999,224999,'wl3.jpg','Lehenga','Women',ARRAY['Wedding','Reception']::text[],4.9,942,100,true),
('wl4','Rani Pink Mirror Lehenga','Abu Jani Sandeep Khosla',74999,119999,'wl4.jpg','Lehenga','Women',ARRAY['Sangeet','Festival']::text[],4.7,428,100,false),
('wl5','Midnight Velvet Lehenga','Tarun Tahiliani',134999,199999,'wl5.jpg','Lehenga','Women',ARRAY['Reception']::text[],4.8,356,100,true),
('wl6','Blush Rose Sequin Lehenga','Falguni Shane Peacock',99999,159999,'wl6.jpg','Lehenga','Women',ARRAY['Sangeet','Reception']::text[],4.7,511,100,false),
('wl7','Sapphire Threadwork Lehenga','Sabyasachi Edit',144999,209999,'wl7.jpg','Lehenga','Women',ARRAY['Wedding']::text[],4.9,720,100,true),
('wl8','Maroon Banarasi Lehenga','Ritu Kumar',64999,99999,'wl8.jpg','Lehenga','Women',ARRAY['Wedding','Festival']::text[],4.6,489,100,false),
('wl9','Champagne Gota Patti Lehenga','Anita Dongre',84999,134999,'wl9.jpg','Lehenga','Women',ARRAY['Sangeet']::text[],4.7,302,100,false),
('wl10','Wine Resham Couture Lehenga','Manish Malhotra',114999,174999,'wl10.jpg','Lehenga','Women',ARRAY['Reception']::text[],4.8,267,100,true),
('wl11','Peach Pastel Heritage Lehenga','Tarun Tahiliani',94999,149999,'wl11.jpg','Lehenga','Women',ARRAY['Wedding','Sangeet']::text[],4.7,198,100,false),
('ws1','Banarasi Silk Heritage Saree','Taneira',18499,28999,'ws1.jpg','Saree','Women',ARRAY['Festival','Pooja']::text[],4.8,942,100,true),
('ws2','Rose Gold Kanjeevaram Saree','Pothys',32499,49999,'ws2.jpg','Saree','Women',ARRAY['Wedding','Festival']::text[],4.9,1511,100,true),
('ws3','Ivory Chikankari Pure Silk Saree','Raw Mango',24999,36999,'ws3.jpg','Saree','Women',ARRAY['Pooja','Festival']::text[],4.8,681,100,true),
('ws4','Sindoor Red Bridal Kanjeevaram','Kanchipuram Silks',58999,84999,'ws4.jpg','Saree','Women',ARRAY['Wedding']::text[],4.9,1102,100,true),
('ws5','Emerald Patola Heirloom Saree','Patan Patola',89999,129999,'ws5.jpg','Saree','Women',ARRAY['Wedding','Festival']::text[],4.9,432,100,true),
('ws6','Black Pearl Chiffon Designer Saree','Sabyasachi Edit',44999,69999,'ws6.jpg','Saree','Women',ARRAY['Reception']::text[],4.8,588,100,true),
('ws7','Mustard Bandhani Gharchola','Anita Dongre',22999,34999,'ws7.jpg','Saree','Women',ARRAY['Festival','Sangeet']::text[],4.6,364,100,false),
('ws8','Royal Blue Mysore Silk Saree','Nalli',16999,24999,'ws8.jpg','Saree','Women',ARRAY['Festival','Pooja']::text[],4.7,421,100,false),
('ws9','Lavender Organza Hand-Painted Saree','Masaba',19999,29999,'ws9.jpg','Saree','Women',ARRAY['Sangeet','Reception']::text[],4.7,312,100,false),
('ws10','Antique Gold Tissue Saree','Tarun Tahiliani',54999,79999,'ws10.jpg','Saree','Women',ARRAY['Wedding','Reception']::text[],4.8,254,100,true),
('ws11','Forest Green Paithani Silk','Taneira',27999,41999,'ws11.jpg','Saree','Women',ARRAY['Festival']::text[],4.7,287,100,false),
('wa1','Marigold Mirror Anarkali','Biba',8499,13999,'wa1.jpg','Anarkali','Women',ARRAY['Festival','Sangeet']::text[],4.6,738,100,false),
('wa2','Onyx Black Velvet Anarkali','Sabyasachi Edit',42999,64999,'wa2.jpg','Anarkali','Women',ARRAY['Reception']::text[],4.8,412,100,true),
('wa3','Powder Pink Floor-Length Anarkali','Anita Dongre',24999,38999,'wa3.jpg','Anarkali','Women',ARRAY['Sangeet','Festival']::text[],4.7,526,100,false),
('wa4','Saffron Silk Zari Anarkali','Manyavar Mohey',14999,22999,'wa4.jpg','Anarkali','Women',ARRAY['Festival']::text[],4.6,389,100,false),
('wa5','Wine Embroidered Layered Anarkali','Ritu Kumar',19999,31999,'wa5.jpg','Anarkali','Women',ARRAY['Reception','Sangeet']::text[],4.7,271,100,false),
('wa6','Sky Blue Threadwork Anarkali','Masaba',12999,19999,'wa6.jpg','Anarkali','Women',ARRAY['Festival','Casual']::text[],4.5,198,100,false),
('wa7','Royal Maroon Couture Anarkali','Manish Malhotra',54999,79999,'wa7.jpg','Anarkali','Women',ARRAY['Wedding','Reception']::text[],4.9,312,100,true),
('wa8','Ivory Pearl Anarkali Gown','Tarun Tahiliani',64999,94999,'wa8.jpg','Anarkali','Women',ARRAY['Reception']::text[],4.8,245,100,true),
('wa9','Coral Mirror Festive Anarkali','Biba',7999,12999,'wa9.jpg','Anarkali','Women',ARRAY['Festival']::text[],4.5,612,100,false),
('wa10','Sage Green Chikankari Anarkali','Lucknow Atelier',16999,25999,'wa10.jpg','Anarkali','Women',ARRAY['Festival','Pooja']::text[],4.7,333,100,false),
('wa11','Deep Plum Velvet Anarkali','Anita Dongre',29999,44999,'wa11.jpg','Anarkali','Women',ARRAY['Reception','Wedding']::text[],4.7,188,100,false),
('wk1','Ivory Chikankari Kurti Set','Lucknow Atelier',4999,7999,'wk1.jpg','Kurta','Women',ARRAY['Festival','Casual']::text[],4.7,812,100,false),
('wk2','Rose Pink Gota Kurti','Biba',3499,5499,'wk2.jpg','Kurta','Women',ARRAY['Festival']::text[],4.6,543,100,false),
('wk3','Indigo Block-Print Kurti','Fabindia',2499,3999,'wk3.jpg','Kurta','Women',ARRAY['Casual']::text[],4.5,921,100,false),
('wk4','Mustard Cotton Anarkali Kurti','W for Women',2999,4499,'wk4.jpg','Kurta','Women',ARRAY['Casual','Festival']::text[],4.5,612,100,false),
('wk5','Emerald Silk Festive Kurti Set','Anita Dongre',8999,13999,'wk5.jpg','Kurta','Women',ARRAY['Festival','Pooja']::text[],4.7,387,100,false),
('wk6','Peach Mirror-Work Kurti','Global Desi',3999,5999,'wk6.jpg','Kurta','Women',ARRAY['Festival']::text[],4.6,421,100,false),
('wk7','Maroon Velvet Designer Kurti','Ritu Kumar',12999,19999,'wk7.jpg','Kurta','Women',ARRAY['Reception','Festival']::text[],4.7,256,100,false),
('wk8','Pastel Yellow Linen Kurti','Soch',2199,3299,'wk8.jpg','Kurta','Women',ARRAY['Casual']::text[],4.4,588,100,false),
('wk9','Royal Blue Embroidered Kurti','Aurelia',3299,4999,'wk9.jpg','Kurta','Women',ARRAY['Festival','Casual']::text[],4.5,731,100,false),
('wk10','Wine Banarasi Straight Kurti','Taneira',6999,10999,'wk10.jpg','Kurta','Women',ARRAY['Festival','Pooja']::text[],4.7,312,100,false),
('wk11','Coral Mul-Cotton Kurti Set','Fabindia',3799,5499,'wk11.jpg','Kurta','Women',ARRAY['Casual']::text[],4.5,402,100,false),
('mk1','Cobalt Embroidered Kurta Set','Manyavar',5499,8999,'mk1.jpg','Kurta','Men',ARRAY['Festival','Casual']::text[],4.6,612,100,false),
('mk2','Ivory Silk Bandhgala Kurta','Tasva',8999,13999,'mk2.jpg','Kurta','Men',ARRAY['Festival','Sangeet']::text[],4.7,421,100,false),
('mk3','Charcoal Linen Pathani Kurta','Fabindia',3499,5499,'mk3.jpg','Kurta','Men',ARRAY['Casual']::text[],4.5,538,100,false),
('mk4','Maroon Brocade Festive Kurta','Manyavar',6999,10999,'mk4.jpg','Kurta','Men',ARRAY['Festival','Pooja']::text[],4.7,489,100,false),
('mk5','Beige Chikan Kurta Pyjama','Lucknow Atelier',7499,11999,'mk5.jpg','Kurta','Men',ARRAY['Festival','Casual']::text[],4.6,312,100,false),
('mk6','Olive Mandarin-Collar Kurta','Tasva',4999,7499,'mk6.jpg','Kurta','Men',ARRAY['Casual','Festival']::text[],4.5,276,100,false),
('mk7','Royal Blue Silk Asymmetric Kurta','Manish Malhotra Men',14999,22999,'mk7.jpg','Kurta','Men',ARRAY['Sangeet','Reception']::text[],4.8,198,100,true),
('mk8','Black Velvet Bandi Kurta Set','Sabyasachi Men',24999,36999,'mk8.jpg','Kurta','Men',ARRAY['Reception']::text[],4.9,156,100,true),
('mk9','Saffron Cotton Festive Kurta','FabIndia',2999,4499,'mk9.jpg','Kurta','Men',ARRAY['Festival','Pooja']::text[],4.4,612,100,false),
('mk10','Wine Jacquard Kurta Jacket Set','Manyavar',9999,15999,'mk10.jpg','Kurta','Men',ARRAY['Festival','Sangeet']::text[],4.7,345,100,false),
('mk11','Forest Green Raw Silk Kurta','Tasva',6499,9999,'mk11.jpg','Kurta','Men',ARRAY['Festival']::text[],4.6,287,100,false),
('ms1','Ivory Zardozi Bridal Sherwani','Tasva',38999,62999,'ms1.jpg','Sherwani','Men',ARRAY['Wedding','Reception']::text[],4.9,421,100,true),
('ms2','Onyx Velvet Designer Sherwani','Manyavar',24999,39999,'ms2.jpg','Sherwani','Men',ARRAY['Reception']::text[],4.7,298,100,false),
('ms3','Gold Brocade Royal Sherwani','Manish Malhotra Men',74999,109999,'ms3.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.9,215,100,true),
('ms4','Wine Pearl-Embroidered Sherwani','Sabyasachi Men',89999,134999,'ms4.jpg','Sherwani','Men',ARRAY['Wedding','Reception']::text[],4.9,178,100,true),
('ms5','Beige Silk Heritage Sherwani','Tarun Tahiliani Men',54999,79999,'ms5.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.8,234,100,true),
('ms6','Midnight Blue Threadwork Sherwani','Tasva',32999,49999,'ms6.jpg','Sherwani','Men',ARRAY['Reception','Sangeet']::text[],4.7,312,100,false),
('ms7','Maroon Velvet Embellished Sherwani','Manyavar',28999,44999,'ms7.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.7,389,100,false),
('ms8','Champagne Raw Silk Sherwani','Raghavendra Rathore',64999,94999,'ms8.jpg','Sherwani','Men',ARRAY['Wedding','Reception']::text[],4.8,156,100,true),
('ms9','Emerald Bandhgala Sherwani','Manish Malhotra Men',48999,72999,'ms9.jpg','Sherwani','Men',ARRAY['Sangeet','Reception']::text[],4.8,187,100,true),
('ms10','Pearl White Crystal Sherwani','Sabyasachi Men',99999,149999,'ms10.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.9,124,100,true),
('ms11','Rust Orange Festive Sherwani','Tasva',22999,34999,'ms11.jpg','Sherwani','Men',ARRAY['Festival','Sangeet']::text[],4.6,256,100,false);

INSERT INTO public.brands (name) SELECT DISTINCT brand FROM public.products ON CONFLICT DO NOTHING;

-- ===== Orders =====
CREATE TYPE public.order_status AS ENUM ('Pending','Processing','Shipped','Delivered','Cancelled');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total integer NOT NULL,
  status public.order_status NOT NULL DEFAULT 'Pending',
  shipping_address jsonb,
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin read orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  product_image text NOT NULL,
  price integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read items via order" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "Insert items via own order" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- ===== Coupons =====
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_pct integer NOT NULL CHECK (discount_pct BETWEEN 1 AND 90),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "Admin manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.coupons (code, description, discount_pct) VALUES
  ('FESTIVE25','Festive season 25% off',25),
  ('WEDDING10','Wedding collection 10% off',10),
  ('FIRST500','First order — flat 10% off',10);

-- ===== Banners =====
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  cta_label text,
  cta_link text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active banners" ON public.banners FOR SELECT USING (active = true);
CREATE POLICY "Admin manage banners" ON public.banners FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== AI Usage =====
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  occasion text,
  recommended_product_ids text[] NOT NULL DEFAULT '{}',
  prompt text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_usage TO anon, authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone insert ai usage" ON public.ai_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read ai usage" ON public.ai_usage FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ===== Settings =====
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admin manage settings" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.settings (key, value) VALUES
  ('site', '{"name":"VastraAI","tagline":"Luxury Indian Fashion, Curated by AI","support_email":"hello@vastraai.com","support_phone":"+91 90000 00000"}'::jsonb),
  ('payment', '{"cod_enabled":true,"upi_enabled":true,"card_enabled":true,"min_order":499}'::jsonb),
  ('ai', '{"model":"google/gemini-2.5-flash","stylist_enabled":true,"daily_limit":50}'::jsonb);

CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ==========================================
-- Migration: 20260613053724_eb27a854-e90c-423e-83ad-314ccdca1869.sql
-- ==========================================

ALTER FUNCTION public.tg_set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone insert ai usage" ON public.ai_usage;
CREATE POLICY "Insert own ai usage" ON public.ai_usage FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ==========================================
-- Migration: 20260613053806_63c77d36-6b37-465e-9510-6219a2ab62aa.sql
-- ==========================================

CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));

-- ==========================================
-- Migration: 20260613071957_5fc9d98a-d93f-492c-aa0d-e7e4c8127cdc.sql
-- ==========================================


CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE has_any boolean; uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') INTO has_any;
  IF has_any THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

DROP POLICY IF EXISTS "Admin read profiles" ON public.profiles;
CREATE POLICY "Admin read profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;

CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));


-- ==========================================
-- Migration: 20260614120940_45d6afa4-a6b8-4b2c-8201-ebc47fa1fcd5.sql
-- ==========================================

-- Allow guest/legacy orders so admin dashboard can show mock orders without seeded auth users
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Seed the full catalog (idempotent)
INSERT INTO public.products (id,name,brand,price,mrp,image_key,category,gender,occasion,rating,reviews,stock,featured) VALUES
('wl1','Royal Emerald Bridal Lehenga','Sabyasachi Edit',124999,189999,'wl1.jpg','Lehenga','Women',ARRAY['Wedding','Reception']::text[],4.9,1284,73,true),
('wl2','Crimson Bandhani Couture Lehenga','Anita Dongre',89999,149999,'wl2.jpg','Lehenga','Women',ARRAY['Wedding']::text[],4.8,612,50,false),
('wl3','Ivory Pearl Zardozi Lehenga','Manish Malhotra',159999,224999,'wl3.jpg','Lehenga','Women',ARRAY['Wedding','Reception']::text[],4.9,942,61,true),
('wl4','Rani Pink Mirror Lehenga','Abu Jani Sandeep Khosla',74999,119999,'wl4.jpg','Lehenga','Women',ARRAY['Sangeet','Festival']::text[],4.7,428,32,false),
('wl5','Midnight Velvet Lehenga','Tarun Tahiliani',134999,199999,'wl5.jpg','Lehenga','Women',ARRAY['Reception']::text[],4.8,356,92,false),
('wl6','Blush Rose Sequin Lehenga','Falguni Shane Peacock',99999,159999,'wl6.jpg','Lehenga','Women',ARRAY['Sangeet','Reception']::text[],4.7,511,24,false),
('wl7','Sapphire Threadwork Lehenga','Sabyasachi Edit',144999,209999,'wl7.jpg','Lehenga','Women',ARRAY['Wedding']::text[],4.9,720,14,false),
('wl8','Maroon Banarasi Lehenga','Ritu Kumar',64999,99999,'wl8.jpg','Lehenga','Women',ARRAY['Wedding','Festival']::text[],4.6,489,96,false),
('wl9','Champagne Gota Patti Lehenga','Anita Dongre',84999,134999,'wl9.jpg','Lehenga','Women',ARRAY['Sangeet']::text[],4.7,302,92,false),
('wl10','Wine Resham Couture Lehenga','Manish Malhotra',114999,174999,'wl10.jpg','Lehenga','Women',ARRAY['Reception']::text[],4.8,267,23,false),
('wl11','Peach Pastel Heritage Lehenga','Tarun Tahiliani',94999,149999,'wl11.jpg','Lehenga','Women',ARRAY['Wedding','Sangeet']::text[],4.7,198,66,false),
('ws1','Banarasi Silk Heritage Saree','Taneira',18499,28999,'ws1.jpg','Saree','Women',ARRAY['Festival','Pooja']::text[],4.8,942,87,false),
('ws2','Rose Gold Kanjeevaram Saree','Pothys',32499,49999,'ws2.jpg','Saree','Women',ARRAY['Wedding','Festival']::text[],4.9,1511,98,true),
('ws3','Ivory Chikankari Pure Silk Saree','Raw Mango',24999,36999,'ws3.jpg','Saree','Women',ARRAY['Pooja','Festival']::text[],4.8,681,71,false),
('ws4','Sindoor Red Bridal Kanjeevaram','Kanchipuram Silks',58999,84999,'ws4.jpg','Saree','Women',ARRAY['Wedding']::text[],4.9,1102,18,true),
('ws5','Emerald Patola Heirloom Saree','Patan Patola',89999,129999,'ws5.jpg','Saree','Women',ARRAY['Wedding','Festival']::text[],4.9,432,79,false),
('ws6','Black Pearl Chiffon Designer Saree','Sabyasachi Edit',44999,69999,'ws6.jpg','Saree','Women',ARRAY['Reception']::text[],4.8,588,57,false),
('ws7','Mustard Bandhani Gharchola','Anita Dongre',22999,34999,'ws7.jpg','Saree','Women',ARRAY['Festival','Sangeet']::text[],4.6,364,95,false),
('ws8','Royal Blue Mysore Silk Saree','Nalli',16999,24999,'ws8.jpg','Saree','Women',ARRAY['Festival','Pooja']::text[],4.7,421,75,false),
('ws9','Lavender Organza Hand-Painted Saree','Masaba',19999,29999,'ws9.jpg','Saree','Women',ARRAY['Sangeet','Reception']::text[],4.7,312,33,false),
('ws10','Antique Gold Tissue Saree','Tarun Tahiliani',54999,79999,'ws10.jpg','Saree','Women',ARRAY['Wedding','Reception']::text[],4.8,254,54,false),
('ws11','Forest Green Paithani Silk','Taneira',27999,41999,'ws11.jpg','Saree','Women',ARRAY['Festival']::text[],4.7,287,20,false),
('wa1','Marigold Mirror Anarkali','Biba',8499,13999,'wa1.jpg','Anarkali','Women',ARRAY['Festival','Sangeet']::text[],4.6,738,79,false),
('wa2','Onyx Black Velvet Anarkali','Sabyasachi Edit',42999,64999,'wa2.jpg','Anarkali','Women',ARRAY['Reception']::text[],4.8,412,66,true),
('wa3','Powder Pink Floor-Length Anarkali','Anita Dongre',24999,38999,'wa3.jpg','Anarkali','Women',ARRAY['Sangeet','Festival']::text[],4.7,526,28,false),
('wa4','Saffron Silk Zari Anarkali','Manyavar Mohey',14999,22999,'wa4.jpg','Anarkali','Women',ARRAY['Festival']::text[],4.6,389,84,false),
('wa5','Wine Embroidered Layered Anarkali','Ritu Kumar',19999,31999,'wa5.jpg','Anarkali','Women',ARRAY['Reception','Sangeet']::text[],4.7,271,10,false),
('wa6','Sky Blue Threadwork Anarkali','Masaba',12999,19999,'wa6.jpg','Anarkali','Women',ARRAY['Festival','Casual']::text[],4.5,198,63,false),
('wa7','Royal Maroon Couture Anarkali','Manish Malhotra',54999,79999,'wa7.jpg','Anarkali','Women',ARRAY['Wedding','Reception']::text[],4.9,312,18,false),
('wa8','Ivory Pearl Anarkali Gown','Tarun Tahiliani',64999,94999,'wa8.jpg','Anarkali','Women',ARRAY['Reception']::text[],4.8,245,36,false),
('wa9','Coral Mirror Festive Anarkali','Biba',7999,12999,'wa9.jpg','Anarkali','Women',ARRAY['Festival']::text[],4.5,612,37,false),
('wa10','Sage Green Chikankari Anarkali','Lucknow Atelier',16999,25999,'wa10.jpg','Anarkali','Women',ARRAY['Festival','Pooja']::text[],4.7,333,41,false),
('wa11','Deep Plum Velvet Anarkali','Anita Dongre',29999,44999,'wa11.jpg','Anarkali','Women',ARRAY['Reception','Wedding']::text[],4.7,188,75,false),
('wk1','Ivory Chikankari Kurti Set','Lucknow Atelier',4999,7999,'wk1.jpg','Kurta','Women',ARRAY['Festival','Casual']::text[],4.7,812,40,false),
('wk2','Rose Pink Gota Kurti','Biba',3499,5499,'wk2.jpg','Kurta','Women',ARRAY['Festival']::text[],4.6,543,92,false),
('wk3','Indigo Block-Print Kurti','Fabindia',2499,3999,'wk3.jpg','Kurta','Women',ARRAY['Casual']::text[],4.5,921,90,false),
('wk4','Mustard Cotton Anarkali Kurti','W for Women',2999,4499,'wk4.jpg','Kurta','Women',ARRAY['Casual','Festival']::text[],4.5,612,94,false),
('wk5','Emerald Silk Festive Kurti Set','Anita Dongre',8999,13999,'wk5.jpg','Kurta','Women',ARRAY['Festival','Pooja']::text[],4.7,387,39,false),
('wk6','Peach Mirror-Work Kurti','Global Desi',3999,5999,'wk6.jpg','Kurta','Women',ARRAY['Festival']::text[],4.6,421,48,false),
('wk7','Maroon Velvet Designer Kurti','Ritu Kumar',12999,19999,'wk7.jpg','Kurta','Women',ARRAY['Reception','Festival']::text[],4.7,256,63,false),
('wk8','Pastel Yellow Linen Kurti','Soch',2199,3299,'wk8.jpg','Kurta','Women',ARRAY['Casual']::text[],4.4,588,87,false),
('wk9','Royal Blue Embroidered Kurti','Aurelia',3299,4999,'wk9.jpg','Kurta','Women',ARRAY['Festival','Casual']::text[],4.5,731,56,false),
('wk10','Wine Banarasi Straight Kurti','Taneira',6999,10999,'wk10.jpg','Kurta','Women',ARRAY['Festival','Pooja']::text[],4.7,312,30,false),
('wk11','Coral Mul-Cotton Kurti Set','Fabindia',3799,5499,'wk11.jpg','Kurta','Women',ARRAY['Casual']::text[],4.5,402,26,false),
('mk1','Cobalt Embroidered Kurta Set','Manyavar',5499,8999,'mk1.jpg','Kurta','Men',ARRAY['Festival','Casual']::text[],4.6,612,34,false),
('mk2','Ivory Silk Bandhgala Kurta','Tasva',8999,13999,'mk2.jpg','Kurta','Men',ARRAY['Festival','Sangeet']::text[],4.7,421,98,false),
('mk3','Charcoal Linen Pathani Kurta','Fabindia',3499,5499,'mk3.jpg','Kurta','Men',ARRAY['Casual']::text[],4.5,538,38,false),
('mk4','Maroon Brocade Festive Kurta','Manyavar',6999,10999,'mk4.jpg','Kurta','Men',ARRAY['Festival','Pooja']::text[],4.7,489,46,false),
('mk5','Beige Chikan Kurta Pyjama','Lucknow Atelier',7499,11999,'mk5.jpg','Kurta','Men',ARRAY['Festival','Casual']::text[],4.6,312,21,false),
('mk6','Olive Mandarin-Collar Kurta','Tasva',4999,7499,'mk6.jpg','Kurta','Men',ARRAY['Casual','Festival']::text[],4.5,276,43,false),
('mk7','Royal Blue Silk Asymmetric Kurta','Manish Malhotra Men',14999,22999,'mk7.jpg','Kurta','Men',ARRAY['Sangeet','Reception']::text[],4.8,198,23,false),
('mk8','Black Velvet Bandi Kurta Set','Sabyasachi Men',24999,36999,'mk8.jpg','Kurta','Men',ARRAY['Reception']::text[],4.9,156,14,false),
('mk9','Saffron Cotton Festive Kurta','FabIndia',2999,4499,'mk9.jpg','Kurta','Men',ARRAY['Festival','Pooja']::text[],4.4,612,64,false),
('mk10','Wine Jacquard Kurta Jacket Set','Manyavar',9999,15999,'mk10.jpg','Kurta','Men',ARRAY['Festival','Sangeet']::text[],4.7,345,54,false),
('mk11','Forest Green Raw Silk Kurta','Tasva',6499,9999,'mk11.jpg','Kurta','Men',ARRAY['Festival']::text[],4.6,287,69,false),
('ms1','Ivory Zardozi Bridal Sherwani','Tasva',38999,62999,'ms1.jpg','Sherwani','Men',ARRAY['Wedding','Reception']::text[],4.9,421,70,false),
('ms2','Onyx Velvet Designer Sherwani','Manyavar',24999,39999,'ms2.jpg','Sherwani','Men',ARRAY['Reception']::text[],4.7,298,92,false),
('ms3','Gold Brocade Royal Sherwani','Manish Malhotra Men',74999,109999,'ms3.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.9,215,29,true),
('ms4','Wine Pearl-Embroidered Sherwani','Sabyasachi Men',89999,134999,'ms4.jpg','Sherwani','Men',ARRAY['Wedding','Reception']::text[],4.9,178,43,true),
('ms5','Beige Silk Heritage Sherwani','Tarun Tahiliani Men',54999,79999,'ms5.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.8,234,62,false),
('ms6','Midnight Blue Threadwork Sherwani','Tasva',32999,49999,'ms6.jpg','Sherwani','Men',ARRAY['Reception','Sangeet']::text[],4.7,312,31,false),
('ms7','Maroon Velvet Embellished Sherwani','Manyavar',28999,44999,'ms7.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.7,389,30,false),
('ms8','Champagne Raw Silk Sherwani','Raghavendra Rathore',64999,94999,'ms8.jpg','Sherwani','Men',ARRAY['Wedding','Reception']::text[],4.8,156,52,false),
('ms9','Emerald Bandhgala Sherwani','Manish Malhotra Men',48999,72999,'ms9.jpg','Sherwani','Men',ARRAY['Sangeet','Reception']::text[],4.8,187,19,false),
('ms10','Pearl White Crystal Sherwani','Sabyasachi Men',99999,149999,'ms10.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.9,124,62,false),
('ms11','Rust Orange Festive Sherwani','Tasva',22999,34999,'ms11.jpg','Sherwani','Men',ARRAY['Festival','Sangeet']::text[],4.6,256,11,false),
('wl12','Sapphire Blue Silk Bridal Lehenga','Manish Malhotra',138999,199999,'wl12.jpg','Lehenga','Women',ARRAY['Wedding','Reception']::text[],4.9,412,55,false),
('wl13','Coral Sequin Sangeet Lehenga','Falguni Shane Peacock',92999,144999,'wl13.jpg','Lehenga','Women',ARRAY['Sangeet','Reception']::text[],4.8,287,40,false),
('wl14','Antique Gold Brocade Lehenga','Ritu Kumar',78999,119999,'wl14.jpg','Lehenga','Women',ARRAY['Wedding','Festival']::text[],4.7,233,35,false),
('wl15','Mint Pastel Floral Lehenga','Anita Dongre',64999,99999,'wl15.jpg','Lehenga','Women',ARRAY['Sangeet','Festival']::text[],4.7,178,60,false),
('wl16','Burgundy Velvet Royal Lehenga','Sabyasachi Edit',154999,219999,'wl16.jpg','Lehenga','Women',ARRAY['Wedding','Reception']::text[],4.9,519,25,false),
('wl17','Powder Blue Mirror Lehenga','Abu Jani Sandeep Khosla',89999,134999,'wl17.jpg','Lehenga','Women',ARRAY['Sangeet']::text[],4.7,198,48,false),
('wl18','Fuchsia Pink Resham Lehenga','Anita Dongre',79999,124999,'wl18.jpg','Lehenga','Women',ARRAY['Wedding','Sangeet']::text[],4.7,264,52,false),
('wl19','Olive Zardozi Heritage Lehenga','Tarun Tahiliani',119999,174999,'wl19.jpg','Lehenga','Women',ARRAY['Wedding']::text[],4.8,211,30,false),
('wl20','Rose Gold Tissue Lehenga','Manish Malhotra',109999,159999,'wl20.jpg','Lehenga','Women',ARRAY['Reception']::text[],4.8,189,42,false),
('wl21','Aqua Cutdana Couture Lehenga','Falguni Shane Peacock',124999,184999,'wl21.jpg','Lehenga','Women',ARRAY['Reception','Sangeet']::text[],4.8,142,28,false),
('ws12','Peacock Blue Kanjeevaram Saree','Kanchipuram Silks',36999,54999,'ws12.jpg','Saree','Women',ARRAY['Wedding','Festival']::text[],4.8,612,70,false),
('ws13','Maroon Banarasi Brocade Saree','Taneira',22999,34999,'ws13.jpg','Saree','Women',ARRAY['Festival','Pooja']::text[],4.7,489,85,false),
('ws14','Pista Green Organza Saree','Masaba',18999,28999,'ws14.jpg','Saree','Women',ARRAY['Sangeet','Festival']::text[],4.7,312,50,false),
('ws15','Ruby Red Bridal Silk Saree','Pothys',64999,94999,'ws15.jpg','Saree','Women',ARRAY['Wedding']::text[],4.9,821,38,false),
('ws16','Charcoal Sequin Designer Saree','Sabyasachi Edit',48999,74999,'ws16.jpg','Saree','Women',ARRAY['Reception']::text[],4.8,367,22,false),
('ws17','Mustard Bandhani Bandhej Saree','Anita Dongre',19999,29999,'ws17.jpg','Saree','Women',ARRAY['Festival','Sangeet']::text[],4.6,298,65,false),
('ws18','Beige Linen Handloom Saree','Raw Mango',14999,22999,'ws18.jpg','Saree','Women',ARRAY['Casual','Pooja']::text[],4.6,256,72,false),
('ws19','Navy Mysore Crepe Silk Saree','Nalli',17999,26999,'ws19.jpg','Saree','Women',ARRAY['Festival','Pooja']::text[],4.7,334,45,false),
('ws20','Plum Tussar Silk Saree','Taneira',21999,32999,'ws20.jpg','Saree','Women',ARRAY['Festival']::text[],4.7,198,40,false),
('ws21','Sea Green Patola Silk Saree','Patan Patola',78999,114999,'ws21.jpg','Saree','Women',ARRAY['Wedding','Festival']::text[],4.9,312,18,false),
('wa12','Crimson Velvet Floor-Length Anarkali','Sabyasachi Edit',49999,74999,'wa12.jpg','Anarkali','Women',ARRAY['Reception','Wedding']::text[],4.8,287,30,false),
('wa13','Mint Green Threadwork Anarkali','Anita Dongre',22999,34999,'wa13.jpg','Anarkali','Women',ARRAY['Festival','Sangeet']::text[],4.7,312,55,false),
('wa14','Peach Pearl Layered Anarkali','Tarun Tahiliani',58999,84999,'wa14.jpg','Anarkali','Women',ARRAY['Reception']::text[],4.8,178,25,false),
('wa15','Royal Purple Zari Anarkali','Ritu Kumar',26999,39999,'wa15.jpg','Anarkali','Women',ARRAY['Reception','Sangeet']::text[],4.7,211,42,false),
('wa16','Ivory Gold Pearl Anarkali','Manish Malhotra',69999,99999,'wa16.jpg','Anarkali','Women',ARRAY['Wedding','Reception']::text[],4.9,267,32,false),
('wa17','Teal Mirror Festive Anarkali','Biba',11999,17999,'wa17.jpg','Anarkali','Women',ARRAY['Festival']::text[],4.5,423,70,false),
('wa18','Mauve Sequin Reception Anarkali','Falguni Shane Peacock',44999,67999,'wa18.jpg','Anarkali','Women',ARRAY['Reception']::text[],4.7,198,28,false),
('wa19','Sunset Orange Silk Anarkali','Anita Dongre',18999,28999,'wa19.jpg','Anarkali','Women',ARRAY['Festival','Sangeet']::text[],4.6,256,60,false),
('wa20','Black Pearl Bridal Anarkali','Sabyasachi Edit',74999,109999,'wa20.jpg','Anarkali','Women',ARRAY['Reception','Wedding']::text[],4.9,156,18,false),
('wa21','Pastel Blue Chikankari Anarkali','Lucknow Atelier',17999,26999,'wa21.jpg','Anarkali','Women',ARRAY['Festival','Pooja']::text[],4.7,289,48,false),
('wk12','Olive Green Cotton Kurti','Fabindia',2299,3499,'wk12.jpg','Kurta','Women',ARRAY['Casual']::text[],4.5,543,90,false),
('wk13','Hot Pink Embroidered Kurti','Biba',3799,5799,'wk13.jpg','Kurta','Women',ARRAY['Festival']::text[],4.6,421,75,false),
('wk14','White Schiffli Cotton Kurti','W for Women',2599,3899,'wk14.jpg','Kurta','Women',ARRAY['Casual']::text[],4.5,612,80,false),
('wk15','Navy Block-Print Kurti','Fabindia',2399,3699,'wk15.jpg','Kurta','Women',ARRAY['Casual','Festival']::text[],4.5,388,82,false),
('wk16','Beige Linen A-Line Kurti','Soch',2799,4199,'wk16.jpg','Kurta','Women',ARRAY['Casual']::text[],4.4,312,70,false),
('wk17','Magenta Silk Festive Kurti Set','Anita Dongre',8499,12999,'wk17.jpg','Kurta','Women',ARRAY['Festival','Sangeet']::text[],4.7,245,35,false),
('wk18','Turquoise Mirror Kurti Set','Global Desi',4299,6499,'wk18.jpg','Kurta','Women',ARRAY['Festival']::text[],4.6,287,55,false),
('wk19','Brown Khadi Straight Kurti','Fabindia',2199,3299,'wk19.jpg','Kurta','Women',ARRAY['Casual']::text[],4.4,332,68,false),
('wk20','Lemon Yellow Floral Kurti','Aurelia',2899,4299,'wk20.jpg','Kurta','Women',ARRAY['Casual','Festival']::text[],4.5,401,72,false),
('wk21','Rust Gota-Patti Kurti Set','Biba',4699,6999,'wk21.jpg','Kurta','Women',ARRAY['Festival','Pooja']::text[],4.6,298,40,false),
('mk12','Off-White Linen Festive Kurta','Tasva',3899,5999,'mk12.jpg','Kurta','Men',ARRAY['Festival','Casual']::text[],4.5,412,60,false),
('mk13','Navy Brocade Bandhgala Kurta','Manyavar',7499,11499,'mk13.jpg','Kurta','Men',ARRAY['Festival','Sangeet']::text[],4.7,332,45,false),
('mk14','Mustard Silk Pathani Kurta','Tasva',5499,8499,'mk14.jpg','Kurta','Men',ARRAY['Festival']::text[],4.6,256,50,false),
('mk15','Grey Mandarin-Collar Kurta','FabIndia',3299,4999,'mk15.jpg','Kurta','Men',ARRAY['Casual']::text[],4.5,387,65,false),
('mk16','Sage Green Cotton Kurta Set','Tasva',4799,7299,'mk16.jpg','Kurta','Men',ARRAY['Casual','Festival']::text[],4.5,312,55,false),
('mk17','Burgundy Embroidered Kurta Jacket','Manyavar',9999,15499,'mk17.jpg','Kurta','Men',ARRAY['Festival','Sangeet']::text[],4.7,289,38,false),
('mk18','Black Silk Asymmetric Kurta','Manish Malhotra Men',13999,21499,'mk18.jpg','Kurta','Men',ARRAY['Reception','Sangeet']::text[],4.8,178,28,false),
('mk19','Cream Chikankari Kurta Set','Lucknow Atelier',6999,10999,'mk19.jpg','Kurta','Men',ARRAY['Festival','Casual']::text[],4.6,245,42,false),
('mk20','Indigo Block-Print Kurta','FabIndia',2799,4199,'mk20.jpg','Kurta','Men',ARRAY['Casual']::text[],4.5,421,58,false),
('mk21','Royal Maroon Brocade Kurta','Manyavar',6499,9999,'mk21.jpg','Kurta','Men',ARRAY['Festival','Pooja']::text[],4.6,311,48,false),
('ms12','Champagne Pearl Bridal Sherwani','Tasva',44999,69999,'ms12.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.8,287,38,false),
('ms13','Royal Blue Velvet Sherwani','Manyavar',32999,49999,'ms13.jpg','Sherwani','Men',ARRAY['Reception','Sangeet']::text[],4.7,312,30,false),
('ms14','Ivory Threadwork Wedding Sherwani','Tarun Tahiliani Men',59999,89999,'ms14.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.8,198,22,false),
('ms15','Black Zardozi Reception Sherwani','Sabyasachi Men',79999,119999,'ms15.jpg','Sherwani','Men',ARRAY['Reception']::text[],4.9,156,18,false),
('ms16','Emerald Brocade Sangeet Sherwani','Manish Malhotra Men',42999,64999,'ms16.jpg','Sherwani','Men',ARRAY['Sangeet','Reception']::text[],4.7,211,35,false),
('ms17','Beige Raw Silk Heritage Sherwani','Raghavendra Rathore',49999,74999,'ms17.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.8,167,40,false),
('ms18','Maroon Gold Embellished Sherwani','Manyavar',36999,54999,'ms18.jpg','Sherwani','Men',ARRAY['Wedding','Reception']::text[],4.7,298,28,false),
('ms19','Pastel Mint Designer Sherwani','Tasva',28999,43999,'ms19.jpg','Sherwani','Men',ARRAY['Sangeet']::text[],4.6,178,32,false),
('ms20','Wine Crystal Bridal Sherwani','Sabyasachi Men',94999,139999,'ms20.jpg','Sherwani','Men',ARRAY['Wedding']::text[],4.9,134,15,false),
('ms21','Charcoal Bandhgala Sherwani','Tasva',26999,39999,'ms21.jpg','Sherwani','Men',ARRAY['Reception']::text[],4.6,245,42,false)
ON CONFLICT (id) DO NOTHING;

-- Seed a handful of realistic mock orders so the admin dashboard feels alive
WITH seed_orders AS (
  INSERT INTO public.orders (id, user_id, total, status, shipping_address, payment_method, created_at) VALUES
    (gen_random_uuid(), NULL, 124999, 'Pending'::order_status,
      '{"name":"Aanya Sharma","email":"aanya.s@example.com","phone":"+91 98200 12345","address":"21 Marine Drive","city":"Mumbai","pincode":"400020"}'::jsonb,
      'UPI · GPay / PhonePe', now() - interval '3 hours'),
    (gen_random_uuid(), NULL, 38999, 'Processing'::order_status,
      '{"name":"Vikram Mehta","email":"vikram.m@example.com","phone":"+91 98765 43210","address":"B-12 DLF Phase 4","city":"Gurugram","pincode":"122002"}'::jsonb,
      'Credit / Debit Card', now() - interval '1 day'),
    (gen_random_uuid(), NULL, 58999, 'Shipped'::order_status,
      '{"name":"Riya Kapoor","email":"riya.k@example.com","phone":"+91 99110 11223","address":"45 Civil Lines","city":"Jaipur","pincode":"302006"}'::jsonb,
      'UPI · GPay / PhonePe', now() - interval '2 days'),
    (gen_random_uuid(), NULL, 9998, 'Delivered'::order_status,
      '{"name":"Karan Patel","email":"karan.p@example.com","phone":"+91 90909 80808","address":"7 Ellis Bridge","city":"Ahmedabad","pincode":"380006"}'::jsonb,
      'Cash on Delivery', now() - interval '5 days'),
    (gen_random_uuid(), NULL, 74999, 'Delivered'::order_status,
      '{"name":"Meera Iyer","email":"meera.i@example.com","phone":"+91 98456 11122","address":"12 Indiranagar","city":"Bengaluru","pincode":"560038"}'::jsonb,
      'Credit / Debit Card', now() - interval '8 days')
  RETURNING id, total, created_at
)
INSERT INTO public.order_items (order_id, product_id, product_name, product_image, price, quantity)
SELECT o.id, p.id, p.name, COALESCE(p.image_url,'/' || p.image_key), p.price, 1
FROM seed_orders o
JOIN LATERAL (
  SELECT * FROM public.products
  WHERE price <= o.total
  ORDER BY abs(price - o.total) ASC
  LIMIT 1
) p ON TRUE;


-- ==========================================
-- Migration: 20260614125128_df71de78-8566-477f-8e71-93c0b89b86aa.sql
-- ==========================================


ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'Confirmed' BEFORE 'Processing';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'Returned' AFTER 'Cancelled';


-- ==========================================
-- Migration: 20260614125241_a387a47d-cec6-40ee-b3ff-1164a57167f2.sql
-- ==========================================


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

