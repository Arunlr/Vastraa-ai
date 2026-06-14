import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useOrders, deriveStatus } from "@/lib/orders";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/my-orders")({
  component: MyOrders,
  head: () => ({ meta: [{ title: "My Orders · VastraAI" }] }),
});

function MyOrders() {
  const orders = useOrders();
  const active = orders.filter((o) => deriveStatus(o).stage < 3);
  const past = orders.filter((o) => deriveStatus(o).stage === 3);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 md:px-8 py-12">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Your Account</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold mt-2">My Orders</h1>
        <p className="text-muted-foreground mt-2">Track, review and re-order your VastraAI couture.</p>

        <div className="mt-8 flex gap-3 text-sm">
          <Link to="/my-orders" activeProps={{ className: "bg-primary text-primary-foreground" }} className="px-4 py-2 rounded-full border font-semibold">All ({orders.length})</Link>
          <Link to="/order-history" className="px-4 py-2 rounded-full border font-semibold hover:bg-muted">History ({past.length})</Link>
          <Link to="/track-order" className="px-4 py-2 rounded-full border font-semibold hover:bg-muted">Track by ID</Link>
        </div>

        {orders.length === 0 ? (
          <div className="mt-12 text-center bg-card border rounded-3xl p-12">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground"/>
            <h2 className="font-display text-2xl font-bold mt-4">No orders yet</h2>
            <p className="text-muted-foreground mt-2">When you place an order, it'll appear here with live tracking.</p>
            <Link to="/shop" className="mt-6 inline-block bg-primary text-primary-foreground px-7 py-3 rounded-full font-semibold">Start shopping</Link>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {active.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold mb-3">In progress</h2>
                <div className="space-y-3">{active.map((o) => <OrderRow key={o.id} order={o}/>)}</div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold mb-3">Delivered</h2>
                <div className="space-y-3">{past.map((o) => <OrderRow key={o.id} order={o}/>)}</div>
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function OrderRow({ order }: { order: ReturnType<typeof useOrders>[number] }) {
  const status = deriveStatus(order);
  return (
    <Link to="/order/$id" params={{ id: order.id }} className="flex items-center gap-4 bg-card border rounded-2xl p-4 hover:border-primary transition">
      <div className="flex -space-x-3">
        {order.items.slice(0, 3).map((i) => (
          <img key={i.product.id} src={i.product.image} alt={i.product.name} className="h-14 w-12 rounded-lg object-cover border-2 border-card"/>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">#{order.id}</span>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold-grad text-primary font-bold">{status.label}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date(order.placedAt).toLocaleDateString()} · {order.items.length} item{order.items.length>1?"s":""} · ₹{order.total.toLocaleString("en-IN")}
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1"><Package className="h-3 w-3"/>{order.tracking}</div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground"/>
    </Link>
  );
}
