import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/style-quiz")({
  component: StyleQuiz,
  head: () => ({
    meta: [
      { title: "Style Quiz · VastraAI" },
      { name: "description", content: "Answer 4 quick questions and let our AI curate a couture wardrobe tailored to your taste, body, and occasion." },
      { property: "og:title", content: "Style Quiz · VastraAI" },
      { property: "og:description", content: "Discover your couture personality in under a minute." },
    ],
  }),
});

const QUESTIONS = [
  { q: "Pick your vibe", opts: ["Regal & traditional", "Modern minimal", "Boho & free", "Bold & glam"] },
  { q: "Your dream occasion", opts: ["Wedding", "Festive", "Reception", "Casual"] },
  { q: "Colour palette you gravitate to", opts: ["Jewel tones", "Pastels", "Earthy neutrals", "Monochrome black/ivory"] },
  { q: "Drape preference", opts: ["Heavy & ornate", "Light & flowy", "Structured", "Surprise me"] },
];

function StyleQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const done = step >= QUESTIONS.length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 md:px-8 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">AI Studio</div>
        <h1 className="font-display text-4xl md:text-6xl font-bold mt-2">Style Quiz</h1>
        <p className="text-muted-foreground mt-3 max-w-xl">A 1-minute quiz to teach our stylist AI what makes you, you.</p>

        <div className="mt-10 rounded-3xl border bg-card p-8 shadow-soft">
          {!done ? (
            <>
              <div className="text-xs text-muted-foreground">Question {step + 1} / {QUESTIONS.length}</div>
              <h2 className="font-display text-2xl mt-2">{QUESTIONS[step].q}</h2>
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {QUESTIONS[step].opts.map(o => (
                  <button key={o} onClick={() => { setAnswers([...answers, o]); setStep(step + 1); }} className="text-left rounded-2xl border px-4 py-3 hover:bg-gold-grad hover:text-primary hover:border-transparent transition">{o}</button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="h-12 w-12 mx-auto rounded-full bg-gold-grad flex items-center justify-center"><Sparkles className="h-6 w-6 text-primary"/></div>
              <h2 className="font-display text-3xl mt-4">Your style is curated.</h2>
              <p className="text-muted-foreground mt-2">Based on {answers.length} signals, we've matched looks for you.</p>
              <Link to="/shop" className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:bg-gold-grad hover:text-primary transition">See your picks <ArrowRight className="h-4 w-4"/></Link>
              <div className="mt-4"><button onClick={() => { setStep(0); setAnswers([]); }} className="text-sm underline text-muted-foreground">Retake quiz</button></div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
