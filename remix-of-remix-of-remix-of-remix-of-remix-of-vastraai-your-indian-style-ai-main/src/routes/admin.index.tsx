import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Users, IndianRupee, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, StatCard } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const [products, orders, profiles, ai, recent, items] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total, status, created_at"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("ai_usage").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, status, created_at, user_id, shipping_address").order("created_at", { ascending: false }).limit(8),
        supabase.from("order_items").select("product_id, product_name, product_image, quantity, price"),
      ]);
      const totalRevenue = (orders.data ?? []).filter((o) => o.status !== "Cancelled").reduce((s, o) => s + (o.total ?? 0), 0);
      const top = new Map<string, { name: string; image: string; qty: number; revenue: number }>();
      for (const it of items.data ?? []) {
        const cur = top.get(it.product_id) ?? { name: it.product_name, image: it.product_image, qty: 0, revenue: 0 };
        cur.qty += it.quantity;
        cur.revenue += it.price * it.quantity;
        top.set(it.product_id, cur);
      }
      return {
        products: products.count ?? 0,
        orders: orders.data?.length ?? 0,
        customers: profiles.count ?? 0,
        ai: ai.count ?? 0,
        revenue: totalRevenue,
        recent: recent.data ?? [],
        top: [...top.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Revenue" value={inr(data?.revenue ?? 0)} icon={IndianRupee} accent="from-amber-500/25 to-amber-500/0" />
        <StatCard label="Orders" value={data?.orders ?? 0} icon={ShoppingBag} accent="from-yellow-500/20 to-yellow-500/0" />
        <StatCard label="Products" value={data?.products ?? 0} icon={Package} accent="from-amber-400/20 to-amber-400/0" />
        <StatCard label="Customers" value={data?.customers ?? 0} icon={Users} accent="from-rose-500/15 to-rose-500/0" />
        <StatCard label="AI Recommendations" value={data?.ai ?? 0} icon={Sparkles} accent="from-fuchsia-500/15 to-fuchsia-500/0" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-amber-100">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-amber-300 hover:text-amber-200">View all →</Link>
          </div>
          <div className="space-y-2">
            {(data?.recent ?? []).map((o) => {
              const addr = (o.shipping_address ?? {}) as Record<string, string>;
              return (
                <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0c0a09] border border-amber-500/5">
                  <div>
                    <div className="text-sm text-amber-100">{addr.name ?? "Guest"}</div>
                    <div className="text-[11px] text-amber-200/50 font-mono">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-200">{inr(o.total)}</div>
                    <StatusPill status={o.status} />
                  </div>
                </div>
              );
            })}
            {(!data?.recent || data.recent.length === 0) && <Empty label="No orders yet" />}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-amber-100">Top Selling</h3>
            <TrendingUp className="h-4 w-4 text-amber-300" />
          </div>
          <div className="space-y-3">
            {(data?.top ?? []).map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-amber-500/10 overflow-hidden grid place-items-center">
                  {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-amber-300/50" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-amber-100 truncate">{p.name}</div>
                  <div className="text-xs text-amber-200/50">{p.qty} sold · {inr(p.revenue)}</div>
                </div>
              </div>
            ))}
            {(!data?.top || data.top.length === 0) && <Empty label="No sales data yet" />}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    Processing: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    Shipped: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
    Delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    Cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${styles[status] ?? styles.Pending}`}>{status}</span>;
}

export function Empty({ label }: { label: string }) {
  return <div className="text-center text-sm text-amber-200/40 py-6">{label}</div>;
}
