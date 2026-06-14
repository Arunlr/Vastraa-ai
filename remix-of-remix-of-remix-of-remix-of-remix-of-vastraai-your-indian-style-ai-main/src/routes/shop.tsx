import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { AIChatWidget } from "@/components/AIChatWidget";
import { products, occasions, categories } from "@/lib/products";
import { parseQuery } from "@/lib/search";
import { SlidersHorizontal } from "lucide-react";

type Search = { gender?: "Women" | "Men"; occasion?: string; category?: string; q?: string };

export const Route = createFileRoute("/shop")({
  component: Shop,
  validateSearch: (s: Record<string, unknown>): Search => ({
    gender: s.gender === "Men" || s.gender === "Women" ? s.gender : undefined,
    occasion: typeof s.occasion === "string" ? s.occasion : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({ meta: [{ title: "Shop · VastraAI" }] }),
});

function Shop() {
  const search = Route.useSearch();
  const [gender, setGender] = useState<string | undefined>(search.gender);
  const [occ, setOcc] = useState<string | undefined>(search.occasion);
  const [cat, setCat] = useState<string | undefined>(search.category);
  const [maxPrice, setMaxPrice] = useState(30000);
  const parsed = useMemo(() => parseQuery(search.q ?? ""), [search.q]);
  const effectiveGender = gender ?? parsed.gender;

  const filtered = useMemo(() => products.filter(p => {
    if (effectiveGender && p.gender !== effectiveGender) return false;
    if (occ && !p.occasion.includes(occ)) return false;
    if (cat && p.category !== cat) return false;
    if (p.price > maxPrice) return false;
    if (parsed.tokens.length) {
      const hay = `${p.name} ${p.brand} ${p.category} ${p.occasion.join(" ")}`.toLowerCase();
      for (const tok of parsed.tokens) if (!hay.includes(tok)) return false;
    }
    return true;
  }), [effectiveGender, occ, cat, maxPrice, parsed]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-secondary/40 border-b">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold">{search.q ? `Results for “${search.q}”` : occ ? `${occ} Collection` : cat ? `${cat}s` : effectiveGender ? `${effectiveGender}'s Edit` : "All Couture"}</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} curated styles</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8 py-8 grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-6">
          <div className="flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4"/> Filters</div>

          <FilterGroup title="Gender">
            {["Women", "Men"].map(g => (
              <Chip key={g} active={gender === g} onClick={() => setGender(gender === g ? undefined : g)}>{g}</Chip>
            ))}
          </FilterGroup>

          <FilterGroup title="Category">
            {categories.map(c => (
              <Chip key={c.name} active={cat === c.name.slice(0,-1)} onClick={() => setCat(cat === c.name.slice(0,-1) ? undefined : c.name.slice(0,-1))}>{c.name}</Chip>
            ))}
          </FilterGroup>

          <FilterGroup title="Occasion">
            {occasions.map(o => (
              <Chip key={o} active={occ === o} onClick={() => setOcc(occ === o ? undefined : o)}>{o}</Chip>
            ))}
          </FilterGroup>

          <div>
            <div className="text-sm font-semibold mb-2">Max Price: ₹{maxPrice.toLocaleString("en-IN")}</div>
            <input type="range" min={2000} max={30000} step={1000} value={maxPrice} onChange={e => setMaxPrice(+e.target.value)} className="w-full accent-primary"/>
          </div>
        </aside>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {filtered.map((p, i) => (
            <div key={p.id} className="animate-float-up" style={{ animationDelay: `${i * 50}ms` }}>
              <ProductCard product={p}/>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-20 text-muted-foreground">No products match your filters.</div>
          )}
        </div>
      </div>
      <Footer />
      <AIChatWidget />
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary"}`}>{children}</button>
  );
}
