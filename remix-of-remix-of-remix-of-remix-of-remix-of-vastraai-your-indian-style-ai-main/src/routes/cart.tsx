import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Trash2, Tag, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  component: Cart,
  head: () => ({ meta: [{ title: "Bag · VastraAI" }] }),
});

const SIZES = ["XS", "S", "M", "L", "XL"];

function Cart() {
  const { items, remove, setQty, setSize, subtotal } = useCart();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);

  const saved = items.reduce((s, i) => s + (i.product.mrp - i.product.price) * i.qty, 0);
  const shipping = subtotal > 999 || subtotal === 0 ? 0 : 99;
  const total = Math.max(0, subtotal - discount) + shipping;

  const applyCoupon = () => {
    const c = coupon.trim().toUpperCase();
    if (c === "FESTIVE26") {
      const d = Math.round(subtotal * 0.1);
      setDiscount(d);
      toast.success(`Coupon applied · ₹${d.toLocaleString("en-IN")} off`);
    } else if (!c) {
      toast.error("Enter a coupon code");
    } else {
      toast.error("Invalid coupon");
      setDiscount(0);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <div className="h-20 w-20 rounded-full bg-secondary mx-auto flex items-center justify-center">
            <ShoppingBag className="h-9 w-9 text-muted-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold mt-6">Your bag is empty</h1>
          <p className="text-muted-foreground mt-2">Let's find something beautiful for you.</p>
          <Link to="/shop" className="mt-6 inline-block bg-primary text-primary-foreground px-7 py-3 rounded-full font-semibold hover:bg-gold-grad hover:text-primary transition">
            Browse Collection
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-10">
        <h1 className="font-display text-4xl font-bold">
          Your Bag <span className="text-muted-foreground text-lg font-sans">({items.length} items)</span>
        </h1>
        <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-4">
            {items.map((it) => (
              <div key={it.product.id} className="bg-card rounded-2xl p-4 flex gap-4 shadow-soft border border-border">
                <img src={it.product.image} alt={it.product.name} className="h-32 w-24 object-cover rounded-lg" />
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{it.product.brand}</div>
                  <div className="font-medium">{it.product.name}</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-bold">₹{it.product.price.toLocaleString("en-IN")}</span>
                    <span className="text-xs text-muted-foreground line-through">₹{it.product.mrp.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <select
                      value={it.qty}
                      onChange={(e) => setQty(it.product.id, +e.target.value)}
                      className="bg-muted rounded px-2 py-1 text-xs"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>Qty: {n}</option>
                      ))}
                    </select>
                    <select
                      value={it.size}
                      onChange={(e) => setSize(it.product.id, e.target.value)}
                      className="bg-muted rounded px-2 py-1 text-xs"
                    >
                      {SIZES.map((s) => (
                        <option key={s} value={s}>Size: {s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => { remove(it.product.id); toast("Removed from bag"); }}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="bg-card rounded-2xl p-6 shadow-soft border border-border h-fit sticky top-28">
            <div className="flex items-center gap-2 bg-secondary/60 rounded-lg p-2 text-sm">
              <Tag className="h-4 w-4 text-accent" />
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="FESTIVE26"
                className="flex-1 bg-transparent outline-none text-xs"
              />
              <button onClick={applyCoupon} className="text-primary font-semibold text-xs hover:underline">Apply</button>
            </div>
            <h3 className="font-display text-xl font-bold mt-5">Order summary</h3>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row k="Subtotal" v={`₹${subtotal.toLocaleString("en-IN")}`} />
              <Row k="You save" v={`-₹${saved.toLocaleString("en-IN")}`} accent />
              {discount > 0 && <Row k="Coupon" v={`-₹${discount.toLocaleString("en-IN")}`} accent />}
              <Row k="Shipping" v={shipping === 0 ? "Free" : `₹${shipping}`} />
              <div className="h-px bg-border my-2" />
              <Row k="Total" v={`₹${total.toLocaleString("en-IN")}`} bold />
            </dl>
            <Link
              to="/checkout"
              className="mt-5 block text-center bg-primary text-primary-foreground py-3.5 rounded-full font-bold hover:bg-gold-grad hover:text-primary transition"
            >
              Proceed to Checkout
            </Link>
            <div className="mt-3 text-[11px] text-muted-foreground text-center">Free shipping over ₹999 · COD · 7-day returns</div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Row({ k, v, accent, bold }: { k: string; v: string; accent?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? "font-bold" : "text-muted-foreground"}>{k}</dt>
      <dd className={`${accent ? "text-accent font-semibold" : ""} ${bold ? "font-bold text-base" : ""}`}>{v}</dd>
    </div>
  );
}
