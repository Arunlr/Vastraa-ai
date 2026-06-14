import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useOrders, deriveStatus } from "@/lib/orders";
import { Package, ChevronRight, History } from "lucide-react";

export const Route = createFileRoute("/order-history")({
  component: OrderHistory,
  head: () => ({ meta: [{ title: "Order History · VastraAI" }] }),
});

function OrderHistory() {
  const orders = useOrders();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 md:px-8 py-12">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Your Account</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold mt-2 flex items-center gap-3"><History className="h-8 w-8 text-accent"/>Order History</h1>
        <p className="text-muted-foreground mt-2">A complete archive of every drape you've collected from VastraAI.</p>

        <div className="mt-8 flex gap-3 text-sm">
          <Link to="/my-orders" className="px-4 py-2 rounded-full border font-semibold hover:bg-muted">My Orders</Link>
          <Link to="/order-history" activeProps={{ className: "bg-primary text-primary-foreground" }} className="px-4 py-2 rounded-full border font-semibold">History</Link>
          <Link to="/track-order" className="px-4 py-2 rounded-full border font-semibold hover:bg-muted">Track by ID</Link>
        </div>

        {orders.length === 0 ? (
          <div className="mt-12 text-center bg-card border rounded-3xl p-12">
            <History className="h-12 w-12 mx-auto text-muted-foreground"/>
            <h2 className="font-display text-2xl font-bold mt-4">Nothing here yet</h2>
            <p className="text-muted-foreground mt-2">Your past purchases will live here once delivered.</p>
            <Link to="/shop" className="mt-6 inline-block bg-primary text-primary-foreground px-7 py-3 rounded-full font-semibold">Browse collection</Link>
          </div>
        ) : (
          <div className="mt-8 bg-card border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-4">Order</th>
                  <th className="text-left p-4 hidden sm:table-cell">Date</th>
                  <th className="text-left p-4 hidden md:table-cell">Tracking</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Total</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const s = deriveStatus(o);
                  return (
                    <tr key={o.id} className="border-t hover:bg-muted/30">
                      <td className="p-4 font-semibold">#{o.id}</td>
                      <td className="p-4 hidden sm:table-cell text-muted-foreground">{new Date(o.placedAt).toLocaleDateString()}</td>
                      <td className="p-4 hidden md:table-cell font-mono text-xs text-muted-foreground"><Package className="inline h-3 w-3 mr-1"/>{o.tracking}</td>
                      <td className="p-4"><span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted font-bold">{s.label}</span></td>
                      <td className="p-4 text-right font-semibold">₹{o.total.toLocaleString("en-IN")}</td>
                      <td className="p-4 text-right"><Link to="/order/$id" params={{ id: o.id }} className="text-primary hover:underline inline-flex items-center gap-1">View<ChevronRight className="h-4 w-4"/></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
