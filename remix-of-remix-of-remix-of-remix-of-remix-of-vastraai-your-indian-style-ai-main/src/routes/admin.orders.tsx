import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Btn, Input, Select } from "@/components/admin/AdminShell";
import { StatusPill, Empty } from "./admin.index";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({ component: OrdersAdmin });

const STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"] as const;
type Status = typeof STATUSES[number];

function inr(n: number) { return "₹" + n.toLocaleString("en-IN"); }

function OrdersAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = orders.filter((o) => (filter === "All" || o.status === filter) && (q ? o.id.includes(q.toLowerCase()) : true));

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Order ${status}`);
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-200/40" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order id" className="pl-9" />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as "All" | Status)}>
          <option>All</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-amber-200/60 bg-amber-500/5">
              <tr>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3 hidden md:table-cell">Date</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const addr = (o.shipping_address ?? {}) as Record<string, string>;
                return (
                  <tr key={o.id} className="border-t border-amber-500/5 hover:bg-amber-500/5">
                    <td className="p-3 font-mono text-amber-100">#{o.id.slice(0, 8)}</td>
                    <td className="p-3">
                      <div className="text-amber-100 text-sm">{addr.name ?? "Guest"}</div>
                      <div className="text-[11px] text-amber-200/50">{addr.email ?? addr.phone ?? "—"}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-amber-200/70">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="p-3 text-right text-amber-200">{inr(o.total)}</td>
                    <td className="p-3">
                      <Select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value as Status)} className="text-xs">
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </Select>
                    </td>
                    <td className="p-3 text-right"><button onClick={() => setOpen(o.id)} className="text-amber-300 hover:text-amber-200"><Eye className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && <Empty label="No orders match this view" />}
        </div>
      </Card>

      {open && <OrderDetails id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function OrderDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: async () => {
      const [order, items] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      return { order: order.data, items: items.data ?? [] };
    },
  });

  if (!data?.order) return null;
  const addr = (data.order.shipping_address ?? {}) as Record<string, string>;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-2xl bg-[#13100e] border border-amber-500/20 rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-display text-2xl text-amber-100">Order #{id.slice(0, 8)}</h3>
            <p className="text-xs text-amber-200/50">{new Date(data.order.created_at).toLocaleString()}</p>
          </div>
          <StatusPill status={data.order.status} />
        </div>

        <div className="space-y-3">
          {data.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#0c0a09] border border-amber-500/5">
              {it.product_image && <img src={it.product_image} className="h-14 w-14 rounded object-cover" alt="" />}
              <div className="flex-1">
                <div className="text-sm text-amber-100">{it.product_name}</div>
                <div className="text-xs text-amber-200/50">Qty {it.quantity} · ₹{it.price.toLocaleString("en-IN")}</div>
              </div>
              <div className="text-amber-200 text-sm">₹{(it.price * it.quantity).toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-4 text-xs text-amber-200/70">
          <div>
            <div className="uppercase tracking-wider text-amber-200/50 mb-1">Shipping</div>
            <div>{addr.name}</div>
            <div>{addr.address}</div>
            <div>{addr.city} {addr.pincode}</div>
            <div>{addr.phone}</div>
          </div>
          <div>
            <div className="uppercase tracking-wider text-amber-200/50 mb-1">Payment</div>
            <div>{data.order.payment_method ?? "—"}</div>
            <div className="mt-2 font-display text-amber-100 text-lg">Total: ₹{data.order.total.toLocaleString("en-IN")}</div>
          </div>
        </div>

        <div className="flex justify-end mt-6"><Btn variant="ghost" onClick={onClose}>Close</Btn></div>
      </div>
    </div>
  );
}
