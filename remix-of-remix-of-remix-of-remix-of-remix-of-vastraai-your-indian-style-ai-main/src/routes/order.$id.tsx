import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getOrder, deriveStatus, type Order } from "@/lib/orders";
import { Package, Truck, CheckCircle2, Sparkles, MapPin, Copy, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/order/$id")({
  component: OrderDetail,
  head: ({ params }) => ({ meta: [{ title: `Order #${params.id} · VastraAI` }] }),
});

const stages = [
  { icon: Sparkles, label: "Order placed", desc: "We've received your order" },
  { icon: Package, label: "Crafted & packed", desc: "Artisans are preparing your couture" },
  { icon: Truck, label: "Out for delivery", desc: "On its way to your doorstep" },
  { icon: CheckCircle2, label: "Delivered", desc: "Enjoy your VastraAI couture" },
];

function OrderDetail() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    setOrder(getOrder(id));
  }, [id]);

  if (order === undefined) {
    return (
      <div className="min-h-screen"><Navbar/><div className="p-20 text-center text-muted-foreground">Loading…</div></div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen">
        <Navbar/>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Order not found</h1>
          <p className="text-muted-foreground mt-2">We couldn't find order #{id} on this device.</p>
          <Link to="/my-orders" className="mt-6 inline-block bg-primary text-primary-foreground px-7 py-3 rounded-full font-semibold">Back to My Orders</Link>
        </div>
        <Footer/>
      </div>
    );
  }

  const status = deriveStatus(order);
  const copy = () => { navigator.clipboard?.writeText(order.tracking); toast.success("Tracking number copied"); };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 md:px-8 py-10">
        <Link to="/my-orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4"/>Back to my orders</Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Order</div>
            <h1 className="font-display text-4xl font-bold mt-1">#{order.id}</h1>
            <div className="text-sm text-muted-foreground mt-1">Placed {new Date(order.placedAt).toLocaleString()}</div>
          </div>
          <div className="bg-card border rounded-2xl p-4 min-w-[240px]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Tracking number</div>
            <div className="flex items-center justify-between mt-1 gap-3">
              <div className="font-mono text-lg font-bold">{order.tracking}</div>
              <button onClick={copy} className="p-1.5 hover:text-primary" title="Copy"><Copy className="h-4 w-4"/></button>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Carrier: {order.carrier}</div>
          </div>
        </div>

        <section className="mt-10 bg-card border rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-xl font-bold">Live tracking</h2>
            <div className="text-sm text-muted-foreground">ETA {new Date(order.estimatedDelivery).toLocaleDateString()}</div>
          </div>
          <div className="mt-8 flex justify-between relative">
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted"/>
            <div className="absolute top-5 left-5 h-0.5 bg-gold-grad transition-all" style={{ width: `calc(${(status.stage / (stages.length - 1)) * 100}% - ${status.stage === stages.length-1 ? '40px' : '0px'})` }}/>
            {stages.map((s, i) => (
              <div key={s.label} className="relative flex flex-col items-center gap-2 w-1/4 text-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center transition ${i <= status.stage ? "bg-gold-grad text-primary shadow-gold" : "bg-muted text-muted-foreground"}`}><s.icon className="h-5 w-5"/></div>
                <div className="text-xs font-semibold">{s.label}</div>
                <div className="text-[10px] text-muted-foreground hidden sm:block">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 grid md:grid-cols-[1fr_320px] gap-6">
          <section className="bg-card border rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold mb-4">Items ({order.items.length})</h3>
            <div className="space-y-4">
              {order.items.map((i) => (
                <div key={i.product.id} className="flex gap-4">
                  <img src={i.product.image} alt={i.product.name} className="h-20 w-16 rounded-lg object-cover"/>
                  <div className="flex-1">
                    <div className="font-semibold">{i.product.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">Size {i.size} · Qty {i.qty}</div>
                  </div>
                  <div className="font-semibold">₹{(i.product.price * i.qty).toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="bg-card border rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-3"><MapPin className="h-4 w-4 text-accent"/>Shipping to</h3>
              <div className="text-sm space-y-1">
                <div className="font-semibold">{order.address.name}</div>
                <div className="text-muted-foreground">{order.address.line}</div>
                <div className="text-muted-foreground">{order.address.city} - {order.address.pin}</div>
                <div className="text-muted-foreground">{order.address.phone}</div>
              </div>
            </div>
            <div className="bg-card border rounded-2xl p-6 text-sm space-y-2">
              <h3 className="font-display text-lg font-bold mb-2">Summary</h3>
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{order.subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{order.shipping === 0 ? "Free" : `₹${order.shipping}`}</span></div>
              <div className="flex justify-between font-bold pt-2 border-t"><span>Total</span><span>₹{order.total.toLocaleString("en-IN")}</span></div>
              <div className="text-xs text-muted-foreground pt-2">Paid via {order.payment}</div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
