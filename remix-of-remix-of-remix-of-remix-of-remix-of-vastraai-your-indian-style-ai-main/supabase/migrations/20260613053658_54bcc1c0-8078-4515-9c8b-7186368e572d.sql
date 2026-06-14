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