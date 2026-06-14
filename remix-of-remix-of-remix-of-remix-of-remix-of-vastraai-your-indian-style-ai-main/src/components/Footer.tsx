import { Link } from "@tanstack/react-router";

type FooterLink = { label: string; to: string; search?: Record<string, string> };

const COLUMNS: { title: string; items: FooterLink[] }[] = [
  {
    title: "Shop",
    items: [
      { label: "Women", to: "/shop", search: { gender: "Women" } },
      { label: "Men", to: "/shop", search: { gender: "Men" } },
      { label: "Wedding", to: "/shop", search: { occasion: "Wedding" } },
      { label: "Festive", to: "/shop", search: { occasion: "Festive" } },
      { label: "New Arrivals", to: "/shop" },
    ],
  },
  {
    title: "AI Studio",
    items: [
      { label: "Try-On", to: "/try-on" },
      { label: "Style Quiz", to: "/style-quiz" },
      { label: "AI Stylist", to: "/ai-stylist" },
      { label: "Lookbook", to: "/lookbook" },
    ],
  },
  {
    title: "Help",
    items: [
      { label: "Track Order", to: "/track-order" },
      { label: "Returns", to: "/returns" },
      { label: "Sizing", to: "/sizing" },
      { label: "Contact", to: "/contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="paisley-divider" />
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-10 md:grid-cols-4">
        <div>
          <div className="font-display text-3xl font-bold">Vastra<span className="text-gold">AI</span></div>
          <p className="mt-3 text-sm opacity-75 leading-relaxed">India's first AI-powered couture house. From your camera to your closet.</p>
        </div>
        {COLUMNS.map(c => (
          <div key={c.title}>
            <h4 className="font-display text-lg text-gold mb-3">{c.title}</h4>
            <ul className="space-y-2 text-sm opacity-80">
              {c.items.map(i => (
                <li key={i.label}>
                  <Link
                    to={i.to}
                    search={i.search as never}
                    className="hover:text-gold transition"
                  >
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-primary-foreground/10 py-5 text-center text-xs opacity-60">
        © 2026 VastraAI · Crafted in India with ♥ and AI
      </div>
    </footer>
  );
}
