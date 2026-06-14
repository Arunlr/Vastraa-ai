import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/sizing")({
  component: Sizing,
  head: () => ({
    meta: [
      { title: "Sizing Guide · VastraAI" },
      { name: "description", content: "Find your perfect fit with our detailed couture sizing chart — for blouses, lehengas, kurtas and sherwanis." },
      { property: "og:title", content: "Sizing Guide · VastraAI" },
      { property: "og:description", content: "Tailored-to-you sizing across every silhouette." },
    ],
  }),
});

const WOMEN = [
  ["XS", "32", "26", "34"],
  ["S",  "34", "28", "36"],
  ["M",  "36", "30", "38"],
  ["L",  "38", "32", "40"],
  ["XL", "40", "34", "42"],
  ["XXL","42", "36", "44"],
];
const MEN = [
  ["S",  "36", "30"],
  ["M",  "38", "32"],
  ["L",  "40", "34"],
  ["XL", "42", "36"],
  ["XXL","44", "38"],
];

function Sizing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 md:px-8 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Support</div>
        <h1 className="font-display text-4xl md:text-6xl font-bold mt-2">Sizing Guide</h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-lg">All measurements in inches. For custom tailoring, choose "Made-to-measure" at checkout.</p>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Women</h2>
          <div className="mt-4 rounded-2xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60"><tr>{["Size","Bust","Waist","Hip"].map(h => <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>{WOMEN.map(r => <tr key={r[0]} className="border-t"><td className="px-4 py-3 font-semibold">{r[0]}</td><td className="px-4 py-3">{r[1]}"</td><td className="px-4 py-3">{r[2]}"</td><td className="px-4 py-3">{r[3]}"</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Men</h2>
          <div className="mt-4 rounded-2xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60"><tr>{["Size","Chest","Waist"].map(h => <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>{MEN.map(r => <tr key={r[0]} className="border-t"><td className="px-4 py-3 font-semibold">{r[0]}</td><td className="px-4 py-3">{r[1]}"</td><td className="px-4 py-3">{r[2]}"</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <div className="mt-12 rounded-3xl bg-royal text-primary-foreground p-8">
          <h2 className="font-display text-2xl">Still unsure?</h2>
          <p className="opacity-80 mt-2 max-w-md">Our AI stylist can recommend a size from a single full-length photo.</p>
          <Link to="/try-on" className="mt-5 inline-flex items-center gap-2 bg-gold-grad text-primary px-6 py-3 rounded-full font-bold">Open AI Try-On</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
