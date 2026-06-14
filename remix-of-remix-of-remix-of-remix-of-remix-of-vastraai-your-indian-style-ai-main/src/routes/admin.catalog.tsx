import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Btn, Input } from "@/components/admin/AdminShell";
import { Empty } from "./admin.index";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/catalog")({ component: CatalogAdmin });

function CatalogAdmin() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: async () => (await supabase.from("brands").select("*").order("name")).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products-validate"],
    queryFn: async () => (await supabase.from("products").select("id, name, image_url, image_key, price, mrp, stock")).data ?? [],
  });

  const missing = products.filter((p) => !p.image_url);
  const invalid = products.filter((p) => p.price <= 0 || p.mrp < p.price);

  const [cName, setCName] = useState("");
  const [cSlug, setCSlug] = useState("");
  const [bName, setBName] = useState("");

  const addCategory = async () => {
    if (!cName || !cSlug) return toast.error("Name and slug required");
    const { error } = await supabase.from("categories").insert({ name: cName, slug: cSlug });
    if (error) return toast.error(error.message);
    setCName(""); setCSlug("");
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
  };
  const addBrand = async () => {
    if (!bName) return;
    const { error } = await supabase.from("brands").insert({ name: bName });
    if (error) return toast.error(error.message);
    setBName("");
    qc.invalidateQueries({ queryKey: ["admin", "brands"] });
  };
  const remove = async (table: "categories" | "brands", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", table] });
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-display text-lg text-amber-100 mb-4">Categories</h3>
          <div className="flex gap-2 mb-4">
            <Input placeholder="Name" value={cName} onChange={(e) => setCName(e.target.value)} />
            <Input placeholder="slug" value={cSlug} onChange={(e) => setCSlug(e.target.value.toLowerCase())} />
            <Btn onClick={addCategory}><Plus className="h-4 w-4" /></Btn>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded bg-[#0c0a09] border border-amber-500/5">
                <div><span className="text-amber-100 text-sm">{c.name}</span><span className="text-[11px] text-amber-200/40 ml-2">/{c.slug}</span></div>
                <button onClick={() => remove("categories", c.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {categories.length === 0 && <Empty label="No categories yet" />}
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-lg text-amber-100 mb-4">Brands</h3>
          <div className="flex gap-2 mb-4">
            <Input placeholder="Brand name" value={bName} onChange={(e) => setBName(e.target.value)} />
            <Btn onClick={addBrand}><Plus className="h-4 w-4" /></Btn>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {brands.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded bg-[#0c0a09] border border-amber-500/5">
                <span className="text-amber-100 text-sm">{b.name}</span>
                <button onClick={() => remove("brands", b.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {brands.length === 0 && <Empty label="No brands yet" />}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          <h3 className="font-display text-lg text-amber-100">Product Validation</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-200/60 mb-2 flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5" /> Missing Image ({missing.length})</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {missing.map((p) => <div key={p.id} className="text-sm text-amber-100/80 px-2 py-1 bg-[#0c0a09] rounded">{p.name}</div>)}
              {missing.length === 0 && <div className="text-xs text-emerald-300/70">All products have images ✓</div>}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-200/60 mb-2">Invalid Pricing ({invalid.length})</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {invalid.map((p) => <div key={p.id} className="text-sm text-amber-100/80 px-2 py-1 bg-[#0c0a09] rounded">{p.name} — ₹{p.price}/{p.mrp}</div>)}
              {invalid.length === 0 && <div className="text-xs text-emerald-300/70">All prices look good ✓</div>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
