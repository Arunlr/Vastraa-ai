import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth, useCart } from "@/lib/store";
import { CheckCircle2, MapPin, CreditCard, Truck, Package, Copy } from "lucide-react";
import { toast } from "sonner";
import { saveOrder, makeOrderId, makeTracking, type Order } from "@/lib/orders";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout · VastraAI" }] }),
});

function Checkout() {
  const { user, ready } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/auth" });
  }, [ready, user, navigate]);

  const shipping = subtotal > 999 ? 0 : 99;
  const total = subtotal + shipping;

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    setPlacing(true);
    const address = {
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      line: String(fd.get("line") ?? ""),
      city: String(fd.get("city") ?? ""),
      pin: String(fd.get("pin") ?? ""),
    };
    const payment = String(fd.get("pm") ?? "UPI");
    const order: Order = {
      id: makeOrderId(),
      tracking: makeTracking(),
      userEmail: user?.email ?? null,
      items,
      subtotal,
      shipping,
      total,
      address,
      payment,
      placedAt: Date.now(),
      status: "placed",
      estimatedDelivery: Date.now() + 4 * 24 * 60 * 60 * 1000,
      carrier: "VastraExpress",
    };

    // Persist to Lovable Cloud so admin dashboard sees the order immediately.
    try {
      if (user) {
        const { data: dbOrder, error: oErr } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            total,
            status: "Pending",
            payment_method: payment,
            shipping_address: {
              name: address.name,
              email: user.email,
              phone: address.phone,
              address: address.line,
              city: address.city,
              pincode: address.pin,
              tracking: order.tracking,
              local_id: order.id,
            },
          })
          .select("id")
          .single();
        if (oErr) throw oErr;
        if (dbOrder?.id && items.length) {
          const rows = items.map((it) => ({
            order_id: dbOrder.id,
            product_id: it.product.id,
            product_name: it.product.name,
            product_image: it.product.image,
            price: it.product.price,
            quantity: it.qty,
          }));
          await supabase.from("order_items").insert(rows);
        }
      }
    } catch (err) {
      console.error("Order DB sync failed", err);
    }

    saveOrder(order);
    setPlacedOrder(order);
    clear();
    toast.success("Order placed! 🎉");
    setPlacing(false);
  };

  if (placedOrder) {
    const copyTracking = () => {
      navigator.clipboard?.writeText(placedOrder.tracking);
      toast.success("Tracking number copied");
    };
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <div className="h-20 w-20 rounded-full bg-gold-grad mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-4xl font-bold mt-6">Order placed!</h1>
          <p className="text-muted-foreground mt-2">Your order <b>#{placedOrder.id}</b> is being crafted with love.</p>

          <div className="mt-6 bg-card border rounded-2xl p-5 text-left text-sm space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Tracking number</div>
              <div className="flex items-center justify-between mt-1">
                <div className="font-mono text-lg font-bold">{placedOrder.tracking}</div>
                <button onClick={copyTracking} className="p-2 hover:text-primary" title="Copy"><Copy className="h-4 w-4"/></button>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t"><Truck className="h-4 w-4 text-accent mt-0.5"/> Carrier: {placedOrder.carrier} · ETA {new Date(placedOrder.estimatedDelivery).toLocaleDateString()}</div>
            <div className="flex gap-2"><MapPin className="h-4 w-4 text-accent mt-0.5"/> {placedOrder.address.line}, {placedOrder.address.city} - {placedOrder.address.pin}</div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/order/$id" params={{ id: placedOrder.id }} className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold inline-flex items-center justify-center gap-2"><Package className="h-4 w-4"/> Track this order</Link>
            <Link to="/my-orders" className="border border-border px-6 py-3 rounded-full font-semibold inline-flex items-center justify-center">My Orders</Link>
            <Link to="/" className="px-6 py-3 rounded-full font-semibold inline-flex items-center justify-center hover:text-primary">Continue Shopping</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!ready || !user) return null;

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Your bag is empty</h1>
          <Link to="/shop" className="mt-6 inline-block bg-primary text-primary-foreground px-7 py-3 rounded-full font-semibold">Browse collection</Link>
        </div>
        <Footer/>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-10">
        <h1 className="font-display text-4xl font-bold">Checkout</h1>
        <form ref={formRef} onSubmit={placeOrder} className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            <Section title="Shipping Address" icon={<MapPin className="h-4 w-4"/>}>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input name="name" placeholder="Full name" required defaultValue={user.user_metadata?.full_name ?? ""}/>
                <Input name="phone" placeholder="Phone" required/>
                <Input name="line" placeholder="Address line" required className="sm:col-span-2"/>
                <Input name="city" placeholder="City" required/>
                <Input name="pin" placeholder="PIN code" required pattern="[0-9]{6}"/>
              </div>
            </Section>
            <Section title="Payment Method" icon={<CreditCard className="h-4 w-4"/>}>
              <div className="space-y-2 text-sm">
                {["UPI · GPay / PhonePe", "Credit / Debit Card", "Cash on Delivery"].map((m, i) => (
                  <label key={m} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:border-primary">
                    <input type="radio" name="pm" value={m} defaultChecked={i===0} className="accent-primary"/>
                    {m}
                  </label>
                ))}
              </div>
            </Section>
          </div>

          <aside className="bg-card rounded-2xl p-6 shadow-soft border h-fit sticky top-28">
            <h3 className="font-display text-xl font-bold">Order summary</h3>
            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
              {items.map(i => (
                <div key={i.product.id} className="flex gap-3 text-sm">
                  <img src={i.product.image} alt={i.product.name} className="h-14 w-12 rounded object-cover"/>
                  <div className="flex-1">
                    <div className="line-clamp-1 font-medium">{i.product.name}</div>
                    <div className="text-xs text-muted-foreground">Qty {i.qty} · ₹{i.product.price.toLocaleString("en-IN")}</div>
                  </div>
                </div>
              ))}
            </div>
            <dl className="mt-5 space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>₹{subtotal.toLocaleString("en-IN")}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{shipping === 0 ? "Free" : `₹${shipping}`}</dd></div>
              <div className="flex justify-between font-bold pt-2 border-t"><dt>Total</dt><dd>₹{total.toLocaleString("en-IN")}</dd></div>
            </dl>
            <button disabled={placing} type="submit" className="mt-5 w-full bg-primary text-primary-foreground py-3.5 rounded-full font-bold hover:bg-gold-grad hover:text-primary transition disabled:opacity-60">
              {placing ? "Placing order…" : `Place Order · ₹${total.toLocaleString("en-IN")}`}
            </button>
          </aside>
        </form>
      </div>
      <Footer/>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-2xl p-6 shadow-soft">
      <div className="font-display text-lg font-bold flex items-center gap-2 mb-4">{icon}{title}</div>
      {children}
    </div>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`bg-muted/60 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary ${props.className ?? ""}`}/>;
}
