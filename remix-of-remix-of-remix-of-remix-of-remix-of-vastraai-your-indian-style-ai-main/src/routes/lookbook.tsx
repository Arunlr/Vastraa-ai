import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { products } from "@/lib/products";
import { resolveImage } from "@/lib/product-images";

export const Route = createFileRoute("/lookbook")({
  component: Lookbook,
  head: () => ({
    meta: [
      { title: "Lookbook · VastraAI" },
      { name: "description", content: "A visual journal of India's most coveted couture moments, styled by VastraAI." },
      { property: "og:title", content: "Lookbook · VastraAI" },
      { property: "og:description", content: "Editorial inspiration from our master karigars and designers." },
    ],
  }),
});

function Lookbook() {
  const editorial = products.slice(0, 18);
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 md:px-8 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Editorial</div>
        <h1 className="font-display text-5xl md:text-7xl font-bold mt-2">The Lookbook</h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-lg">A curated visual journal — couture moments captured for your inspiration.</p>

        <div className="mt-10 columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {editorial.map((p, i) => (
            <Link key={p.id} to="/shop" className="block break-inside-avoid rounded-2xl overflow-hidden shadow-soft group relative">
              <img src={resolveImage(p)} alt={p.name} loading="lazy" className={`w-full object-cover group-hover:scale-105 transition duration-700 ${i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-square" : "aspect-[4/5]"}`}/>
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-primary/90 to-transparent text-primary-foreground">
                <div className="font-display text-sm">{p.brand}</div>
                <div className="text-[11px] opacity-80">{p.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
