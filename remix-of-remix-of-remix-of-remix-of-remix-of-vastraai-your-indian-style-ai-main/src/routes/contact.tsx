import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Mail, Phone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: Contact,
  head: () => ({
    meta: [
      { title: "Contact · VastraAI" },
      { name: "description", content: "Reach the VastraAI atelier — chat, email, or call our couture concierge team." },
      { property: "og:title", content: "Contact · VastraAI" },
      { property: "og:description", content: "We're here, 7 days a week." },
    ],
  }),
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 md:px-8 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Get in touch</div>
        <h1 className="font-display text-4xl md:text-6xl font-bold mt-2">Contact us</h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-lg">Our atelier replies within 4 hours, every day of the week.</p>

        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            { icon: Mail, t: "Email", d: "care@vastraai.com" },
            { icon: Phone, t: "Phone", d: "+91 80 4000 1234" },
            { icon: MessageCircle, t: "Chat", d: "Tap the gold orb anywhere" },
          ].map(c => (
            <div key={c.t} className="rounded-2xl border p-6 bg-card">
              <div className="h-10 w-10 rounded-full bg-gold-grad flex items-center justify-center"><c.icon className="h-5 w-5 text-primary"/></div>
              <div className="font-display text-xl mt-3">{c.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.d}</div>
            </div>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setSent(true); toast.success("Message sent — we'll be in touch within 4 hours."); }} className="mt-10 rounded-3xl border bg-card p-8 grid gap-4">
          <h2 className="font-display text-2xl">Send a message</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <input required placeholder="Your name" className="rounded-full border px-5 py-3 bg-background"/>
            <input required type="email" placeholder="Email" className="rounded-full border px-5 py-3 bg-background"/>
          </div>
          <input placeholder="Subject" className="rounded-full border px-5 py-3 bg-background"/>
          <textarea required placeholder="How can we help?" rows={5} className="rounded-2xl border px-5 py-3 bg-background"/>
          <button disabled={sent} className="self-start bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:bg-gold-grad hover:text-primary transition disabled:opacity-60">{sent ? "Sent ✓" : "Send message"}</button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
