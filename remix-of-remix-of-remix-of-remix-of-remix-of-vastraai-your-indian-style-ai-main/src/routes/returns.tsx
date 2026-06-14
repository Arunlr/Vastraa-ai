import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RefreshCcw, ShieldCheck, Clock, Mail } from "lucide-react";

export const Route = createFileRoute("/returns")({
  component: Returns,
  head: () => ({
    meta: [
      { title: "Returns & Exchanges · VastraAI" },
      { name: "description", content: "Easy 7-day returns on unworn couture. White-glove pickup across India." },
      { property: "og:title", content: "Returns & Exchanges · VastraAI" },
      { property: "og:description", content: "Worry-free luxury — return or exchange within 7 days." },
    ],
  }),
});

function Returns() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 md:px-8 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Support</div>
        <h1 className="font-display text-4xl md:text-6xl font-bold mt-2">Returns & Exchanges</h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-lg">If a piece isn't perfect, send it back. We collect from your doorstep.</p>

        <div className="mt-10 grid md:grid-cols-2 gap-4">
          {[
            { icon: Clock, t: "7-day window", d: "Initiate a return within 7 days of delivery." },
            { icon: RefreshCcw, t: "Free pickup", d: "Our courier collects from your address — no labels, no hassle." },
            { icon: ShieldCheck, t: "Refund in 5 days", d: "Refunds to original payment method within 5 business days of pickup." },
            { icon: Mail, t: "Need help?", d: "Write to care@vastraai.com or chat with our AI stylist." },
          ].map(c => (
            <div key={c.t} className="rounded-2xl border p-6 bg-card">
              <div className="h-10 w-10 rounded-full bg-gold-grad flex items-center justify-center"><c.icon className="h-5 w-5 text-primary"/></div>
              <div className="font-display text-xl mt-3">{c.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-secondary/40 p-8">
          <h2 className="font-display text-2xl">Non-returnable</h2>
          <ul className="mt-3 text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Custom-stitched / made-to-measure couture</li>
            <li>Pieces marked "Final Sale"</li>
            <li>Worn, altered, or laundered garments</li>
          </ul>
          <Link to="/track-order" className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:bg-gold-grad hover:text-primary transition">Track an order</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
