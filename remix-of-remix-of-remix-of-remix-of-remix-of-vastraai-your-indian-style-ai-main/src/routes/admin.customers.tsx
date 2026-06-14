import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Input } from "@/components/admin/AdminShell";
import { Empty } from "./admin.index";

export const Route = createFileRoute("/admin/customers")({ component: CustomersAdmin });

function CustomersAdmin() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<{ id: string; email: string | null; name: string | null } | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const [profiles, orders] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, phone, created_at").order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id, total"),
      ]);
      const stats = new Map<string, { orders: number; spend: number }>();
      for (const o of orders.data ?? []) {
        if (!o.user_id) continue;
        const c = stats.get(o.user_id) ?? { orders: 0, spend: 0 };
        c.orders += 1;
        c.spend += o.total;
        stats.set(o.user_id, c);
      }
      return (profiles.data ?? []).map((p) => ({ ...p, ...stats.get(p.id) ?? { orders: 0, spend: 0 } }));
    },
  });

  const filtered = customers.filter((c) => q ? (c.email ?? "").toLowerCase().includes(q.toLowerCase()) || (c.full_name ?? "").toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-200/40" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="pl-9" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-amber-200/60 bg-amber-500/5">
              <tr>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3 hidden md:table-cell">Joined</th>
                <th className="text-right p-3">Orders</th>
                <th className="text-right p-3">Spend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => setOpen({ id: c.id, email: c.email, name: c.full_name })} className="border-t border-amber-500/5 hover:bg-amber-500/5 cursor-pointer">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-amber-500/15 grid place-items-center"><UserIcon className="h-4 w-4 text-amber-300" /></div>
                      <div>
                        <div className="text-amber-100">{c.full_name ?? "—"}</div>
                        <div className="text-[11px] text-amber-200/50">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-amber-200/70 hidden md:table-cell">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right text-amber-100">{c.orders}</td>
                  <td className="p-3 text-right text-amber-200">₹{c.spend.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty label="No customers yet" />}
        </div>
      </Card>

      {open && <CustomerDetail customer={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CustomerDetail({ customer, onClose }: { customer: { id: string; email: string | null; name: string | null }; onClose: () => void }) {
  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "customer-orders", customer.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, total, status, created_at").eq("user_id", customer.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-xl bg-[#13100e] border border-amber-500/20 rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
        <h3 className="font-display text-2xl text-amber-100">{customer.name ?? "Customer"}</h3>
        <p className="text-sm text-amber-200/60">{customer.email}</p>
        <div className="mt-5 space-y-2">
          <div className="text-xs uppercase tracking-wider text-amber-200/60">Purchase History</div>
          {orders.map((o) => (
            <div key={o.id} className="flex justify-between items-center p-3 rounded-lg bg-[#0c0a09] border border-amber-500/5">
              <div>
                <div className="text-sm text-amber-100 font-mono">#{o.id.slice(0, 8)}</div>
                <div className="text-[11px] text-amber-200/50">{new Date(o.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-amber-200">₹{o.total.toLocaleString("en-IN")}</div>
                <div className="text-[10px] uppercase tracking-wider text-amber-200/60">{o.status}</div>
              </div>
            </div>
          ))}
          {orders.length === 0 && <div className="text-sm text-amber-200/40 text-center py-6">No orders yet</div>}
        </div>
        <div className="flex justify-end mt-6"><button onClick={onClose} className="text-sm text-amber-300 hover:text-amber-200">Close</button></div>
      </div>
    </div>
  );
}
