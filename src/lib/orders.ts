import { useEffect, useState } from "react";
import type { CartItem } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export type OrderStatus = "placed" | "packed" | "shipped" | "delivered" | "cancelled" | "returned" | string;

export type Order = {
  id: string;
  tracking: string;
  userEmail: string | null;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  address: {
    name: string;
    phone: string;
    line: string;
    city: string;
    pin: string;
  };
  payment: string;
  placedAt: number;
  status: OrderStatus;
  estimatedDelivery: number;
  carrier: string;
};

const KEY = "vastra.orders";

function read(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function write(orders: Order[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event("vastra.orders.changed"));
  } catch {}
}

export function makeOrderId() {
  return "VAI" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function makeTracking() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VTR-${new Date().getFullYear()}-${part()}${part()}`;
}

export function saveOrder(o: Order) {
  const all = read();
  all.unshift(o);
  write(all);
}

export function mapDbOrderToOrder(dbo: any): Order {
  let mappedStatus: OrderStatus = "placed";
  const rawStatus = (dbo.status || "").toLowerCase();
  if (rawStatus === "pending" || rawStatus === "confirmed") {
    mappedStatus = "placed";
  } else if (rawStatus === "processing") {
    mappedStatus = "packed";
  } else if (rawStatus === "shipped") {
    mappedStatus = "shipped";
  } else if (rawStatus === "delivered") {
    mappedStatus = "delivered";
  } else if (rawStatus === "cancelled") {
    mappedStatus = "cancelled";
  } else if (rawStatus === "returned") {
    mappedStatus = "returned";
  }

  // Parse items
  const items: CartItem[] = (dbo.order_items || []).map((oi: any) => ({
    product: {
      id: oi.product_id,
      name: oi.product_name,
      brand: "",
      price: oi.price,
      mrp: oi.price,
      image: oi.product_image || "/placeholder.jpg",
      category: "",
      gender: "",
      occasion: [],
      rating: 4.5,
      reviews: 0
    },
    qty: oi.quantity || 1,
    size: oi.size || "M"
  }));

  // Parse address
  const addr = typeof dbo.shipping_address === "string" 
    ? JSON.parse(dbo.shipping_address) 
    : (dbo.shipping_address || {});

  return {
    id: dbo.id,
    tracking: dbo.order_number || "VAI-" + dbo.id.substring(0, 8).toUpperCase(),
    userEmail: addr.email || null,
    items,
    subtotal: dbo.total,
    shipping: dbo.total > 999 ? 0 : 99,
    total: dbo.total,
    address: {
      name: addr.name || "",
      phone: addr.phone || "",
      line: addr.address || addr.line || "",
      city: addr.city || "",
      pin: addr.pincode || addr.pin || ""
    },
    payment: dbo.payment_method || "UPI",
    placedAt: new Date(dbo.created_at || Date.now()).getTime(),
    status: mappedStatus,
    estimatedDelivery: new Date(dbo.created_at || Date.now()).getTime() + 4 * 24 * 60 * 60 * 1000,
    carrier: "VastraExpress"
  };
}

export function getOrder(id: string): Order | null {
  return read().find((o) => o.id === id) ?? null;
}

export function getOrderByTracking(t: string): Order | null {
  const q = t.trim().toUpperCase();
  return read().find((o) => o.tracking.toUpperCase() === q || o.id.toUpperCase() === q) ?? null;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Load local storage first
    const local = read();
    setOrders(local);

    let active = true;

    async function syncSupabaseOrders() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !active) return;

        const { data: dbOrders, error } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to sync orders from DB:", error);
          return;
        }

        if (dbOrders && active) {
          const mapped = dbOrders.map(mapDbOrderToOrder);
          setOrders((prev) => {
            const merged = [...mapped];
            for (const l of prev) {
              if (!merged.some((m) => m.id === l.id)) {
                merged.push(l);
              }
            }
            return merged.sort((a, b) => b.placedAt - a.placedAt);
          });
        }
      } catch (err) {
        console.error("Auth / order sync exception:", err);
      }
    }

    syncSupabaseOrders();

    const refresh = () => {
      setOrders(read());
      syncSupabaseOrders();
    };

    window.addEventListener("vastra.orders.changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      active = false;
      window.removeEventListener("vastra.orders.changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return orders;
}

// Status auto-progresses with time so the timeline feels alive.
export function deriveStatus(o: Order): { stage: number; label: string } {
  const stages = ["Order placed", "Crafted & packed", "Out for delivery", "Delivered"];
  
  if (o.status === "cancelled") {
    return { stage: -1, label: "Cancelled" };
  }
  if (o.status === "returned") {
    return { stage: -2, label: "Returned" };
  }

  // Explicit status mappings
  if (o.status === "placed") return { stage: 0, label: stages[0] };
  if (o.status === "packed") return { stage: 1, label: stages[1] };
  if (o.status === "shipped") return { stage: 2, label: stages[2] };
  if (o.status === "delivered") return { stage: 3, label: stages[3] };

  // Fallback to elapsed time
  const elapsed = Date.now() - o.placedAt;
  const hour = 1000 * 60 * 60;
  let stage = 0;
  if (elapsed > hour * 24) stage = 3;
  else if (elapsed > hour * 12) stage = 2;
  else if (elapsed > hour * 2) stage = 1;
  return { stage, label: stages[stage] };
}
