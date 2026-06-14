import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/store";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign In · VastraAI" }] }),
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && user) navigate({ to: "/" });
  }, [ready, user, navigate]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Welcome to VastraAI ✨");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Namaste! Signed in.");
      }
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 grid lg:grid-cols-2">
        <div className="hidden lg:flex relative bg-royal items-center justify-center p-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/20" />
          <div className="relative text-primary-foreground max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-grad text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Couture · AI
            </div>
            <h2 className="font-display text-5xl font-bold mt-6 leading-tight">
              Your closet,<br /> <span className="shimmer-text">reimagined</span>.
            </h2>
            <p className="mt-4 opacity-80">
              Sign in to save styles, track orders, and unlock personalised AI recommendations across every festive moment.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {["Personalised AI Stylist", "Save & share looks", "Express checkout + COD", "Order tracking"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            <h1 className="font-display text-3xl font-bold">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login" ? "Sign in to your VastraAI account" : "Join 2M+ patrons styling with AI"}
            </p>

            <form onSubmit={handle} className="mt-8 space-y-4">
              {mode === "signup" && (
                <Field icon={<UserIcon className="h-4 w-4" />}>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </Field>
              )}
              <Field icon={<Mail className="h-4 w-4" />}>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent outline-none text-sm"
                />
              </Field>
              <Field icon={<Lock className="h-4 w-4" />}>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 6 chars)"
                  className="w-full bg-transparent outline-none text-sm"
                />
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:bg-gold-grad hover:text-primary transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-sm text-center text-muted-foreground">
              {mode === "login" ? "New to VastraAI?" : "Already have an account?"}{" "}
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-primary font-semibold hover:underline"
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </p>

            <Link to="/" className="block mt-8 text-xs text-center text-muted-foreground hover:text-primary">
              ← Continue browsing
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-muted/60 border border-border rounded-xl px-4 py-3 focus-within:border-primary transition">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}
