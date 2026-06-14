import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Btn, Input } from "@/components/admin/AdminShell";
import { useAuth } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: SettingsAdmin });

type Settings = {
  site_name: string;
  tagline: string;
  contact_email: string;
  contact_phone: string;
  cod_enabled: boolean;
  online_payment_enabled: boolean;
  free_shipping_above: number;
  ai_model: string;
  ai_temperature: number;
  ai_system_prompt: string;
};

const DEFAULTS: Settings = {
  site_name: "VastraAI",
  tagline: "Couture · AI · Heritage",
  contact_email: "concierge@vastraai.com",
  contact_phone: "+91 98765 43210",
  cod_enabled: true,
  online_payment_enabled: true,
  free_shipping_above: 2999,
  ai_model: "google/gemini-3-flash-preview",
  ai_temperature: 0.7,
  ai_system_prompt: "You are an elegant fashion stylist for VastraAI, India's premier luxury couture house.",
};

function SettingsAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [profile, setProfile] = useState({ full_name: "", phone: "" });

  const { data: settings } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => (await supabase.from("settings").select("*")).data ?? [],
  });
  const { data: myProfile } = useQuery({
    queryKey: ["admin", "me", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  useEffect(() => {
    if (settings) {
      const merged: Settings = { ...DEFAULTS };
      for (const row of settings) {
        if (row.key in merged) {
          (merged as Record<string, unknown>)[row.key] = row.value;
        }
      }
      setForm(merged);
    }
  }, [settings]);

  useEffect(() => {
    if (myProfile) setProfile({ full_name: myProfile.full_name ?? "", phone: myProfile.phone ?? "" });
  }, [myProfile]);

  const save = async (keys: (keyof Settings)[]) => {
    const rows = keys.map((k) => ({ key: k as string, value: form[k] }));
    const { error } = await supabase.from("settings").upsert(rows);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["admin", "settings"] });
  };

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email ?? null, ...profile });
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <h3 className="font-display text-lg text-amber-100 mb-4">Website</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="Site Name"><Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} /></L>
          <L label="Tagline"><Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></L>
          <L label="Contact Email"><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></L>
          <L label="Contact Phone"><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></L>
        </div>
        <div className="mt-4 flex justify-end"><Btn onClick={() => save(["site_name", "tagline", "contact_email", "contact_phone"])}>Save Website</Btn></div>
      </Card>

      <Card>
        <h3 className="font-display text-lg text-amber-100 mb-4">Payments &amp; Shipping</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3"><input type="checkbox" checked={form.cod_enabled} onChange={(e) => setForm({ ...form, cod_enabled: e.target.checked })} /> <span className="text-sm text-amber-100">Cash on Delivery enabled</span></label>
          <label className="flex items-center gap-3"><input type="checkbox" checked={form.online_payment_enabled} onChange={(e) => setForm({ ...form, online_payment_enabled: e.target.checked })} /> <span className="text-sm text-amber-100">Online payments enabled</span></label>
          <L label="Free shipping above (₹)"><Input type="number" value={form.free_shipping_above} onChange={(e) => setForm({ ...form, free_shipping_above: Number(e.target.value) })} /></L>
        </div>
        <div className="mt-4 flex justify-end"><Btn onClick={() => save(["cod_enabled", "online_payment_enabled", "free_shipping_above"])}>Save Payments</Btn></div>
      </Card>

      <Card>
        <h3 className="font-display text-lg text-amber-100 mb-4">AI Stylist</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="Model"><Input value={form.ai_model} onChange={(e) => setForm({ ...form, ai_model: e.target.value })} /></L>
          <L label="Temperature"><Input type="number" step="0.1" min="0" max="2" value={form.ai_temperature} onChange={(e) => setForm({ ...form, ai_temperature: Number(e.target.value) })} /></L>
          <div className="sm:col-span-2">
            <L label="System Prompt">
              <textarea value={form.ai_system_prompt} onChange={(e) => setForm({ ...form, ai_system_prompt: e.target.value })} rows={4} className="w-full bg-[#0c0a09] border border-amber-500/15 rounded-lg px-3 py-2 text-sm text-amber-100 focus:outline-none focus:border-amber-400/50" />
            </L>
          </div>
        </div>
        <div className="mt-4 flex justify-end"><Btn onClick={() => save(["ai_model", "ai_temperature", "ai_system_prompt"])}>Save AI</Btn></div>
      </Card>

      <Card>
        <h3 className="font-display text-lg text-amber-100 mb-4">Admin Profile</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="Email"><Input value={user?.email ?? ""} disabled /></L>
          <L label="Full Name"><Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></L>
          <L label="Phone"><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></L>
        </div>
        <div className="mt-4 flex justify-end"><Btn onClick={saveProfile}>Update Profile</Btn></div>
      </Card>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] uppercase tracking-wider text-amber-200/60 block mb-1">{label}</span>{children}</label>;
}
