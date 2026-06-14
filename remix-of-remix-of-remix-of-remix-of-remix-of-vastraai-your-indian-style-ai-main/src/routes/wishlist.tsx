import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { useWishlist } from "@/lib/store";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/wishlist")({
  component: Wishlist,
  head: () => ({ meta: [{ title: "Wishlist · VastraAI" }] }),
});

function Wishlist() {
  const { items } = useWishlist();
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-10">
        <h1 className="font-display text-4xl font-bold">Your Wishlist</h1>
        <p className="text-muted-foreground mt-1">{items.length} saved styles, ready when you are.</p>

        {items.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="h-20 w-20 rounded-full bg-secondary mx-auto flex items-center justify-center">
              <Heart className="h-9 w-9 text-muted-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold mt-4">Nothing saved yet</h2>
            <p className="text-muted-foreground mt-1">Tap the heart on any piece you love.</p>
            <Link to="/shop" className="mt-6 inline-block bg-primary text-primary-foreground px-7 py-3 rounded-full font-semibold hover:bg-gold-grad hover:text-primary transition">
              Discover Couture
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
