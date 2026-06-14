import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, ShoppingBag, Users, Sparkles, Tag, Megaphone, Settings, LogOut, Menu, X, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/store";
import { toast } from "sonner";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/ai", label: "AI Stylist", icon: Sparkles },
  { to: "/admin/catalog", label: "Catalog", icon: Tag },
  { to: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell() {
  const { user, ready, signOut } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"checking" | "admin" | "none">("checking");
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    
    const userEmail = user.email?.toLowerCase();
    
    if (userEmail !== "respectkills@gmail.com") {
      setRole("none");
      return;
    }
    
    // Auto-grant admin and ensure respectkills@gmail.com has instant access
    setRole("admin");
  }, [ready, user, navigate]);

  const claim = async () => {
    // Disabled/No-op since admin is locked to respectkills@gmail.com
  };

  if (!ready || role === "checking") {
    return <div className="min-h-screen grid place-items-center bg-[#0c0a09] text-amber-200/80">Loading admin…</div>;
  }

  if (role === "none") {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0c0a09] text-amber-100 p-6">
        <div className="max-w-md w-full text-center border border-amber-500/20 rounded-2xl p-8 bg-[#161210] shadow-[0_0_60px_-20px_rgba(217,168,93,0.4)]">
          <X className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="font-display text-3xl mt-4">Access Denied</h1>
          <p className="text-sm mt-3 text-amber-100/65 leading-relaxed">
            This area is restricted to the platform owner. Administrative access is denied.
          </p>
          <div className="mt-8">
            <Link to="/" className="inline-flex items-center justify-center bg-white/5 border border-amber-500/10 text-amber-100 hover:bg-white/10 px-6 py-2.5 rounded-full text-sm font-medium transition">
              ← Return to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-[#0c0a09] text-amber-50 flex">
      {/* Sidebar */}
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static z-40 inset-y-0 left-0 w-64 bg-[#13100e] border-r border-amber-500/10 flex flex-col transition-transform`}>
        <div className="px-6 py-5 border-b border-amber-500/10 flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-400" />
          <div>
            <div className="font-display text-lg leading-none bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">VastraAI</div>
            <div className="text-[10px] tracking-widest text-amber-200/50 uppercase">Admin Suite</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((n) => {
            const active = isActive(n.to, "exact" in n ? n.exact : false);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-gradient-to-r from-amber-500/20 to-transparent text-amber-200 border-l-2 border-amber-400"
                    : "text-amber-100/70 hover:bg-white/5 hover:text-amber-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-amber-500/10">
          <button
            onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-100/70 hover:text-amber-100 hover:bg-white/5 rounded-lg"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-amber-500/10 bg-[#13100e]/80 backdrop-blur sticky top-0 z-20 flex items-center px-4 lg:px-8 gap-3">
          <button className="lg:hidden text-amber-100" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h2 className="font-display text-lg text-amber-100">{NAV.find((n) => isActive(n.to, "exact" in n ? n.exact : false))?.label ?? "Admin"}</h2>
          <div className="ml-auto flex items-center gap-3 text-xs text-amber-200/60">
            <span className="hidden sm:inline">{user?.email}</span>
            <span className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 grid place-items-center text-[#1a0f08] font-bold text-sm">
              {user?.email?.[0]?.toUpperCase() ?? "A"}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Shared UI primitives used by admin pages
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#13100e] border border-amber-500/10 rounded-2xl p-5 shadow-[0_0_40px_-20px_rgba(217,168,93,0.25)] ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, accent = "from-amber-500/20 to-amber-500/0" }: { label: string; value: React.ReactNode; sub?: string; icon: React.ComponentType<{ className?: string }>; accent?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-amber-200/60">{label}</div>
          <div className="font-display text-3xl mt-2 text-amber-100">{value}</div>
          {sub && <div className="text-xs text-amber-200/50 mt-1">{sub}</div>}
        </div>
        <div className="h-10 w-10 rounded-xl bg-amber-500/15 grid place-items-center">
          <Icon className="h-5 w-5 text-amber-300" />
        </div>
      </div>
    </Card>
  );
}

export function Btn({ children, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-[#1a0f08] hover:brightness-110"
      : variant === "danger"
      ? "bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20"
      : "bg-white/5 text-amber-100 border border-amber-500/10 hover:bg-white/10";
  return (
    <button {...props} className={`${styles} px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${props.className ?? ""}`}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`bg-[#0c0a09] border border-amber-500/15 rounded-lg px-3 py-2 text-sm text-amber-100 placeholder:text-amber-200/30 focus:outline-none focus:border-amber-400/50 w-full ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`bg-[#0c0a09] border border-amber-500/15 rounded-lg px-3 py-2 text-sm text-amber-100 focus:outline-none focus:border-amber-400/50 ${props.className ?? ""}`} />;
}
