import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Heart, ShoppingBag, User, Sparkles, Menu, LogOut, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth, useCart, useWishlist } from "@/lib/store";
import { products as allProducts, type Product } from "@/lib/products";
import { parseQuery } from "@/lib/search";


export function Navbar() {
  const { user, signOut } = useAuth();
  const { count } = useCart();
  const { items: wishItems } = useWishlist();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  const query = q.trim();
  const { matches, fallback } = useMemo(() => {
    if (!query) return { matches: [] as Product[], fallback: [] as Product[] };
    const { gender, tokens } = parseQuery(query);
    const pool = gender ? allProducts.filter((p) => p.gender === gender) : allProducts;
    const effectiveTokens = tokens.length ? tokens : (gender ? [] : query.toLowerCase().split(/\s+/).filter(Boolean));
    const scored = pool
      .map((p) => {
        const hay = `${p.name} ${p.brand} ${p.category} ${p.occasion.join(" ")}`.toLowerCase();
        const hits = effectiveTokens.length === 0 ? 1 : effectiveTokens.filter((t) => hay.includes(t)).length;
        return { p, hits };
      })
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits || b.p.rating - a.p.rating)
      .slice(0, 6)
      .map((s) => s.p);
    if (scored.length > 0) return { matches: scored, fallback: [] as Product[] };
    // No matches → recommend within gender if given, else top-rated
    const recs = [...(gender ? allProducts.filter((p) => p.gender === gender) : allProducts)]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);
    return { matches: [] as Product[], fallback: recs };
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const qq = q.trim();
    setFocused(false);
    navigate({ to: "/shop", search: qq ? { q: qq } : {} });
  };

  const goProduct = (p: Product) => {
    setFocused(false);
    setQ("");
    navigate({ to: "/shop", search: { q: p.name } });
  };


  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="bg-royal text-primary-foreground text-xs py-1.5 text-center tracking-wide">
        ✦ Free shipping over ₹999 ✦ AI Stylist now live ✦ Festive Edit up to 60% off ✦
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-lg bg-royal flex items-center justify-center shadow-gold">
            <span className="font-display text-gold text-lg font-bold">V</span>
          </div>
          <div className="leading-none">
            <div className="font-display text-2xl font-bold tracking-tight">Vastra<span className="shimmer-text">AI</span></div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hidden sm:block">Couture · Reimagined</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          <Link to="/shop" search={{ gender: "Women" }} className="hover:text-primary transition-colors">Women</Link>
          <Link to="/shop" search={{ gender: "Men" }} className="hover:text-primary transition-colors">Men</Link>
          <Link to="/shop" search={{ occasion: "Wedding" }} className="hover:text-primary transition-colors">Wedding</Link>
          <Link to="/shop" search={{ occasion: "Festival" }} className="hover:text-primary transition-colors">Festive</Link>
          <Link to="/shop" search={{ occasion: "Sangeet" }} className="hover:text-primary transition-colors">Sangeet</Link>
          <Link to="/shop" search={{ occasion: "Reception" }} className="hover:text-primary transition-colors">Reception</Link>
          <Link to="/try-on" className="flex items-center gap-1 text-primary font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> AI Try-On
          </Link>
        </nav>

        <form onSubmit={onSearch} className="flex-1 max-w-xl hidden md:block">
          <div className="relative" ref={boxRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setFocused(true); }}
              onFocus={() => setFocused(true)}
              placeholder="Search for sarees, lehengas, sherwanis…"
              className="pl-9 bg-muted/60 border-transparent focus-visible:bg-card"
            />
            {focused && query && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-popover border border-border rounded-lg shadow-elegant overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                {matches.length > 0 ? (
                  <>
                    <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">Matching products</div>
                    {matches.map((p) => (
                      <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => goProduct(p)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left">
                        <img src={p.image} alt={p.name} className="h-10 w-10 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{p.brand} · {p.category}</div>
                        </div>
                        <div className="text-sm font-semibold">₹{p.price.toLocaleString("en-IN")}</div>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2 text-xs border-b bg-muted/40">
                      <span className="font-semibold">“{q}” isn't available</span>
                      <span className="text-muted-foreground"> — but here are better picks for you:</span>
                    </div>
                    {fallback.map((p) => (
                      <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => goProduct(p)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left">
                        <img src={p.image} alt={p.name} className="h-10 w-10 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">★ {p.rating} · {p.brand}</div>
                        </div>
                        <div className="text-sm font-semibold">₹{p.price.toLocaleString("en-IN")}</div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center gap-1 ml-auto">
          {user ? (
            <div className="hidden md:flex items-center gap-1">
              <Link to="/my-orders" title="My Orders" className="flex flex-col items-center text-[11px] px-2 leading-tight hover:text-primary">
                <User className="h-5 w-5" />
                <span className="max-w-[80px] truncate">{user.user_metadata?.full_name ?? user.email?.split("@")[0]}</span>
              </Link>
              {user.email?.toLowerCase() === "respectkills@gmail.com" && (
                <Link to="/admin" title="Admin" className="p-2 hover:text-primary">
                  <Crown className="h-4 w-4" />
                </Link>
              )}
              <button onClick={signOut} title="Sign out" className="p-2 hover:text-primary"><LogOut className="h-4 w-4" /></button>
            </div>
          ) : (
            <Link to="/auth" className="hidden md:flex flex-col items-center text-[11px] px-3 py-1 hover:text-primary">
              <User className="h-5 w-5" />Login
            </Link>
          )}
          <Link to="/wishlist" className="relative flex flex-col items-center text-[11px] px-3 py-1 hover:text-primary">
            <Heart className="h-5 w-5" />
            {wishItems.length > 0 && (
              <span className="absolute -top-0.5 right-1 h-4 min-w-4 px-1 rounded-full bg-accent text-primary text-[10px] font-bold flex items-center justify-center">{wishItems.length}</span>
            )}
            <span className="hidden md:block">Wishlist</span>
          </Link>
          <Link to="/cart" className="relative flex flex-col items-center text-[11px] px-3 py-1 hover:text-primary">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 right-1 h-4 min-w-4 px-1 rounded-full bg-festive text-primary-foreground text-[10px] font-bold flex items-center justify-center">{count}</span>
            )}
            <span className="hidden md:block">Bag</span>
          </Link>
          <button onClick={() => setMenuOpen((o) => !o)} className="lg:hidden p-2"><Menu className="h-5 w-5" /></button>
        </div>
      </div>
      {menuOpen && (
        <div className="lg:hidden border-t bg-card">
          <div className="flex flex-col p-4 gap-3 text-sm">
            <Link to="/shop" search={{ gender: "Women" }} onClick={() => setMenuOpen(false)}>Women</Link>
            <Link to="/shop" search={{ gender: "Men" }} onClick={() => setMenuOpen(false)}>Men</Link>
            <Link to="/shop" search={{ occasion: "Wedding" }} onClick={() => setMenuOpen(false)}>Wedding</Link>
            <Link to="/try-on" onClick={() => setMenuOpen(false)} className="text-primary font-semibold">AI Try-On</Link>
            <Link to="/my-orders" onClick={() => setMenuOpen(false)}>My Orders</Link>
            <Link to="/order-history" onClick={() => setMenuOpen(false)}>Order History</Link>
            <Link to="/track-order" onClick={() => setMenuOpen(false)}>Track Order</Link>
            {user?.email?.toLowerCase() === "respectkills@gmail.com" && (
              <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-amber-400 font-semibold">
                <Crown className="h-4 w-4 text-amber-400" /> Admin Panel
              </Link>
            )}
            {!user && <Link to="/auth" onClick={() => setMenuOpen(false)}>Login / Sign Up</Link>}
            {user && <button className="text-left" onClick={() => { signOut(); setMenuOpen(false); }}>Sign out</button>}
          </div>
        </div>
      )}
    </header>
  );
}
