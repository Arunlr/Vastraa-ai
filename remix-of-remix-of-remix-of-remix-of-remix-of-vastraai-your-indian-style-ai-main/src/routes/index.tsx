import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Sparkles, Wand2, Star } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { AIChatWidget } from "@/components/AIChatWidget";
import { products, categories } from "@/lib/products";
import heroWomen from "@/assets/hero-women.jpg";
import heroMen from "@/assets/hero-men.jpg";
import festival from "@/assets/festival-banner.jpg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "VastraAI · AI-Powered Indian Couture & Festive Fashion" },
      { name: "description", content: "Discover handpicked lehengas, sarees, sherwanis & more — styled for you by AI. Virtual try-on, occasion-based picks, and India's finest brands." },
    ],
  }),
});

function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 md:py-16 grid lg:grid-cols-2 gap-10 items-center">
            <div className="animate-float-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3 w-3 text-accent"/> Festive Edit · 2026
              </div>
              <h1 className="mt-5 text-5xl md:text-7xl font-display font-bold leading-[0.95]">
                Couture<br/>that <span className="shimmer-text italic">knows</span> you.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-md">
                Upload a photo. Let our AI read your body, skin tone & vibe — then drape you in India's most coveted weaves.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/try-on" className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full font-semibold hover:bg-gold-grad hover:text-primary transition shadow-elegant">
                  <Camera className="h-4 w-4"/> Try AI Stylist
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition"/>
                </Link>
                <Link to="/shop" className="inline-flex items-center gap-2 border-2 border-primary text-primary px-7 py-3.5 rounded-full font-semibold hover:bg-primary hover:text-primary-foreground transition">
                  Shop Collection
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-6 text-sm">
                <div><div className="font-display text-2xl font-bold">2M+</div><div className="text-muted-foreground text-xs">Happy patrons</div></div>
                <div className="h-10 w-px bg-border"/>
                <div><div className="font-display text-2xl font-bold">500+</div><div className="text-muted-foreground text-xs">Designer labels</div></div>
                <div className="h-10 w-px bg-border"/>
                <div><div className="font-display text-2xl font-bold flex items-center gap-1">4.9 <Star className="h-4 w-4 fill-accent text-accent"/></div><div className="text-muted-foreground text-xs">User rating</div></div>
              </div>
            </div>
            <div className="relative">
              <div className="relative grid grid-cols-2 gap-4">
                <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-elegant translate-y-8">
                  <img src={heroWomen} alt="Woman in emerald lehenga" width={640} height={853} className="h-full w-full object-cover" />
                </div>
                <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-elegant">
                  <img src={heroMen} alt="Man in ivory sherwani" width={640} height={853} className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-card rounded-2xl shadow-elegant p-4 flex items-center gap-3 max-w-[240px]">
                <div className="h-10 w-10 rounded-full bg-gold-grad flex items-center justify-center shrink-0"><Wand2 className="h-5 w-5 text-primary"/></div>
                <div>
                  <div className="text-xs font-semibold">AI matched 12 looks</div>
                  <div className="text-[11px] text-muted-foreground">for your Sangeet night</div>
                </div>
              </div>
            </div>
          </div>
          <div className="paisley-divider mx-8"/>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-7xl px-4 md:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Curated</div>
              <h2 className="text-4xl md:text-5xl font-display font-bold mt-1">Shop by category</h2>
            </div>
            <Link to="/shop" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold hover:text-primary">View all <ArrowRight className="h-4 w-4"/></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categories.map((c, i) => (
              <Link to="/shop" key={c.name} className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-soft animate-float-up" style={{ animationDelay: `${i * 80}ms` }}>
                <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent"/>
                <div className="absolute bottom-0 inset-x-0 p-4 text-primary-foreground">
                  <div className="font-display text-xl font-bold">{c.name}</div>
                  <div className="text-[11px] opacity-80">{c.count.toLocaleString("en-IN")} styles</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Festive Banner */}
        <section className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="relative rounded-3xl overflow-hidden shadow-elegant">
            <img src={festival} alt="Festive Diwali backdrop" loading="lazy" className="absolute inset-0 h-full w-full object-cover"/>
            <div className="relative bg-primary/40 backdrop-blur-[1px] px-8 md:px-16 py-16 md:py-24 text-primary-foreground max-w-2xl">
              <div className="text-xs uppercase tracking-[0.3em] text-gold font-semibold">Diwali · Karwa Chauth · Bhai Dooj</div>
              <h3 className="font-display text-4xl md:text-6xl font-bold mt-3 leading-tight">The Festive<br/><span className="shimmer-text">Edit '26</span></h3>
              <p className="mt-4 opacity-90 max-w-md">Glow this season in handpicked weaves from 80+ master karigars. Up to 60% off launch week.</p>
              <Link to="/shop" className="mt-7 inline-flex items-center gap-2 bg-gold-grad text-primary px-7 py-3.5 rounded-full font-bold hover:scale-105 transition">
                Explore Collection <ArrowRight className="h-4 w-4"/>
              </Link>
            </div>
          </div>
        </section>

        {/* AI Try-On Promo */}
        <section className="mx-auto max-w-7xl px-4 md:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1">
              <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Powered by AI</div>
              <h2 className="text-4xl md:text-5xl font-display font-bold mt-2">See it on you,<br/>before you buy.</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-md">Upload a selfie or open your camera. Our stylist AI analyses your body type, complexion & occasion — then drapes you instantly.</p>
              <ul className="mt-6 space-y-3">
                {[
                  ["Body-type intelligence", "Silhouettes that flatter your frame"],
                  ["Skin-tone palette", "Colours that make you glow"],
                  ["Occasion engine", "Wedding, festive, casual — sorted"],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-gold-grad shrink-0 flex items-center justify-center"><Sparkles className="h-3 w-3 text-primary"/></div>
                    <div><div className="font-semibold text-sm">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div>
                  </li>
                ))}
              </ul>
              <Link to="/try-on" className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full font-semibold hover:bg-gold-grad hover:text-primary transition">
                <Camera className="h-4 w-4"/> Open AI Studio
              </Link>
            </div>
            <div className="order-1 md:order-2 relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-elegant bg-royal p-1">
                <div className="h-full w-full rounded-3xl overflow-hidden relative">
                  <img src={heroWomen} alt="AI try-on preview" loading="lazy" className="h-full w-full object-cover"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"/>
                  <div className="absolute top-4 left-4 bg-card/90 backdrop-blur rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive animate-pulse"/> AI rendering · live</div>
                  <div className="absolute bottom-4 inset-x-4 bg-card/95 backdrop-blur rounded-2xl p-4">
                    <div className="text-xs text-muted-foreground">Match score</div>
                    <div className="flex items-baseline gap-2"><span className="font-display text-3xl font-bold">96%</span><span className="text-xs text-accent font-semibold">— "Perfect for Sangeet"</span></div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gold-grad w-[96%]"/></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Products */}
        <section className="mx-auto max-w-7xl px-4 md:px-8 pb-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Trending now</div>
              <h2 className="text-4xl md:text-5xl font-display font-bold mt-1">India's most loved</h2>
            </div>
            <Link to="/shop" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold hover:text-primary">Shop all <ArrowRight className="h-4 w-4"/></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.slice(0, 8).map((p, i) => (
              <div key={p.id} className="animate-float-up" style={{ animationDelay: `${i * 60}ms` }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <AIChatWidget />
    </div>
  );
}
