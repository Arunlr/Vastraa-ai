import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Star, Search, Image as ImageIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Btn, Input, Select } from "@/components/admin/AdminShell";
import { Empty } from "./admin.index";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({ component: ProductsAdmin });

type Row = {
  id: string;
  name: string;
  brand: string;
  category: string;
  gender: string;
  price: number;
  mrp: number;
  stock: number;
  featured: boolean;
  active: boolean;
  image_url: string | null;
  image_key: string;
  occasion: string[];
};

function ProductsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const filtered = rows.filter((r) => (q ? r.name.toLowerCase().includes(q.toLowerCase()) || r.brand.toLowerCase().includes(q.toLowerCase()) : true));

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  const toggle = async (r: Row, field: "featured" | "active") => {
    const patch = field === "featured" ? { featured: !r.featured } : { active: !r.active };
    const { error } = await supabase.from("products").update(patch).eq("id", r.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-200/40" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or brands" className="pl-9" />
        </div>
        <Btn onClick={() => setCreating(true)}><Plus className="h-4 w-4 inline mr-1" />Add Product</Btn>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-amber-200/60 bg-amber-500/5">
              <tr>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3 hidden md:table-cell">Category</th>
                <th className="text-right p-3">Price</th>
                <th className="text-right p-3 hidden md:table-cell">Stock</th>
                <th className="text-center p-3">Featured</th>
                <th className="text-center p-3">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-amber-500/5 hover:bg-amber-500/5">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-amber-500/10 grid place-items-center overflow-hidden">
                        {r.image_url ? <img src={r.image_url} className="h-full w-full object-cover" alt="" /> : <ImageIcon className="h-4 w-4 text-amber-300/40" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-amber-100 truncate max-w-[260px]">{r.name}</div>
                        <div className="text-[11px] text-amber-200/50">{r.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-amber-200/80 hidden md:table-cell">{r.category}</td>
                  <td className="p-3 text-right text-amber-200">₹{r.price.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right hidden md:table-cell"><span className={r.stock < 5 ? "text-red-300" : "text-amber-100"}>{r.stock}</span></td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggle(r, "featured")}><Star className={`h-4 w-4 ${r.featured ? "text-amber-400 fill-amber-400" : "text-amber-200/30"}`} /></button>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggle(r, "active")} className={`text-[10px] uppercase px-2 py-0.5 rounded border ${r.active ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-white/5 text-amber-200/50 border-amber-500/10"}`}>
                      {r.active ? "Live" : "Hidden"}
                    </button>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(r)} className="text-amber-300 hover:text-amber-200 p-1"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-300 p-1 ml-1"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && <Empty label="No products. Click 'Add Product' to create one." />}
          {isLoading && <Empty label="Loading…" />}
        </div>
      </Card>

      {(creating || editing) && (
        <ProductForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["admin", "products"] }); setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ProductForm({ initial, onClose, onSaved }: { initial: Row | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Row>>(
    initial ?? { name: "", brand: "", category: "Lehenga", gender: "Women", price: 0, mrp: 0, stock: 10, featured: false, active: true, image_url: "", image_key: "", occasion: [] }
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isNew = !initial;

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl, image_key: path }));
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if ((form.price ?? 0) > 30000) return toast.error("Price cannot exceed ₹30,000");
    if ((form.mrp ?? 0) > 30000) return toast.error("MRP cannot exceed ₹30,000");
    setSaving(true);
    try {
      const id = initial?.id ?? `p_${Date.now().toString(36)}`;
      const payload = {
        id,
        name: form.name ?? "",
        brand: form.brand ?? "",
        category: form.category ?? "",
        gender: form.gender ?? "Women",
        price: Number(form.price ?? 0),
        mrp: Number(form.mrp ?? 0),
        stock: Number(form.stock ?? 0),
        featured: !!form.featured,
        active: form.active !== false,
        image_url: form.image_url ?? null,
        image_key: form.image_key || id + ".jpg",
        occasion: Array.isArray(form.occasion) ? form.occasion : (form.occasion ? String(form.occasion).split(",").map((s) => s.trim()).filter(Boolean) : []),
      };
      const { error } = isNew
        ? await supabase.from("products").insert(payload)
        : await supabase.from("products").update(payload).eq("id", initial!.id);
      if (error) throw error;
      toast.success(isNew ? "Product added" : "Product updated");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#13100e] border border-amber-500/20 rounded-2xl p-6 my-8">
        <h3 className="font-display text-2xl text-amber-100 mb-1">{isNew ? "Add" : "Edit"} Product</h3>
        <p className="text-xs text-amber-200/50 mb-5">Luxury catalog entry</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Brand"><Input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
          <Field label="Category">
            <Select value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["Lehenga", "Saree", "Kurta", "Sherwani", "Anarkali", "Gown", "Suit"].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Gender">
            <Select value={form.gender ?? "Women"} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option>Women</option><option>Men</option><option>Unisex</option>
            </Select>
          </Field>
          <Field label="Price (₹)"><Input type="number" max={30000} value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Math.min(30000, Number(e.target.value)) })} /></Field>
          <Field label="MRP (₹)"><Input type="number" max={30000} value={form.mrp ?? 0} onChange={(e) => setForm({ ...form, mrp: Math.min(30000, Number(e.target.value)) })} /></Field>
          <Field label="Stock"><Input type="number" value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></Field>
          <Field label="Occasions (comma-separated)">
            <Input value={Array.isArray(form.occasion) ? form.occasion.join(", ") : (form.occasion ?? "")} onChange={(e) => setForm({ ...form, occasion: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Image">
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 rounded-lg bg-amber-500/10 overflow-hidden grid place-items-center shrink-0">
                  {form.image_url ? <img src={form.image_url} className="h-full w-full object-cover" alt="" /> : <ImageIcon className="h-6 w-6 text-amber-300/40" />}
                </div>
                <div className="flex-1 space-y-2">
                  <Input placeholder="Image URL (or upload)" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                  <label className="inline-flex items-center gap-2 text-xs text-amber-200/70 cursor-pointer hover:text-amber-100">
                    <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload from device"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
                  </label>
                </div>
              </div>
            </Field>
          </div>
          <div className="sm:col-span-2 flex gap-6 mt-1">
            <label className="flex items-center gap-2 text-sm text-amber-100"><input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
            <label className="flex items-center gap-2 text-sm text-amber-100"><input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Product"}</Btn>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-amber-200/60 block mb-1">{label}</span>
      {children}
    </label>
  );
}
