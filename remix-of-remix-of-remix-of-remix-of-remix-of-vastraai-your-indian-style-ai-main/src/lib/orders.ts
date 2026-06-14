import { useEffect, useState } from "react";
import type { CartItem } from "@/lib/store";

export type OrderStatus = "placed" | "packed" | "shipped" | "delivered";

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
    setOrders(read());
    const refresh = () => setOrders(read());
    window.addEventListener("vastra.orders.changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("vastra.orders.changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return orders;
}

// Status auto-progresses with time so the timeline feels alive.
export function deriveStatus(o: Order): { stage: number; label: string } {
  const stages = ["Order placed", "Crafted & packed", "Out for delivery", "Delivered"];
  const elapsed = Date.now() - o.placedAt;
  const hour = 1000 * 60 * 60;
  let stage = 0;
  if (elapsed > hour * 24) stage = 3;
  else if (elapsed > hour * 12) stage = 2;
  else if (elapsed > hour * 2) stage = 1;
  return { stage, label: stages[stage] };
}
