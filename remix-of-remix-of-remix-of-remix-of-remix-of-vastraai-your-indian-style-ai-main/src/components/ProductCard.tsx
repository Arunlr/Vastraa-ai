import { Heart, Star, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/products";
import { useCart, useWishlist } from "@/lib/store";

export function ProductCard({ product }: { product: Product }) {
  const off = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const liked = has(product.id);

  return (
    <div className="group relative bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-elegant transition-all duration-500 hover:-translate-y-1">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <button
          type="button"
          onClick={() => toggle(product)}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-card/90 backdrop-blur flex items-center justify-center hover:bg-card hover:scale-110 transition"
        >
          <Heart className={`h-4 w-4 transition ${liked ? "fill-destructive text-destructive" : ""}`} />
        </button>
        <div className="absolute top-3 left-3 bg-festive text-primary-foreground text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{off}% off</div>
        <div className="absolute bottom-0 inset-x-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            type="button"
            onClick={() => add(product)}
            className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2.5 rounded-md hover:bg-gold-grad hover:text-primary flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Quick Add
          </button>
        </div>
      </div>
      <div className="p-3.5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{product.brand}</div>
        <h3 className="text-sm font-medium mt-0.5 line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded text-[11px]">
            <Star className="h-3 w-3 fill-accent text-accent" />
            <span className="font-semibold">{product.rating}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">({product.reviews})</span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-bold text-base">₹{product.price.toLocaleString("en-IN")}</span>
          <span className="text-xs text-muted-foreground line-through">₹{product.mrp.toLocaleString("en-IN")}</span>
          <span className="text-xs font-semibold text-destructive">({off}% OFF)</span>
        </div>
      </div>
    </div>
  );
}
