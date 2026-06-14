import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AIChatWidget } from "@/components/AIChatWidget";
import { Wand2, Sparkles, MessageCircle, Camera } from "lucide-react";

export const Route = createFileRoute("/ai-stylist")({
  component: AIStylist,
  head: () => ({
    meta: [
      { title: "AI Stylist · VastraAI" },
      { name: "description", content: "Chat with India's first couture AI stylist. Get instant outfit picks, draping tips, and wedding-trousseau guidance." },
      { property: "og:title", content: "AI Stylist · VastraAI" },
      { property: "og:description", content: "A personal couture stylist that lives in your pocket." },
    ],
  }),
});

function AIStylist() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 md:px-8 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">AI Studio</div>
        <h1 className="font-display text-4xl md:text-6xl font-bold mt-2">AI Stylist</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-lg">A chatty couture concierge that knows every weave, drape and silhouette in our catalogue. Ask anything.</p>

        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            { icon: MessageCircle, t: "Chat anytime", d: "Tap the gold orb on any page to open the stylist." },
            { icon: Wand2, t: "Curated picks", d: "Get 3–5 personalised looks per question." },
            { icon: Camera, t: "Pair with Try-On", d: "Visualise a recommended look on yourself in seconds." },
          ].map(f => (
            <div key={f.t} className="rounded-2xl border p-6 bg-card">
              <div className="h-10 w-10 rounded-full bg-gold-grad flex items-center justify-center"><f.icon className="h-5 w-5 text-primary"/></div>
              <div className="font-display text-xl mt-3">{f.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-royal text-primary-foreground p-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold"><Sparkles className="h-4 w-4"/> Try a prompt</div>
          <h2 className="font-display text-3xl mt-2">"What should I wear to a Goa beach wedding sangeet?"</h2>
          <p className="opacity-80 mt-2">Our stylist replies with curated looks, colour palettes, and accessory tips.</p>
          <Link to="/try-on" className="mt-6 inline-flex items-center gap-2 bg-gold-grad text-primary px-6 py-3 rounded-full font-bold">Open AI Studio</Link>
        </div>
      </main>
      <Footer />
      <AIChatWidget />
    </div>
  );
}
