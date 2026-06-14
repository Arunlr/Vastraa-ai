import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import type { Product } from "@/lib/products";

// ----- Auth -----
type AuthCtx = {
  user: User | null;
  session: Session | null;
  ready: boolean;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthCtx>({ user: null, session: null, ready: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        ready,
        signOut: async () => {
          await supabase.auth.signOut();
          toast.success("Signed out");
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);

// ----- Cart -----
export type CartItem = { product: Product; qty: number; size: string };
type CartCtx = {
  items: CartItem[];
  add: (p: Product, size?: string) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  setSize: (id: string, size: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};
const CartContext = createContext<CartCtx | null>(null);

function useLocalArray<T>(key: string) {
  const [val, setVal] = useState<T[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setVal(JSON.parse(raw));
    } catch {}
  }, [key]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalArray<CartItem>("vastra.cart");

  const add: CartCtx["add"] = (p, size = "M") => {
    setItems((cur) => {
      const i = cur.find((c) => c.product.id === p.id);
      if (i) return cur.map((c) => (c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c));
      return [...cur, { product: p, qty: 1, size }];
    });
    toast.success(`Added "${p.name}" to bag`);
  };

  const remove: CartCtx["remove"] = (id) => setItems((c) => c.filter((i) => i.product.id !== id));
  const setQty: CartCtx["setQty"] = (id, qty) =>
    setItems((c) => c.map((i) => (i.product.id === id ? { ...i, qty: Math.max(1, qty) } : i)));
  const setSize: CartCtx["setSize"] = (id, size) =>
    setItems((c) => c.map((i) => (i.product.id === id ? { ...i, size } : i)));
  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, setQty, setSize, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}
export const useCart = () => {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside provider");
  return c;
};

// ----- Wishlist -----
type WishCtx = {
  ids: string[];
  items: Product[];
  toggle: (p: Product) => void;
  has: (id: string) => boolean;
};
const WishContext = createContext<WishCtx | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalArray<Product>("vastra.wishlist");
  const toggle: WishCtx["toggle"] = (p) => {
    setItems((cur) => {
      const exists = cur.some((i) => i.id === p.id);
      if (exists) {
        toast("Removed from wishlist");
        return cur.filter((i) => i.id !== p.id);
      }
      toast.success("Saved to wishlist ♥");
      return [...cur, p];
    });
  };
  return (
    <WishContext.Provider
      value={{ items, ids: items.map((i) => i.id), toggle, has: (id) => items.some((i) => i.id === id) }}
    >
      {children}
    </WishContext.Provider>
  );
}
export const useWishlist = () => {
  const c = useContext(WishContext);
  if (!c) throw new Error("useWishlist outside provider");
  return c;
};
