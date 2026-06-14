import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Tag, Image as ImageIcon, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Btn, Input } from "@/components/admin/AdminShell";
import { Empty } from "./admin.index";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/marketing")({ component: MarketingAdmin });

function MarketingAdmin() {
  const qc = useQueryClient();
  const { data: coupons = [] } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: banners = [] } = useQuery({
    queryKey: ["admin", "banners"],
    queryFn: async () => (await supabase.from("banners").select("*").order("sort_order")).data ?? [],
  });
  const { data: featured = [] } = useQuery({
    queryKey: ["admin", "featured-products"],
    queryFn: async () => (await supabase.from("products").select("id, name, image_url").eq("featured", true).limit(12)).data ?? [],
  });

  const [coupon, setCoupon] = useState({ code: "", discount_pct: 10, description: "" });
  const [banner, setBanner] = useState({ title: "", subtitle: "", image_url: "", cta_label: "", cta_link: "" });

  const addCoupon = async () => {
    if (!coupon.code) return toast.error("Code required");
    const { error } = await supabase.from("coupons").insert({ ...coupon, code: coupon.code.toUpperCase() });
    if (error) return toast.error(error.message);
    setCoupon({ code: "", discount_pct: 10, description: "" });
    qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
  };
  const toggleCoupon = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
  };
  const removeCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
  };

  const addBanner = async () => {
    if (!banner.title || !banner.image_url) return toast.error("Title and image required");
    const { error } = await supabase.from("banners").insert(banner);
    if (error) return toast.error(error.message);
    setBanner({ title: "", subtitle: "", image_url: "", cta_label: "", cta_link: "" });
    qc.invalidateQueries({ queryKey: ["admin", "banners"] });
  };
  const removeBanner = async (id: string) => {
    await supabase.from("banners").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "banners"] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-2 mb-4"><Tag className="h-4 w-4 text-amber-300" /><h3 className="font-display text-lg text-amber-100">Coupons</h3></div>
        <div className="grid sm:grid-cols-4 gap-2 mb-4">
          <Input placeholder="CODE" value={coupon.code} onChange={(e) => setCoupon({ ...coupon, code: e.target.value })} />
          <Input type="number" placeholder="% off" value={coupon.discount_pct} onChange={(e) => setCoupon({ ...coupon, discount_pct: Number(e.target.value) })} />
          <Input placeholder="Description" value={coupon.description} onChange={(e) => setCoupon({ ...coupon, description: e.target.value })} className="sm:col-span-1" />
          <Btn onClick={addCoupon}><Plus className="h-4 w-4 inline mr-1" />Add</Btn>
        </div>
        <div className="space-y-1">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded bg-[#0c0a09] border border-amber-500/5">
              <div className="flex items-center gap-3">
                <span className="font-mono text-amber-200 font-semibold">{c.code}</span>
                <span className="text-amber-300 text-sm">{c.discount_pct}%</span>
                <span className="text-amber-200/50 text-xs">{c.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleCoupon(c.id, c.active)} className={`text-[10px] uppercase px-2 py-0.5 rounded border ${c.active ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-white/5 text-amber-200/50 border-amber-500/10"}`}>{c.active ? "Active" : "Off"}</button>
                <button onClick={() => removeCoupon(c.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <Empty label="No coupons yet" />}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4"><ImageIcon className="h-4 w-4 text-amber-300" /><h3 className="font-display text-lg text-amber-100">Promotional Banners</h3></div>
        <div className="grid sm:grid-cols-2 gap-2 mb-4">
          <Input placeholder="Title" value={banner.title} onChange={(e) => setBanner({ ...banner, title: e.target.value })} />
          <Input placeholder="Subtitle" value={banner.subtitle} onChange={(e) => setBanner({ ...banner, subtitle: e.target.value })} />
          <Input placeholder="Image URL" value={banner.image_url} onChange={(e) => setBanner({ ...banner, image_url: e.target.value })} className="sm:col-span-2" />
          <Input placeholder="CTA Label" value={banner.cta_label} onChange={(e) => setBanner({ ...banner, cta_label: e.target.value })} />
          <Input placeholder="CTA Link" value={banner.cta_link} onChange={(e) => setBanner({ ...banner, cta_link: e.target.value })} />
          <Btn onClick={addBanner} className="sm:col-span-2"><Plus className="h-4 w-4 inline mr-1" />Add Banner</Btn>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {banners.map((b) => (
            <div key={b.id} className="relative rounded-xl overflow-hidden border border-amber-500/10">
              <img src={b.image_url} className="h-32 w-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex flex-col justify-end">
                <div className="text-amber-100 font-display">{b.title}</div>
                <div className="text-xs text-amber-200/70">{b.subtitle}</div>
              </div>
              <button onClick={() => removeBanner(b.id)} className="absolute top-2 right-2 bg-black/60 text-red-300 hover:text-red-200 p-1.5 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {banners.length === 0 && <Empty label="No banners yet" />}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4"><Star className="h-4 w-4 text-amber-300" /><h3 className="font-display text-lg text-amber-100">Featured Collection</h3></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {featured.map((p) => (
            <div key={p.id} className="bg-[#0c0a09] rounded-lg overflow-hidden border border-amber-500/10">
              <div className="h-28 bg-amber-500/10 overflow-hidden">{p.image_url ? <img src={p.image_url} className="h-full w-full object-cover" alt="" /> : null}</div>
              <div className="p-2 text-xs text-amber-100 truncate">{p.name}</div>
            </div>
          ))}
          {featured.length === 0 && <Empty label="Mark products as Featured in the Products tab" />}
        </div>
      </Card>
    </div>
  );
}
