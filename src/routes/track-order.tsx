import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Package, Truck, CheckCircle2, Sparkles } from "lucide-react";
import { getOrderByTracking, deriveStatus, mapDbOrderToOrder } from "@/lib/orders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/track-order")({
  component: TrackOrder,
  head: () => ({
    meta: [
      { title: "Track Order · VastraAI" },
      { name: "description", content: "Track your VastraAI couture order in real-time, from atelier to your doorstep." },
    ],
  }),
});

const stages = [
  { icon: Sparkles, label: "Order placed" },
  { icon: Package, label: "Crafted & packed" },
  { icon: Truck, label: "Out for delivery" },
  { icon: CheckCircle2, label: "Delivered" },
];

function TrackOrder() {
  const [id, setId] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { stage: number; label: string; tracking: string; orderId: string }>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryVal = id.trim();
    if (!queryVal) return;

    setLoading(true);
    setResult(null);

    // 1. Try local storage first
    const local = getOrderByTracking(queryVal);
    
    // 2. Try Supabase
    try {
      // General broad search on uuid, order_number (case insensitive or matched), or tracking
      let query;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryVal);
      
      if (isUuid) {
        query = supabase.from("orders").select("*, order_items(*)").eq("id", queryVal);
      } else {
        query = supabase
          .from("orders")
          .select("*, order_items(*)")
          .or(`order_number.eq.${queryVal.toUpperCase()},id.eq.${queryVal}`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped = mapDbOrderToOrder(data[0]);
        const s = deriveStatus(mapped);
        setResult({ stage: s.stage, label: s.label, tracking: mapped.tracking, orderId: mapped.id });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Supabase tracking search failed:", err);
    }

    if (local) {
      const s = deriveStatus(local);
      setResult({ stage: s.stage, label: s.label, tracking: local.tracking, orderId: local.id });
    } else {
      toast.error("No order found with that ID or tracking number");
      setResult(null);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 md:px-8 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Support</div>
        <h1 className="font-display text-4xl md:text-6xl font-bold mt-2">Track your order</h1>
        <p className="text-muted-foreground mt-3 max-w-xl">Enter your tracking number or order ID (sent on confirmation) to see live status.</p>

        <div className="mt-4 flex gap-3 text-sm">
          <Link to="/my-orders" className="px-4 py-2 rounded-full border font-semibold hover:bg-muted">My Orders</Link>
          <Link to="/order-history" className="px-4 py-2 rounded-full border font-semibold hover:bg-muted">History</Link>
        </div>

        <form onSubmit={onSubmit} className="mt-8 flex gap-3">
          <input value={id} onChange={e => setId(e.target.value)} placeholder="e.g. VTR-2026-AB12CD34 or VAI12AB34" className="flex-1 rounded-full border px-5 py-3 bg-background" disabled={loading}/>
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:bg-gold-grad hover:text-primary transition" disabled={loading}>
            {loading ? "Searching…" : "Track"}
          </button>
        </form>

        {result && (
          <div className="mt-10 rounded-3xl border bg-card p-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm text-muted-foreground">Order <span className="font-mono">#{result.orderId}</span> · <span className="font-mono">{result.tracking}</span></div>
              <button onClick={() => navigate({ to: "/order/$id", params: { id: result.orderId } })} className="text-sm text-primary hover:underline">View full details →</button>
            </div>
            {result.stage < 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center py-6 text-center bg-red-950/10 border border-red-900/20 rounded-2xl p-6">
                <span className="text-2xl">🚫</span>
                <h3 className="font-display text-xl font-bold text-red-400 mt-2">Order {result.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">This order has been cancelled or returned.</p>
              </div>
            ) : (
              <div className="mt-6 flex justify-between relative">
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted"/>
                <div className="absolute top-5 left-5 h-0.5 bg-gold-grad" style={{ width: `${((result.stage >= 0 ? result.stage : 0) / (stages.length - 1)) * 90}%` }}/>
                {stages.map((s, i) => (
                  <div key={s.label} className="relative flex flex-col items-center gap-2 w-24 text-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${i <= result.stage ? "bg-gold-grad text-primary" : "bg-muted text-muted-foreground"}`}><s.icon className="h-5 w-5"/></div>
                    <div className="text-xs font-semibold">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
