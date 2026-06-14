import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, StatCard } from "@/components/admin/AdminShell";
import { Empty } from "./admin.index";

export const Route = createFileRoute("/admin/ai")({ component: AIAnalytics });

function AIAnalytics() {
  const { data } = useQuery({
    queryKey: ["admin", "ai"],
    queryFn: async () => {
      const { data: usage = [] } = await supabase.from("ai_usage").select("*").order("created_at", { ascending: false });
      const list = usage ?? [];
      const productCounts = new Map<string, number>();
      const occasionCounts = new Map<string, number>();
      for (const u of list) {
        for (const pid of (u.recommended_product_ids ?? [])) productCounts.set(pid, (productCounts.get(pid) ?? 0) + 1);
        if (u.occasion) occasionCounts.set(u.occasion, (occasionCounts.get(u.occasion) ?? 0) + 1);
      }
      const topIds = [...productCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      const products = topIds.length
        ? (await supabase.from("products").select("id, name, image_url").in("id", topIds.map(([id]) => id))).data ?? []
        : [];
      const byDay = new Map<string, number>();
      for (const u of list) {
        const d = new Date(u.created_at).toISOString().slice(0, 10);
        byDay.set(d, (byDay.get(d) ?? 0) + 1);
      }
      return {
        total: list.length,
        uniqueUsers: new Set(list.map((u) => u.user_id).filter(Boolean)).size,
        topProducts: topIds.map(([id, c]) => ({ count: c, ...(products.find((p) => p.id === id) ?? { id, name: id, image_url: null }) })),
        topOccasions: [...occasionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
        byDay: [...byDay.entries()].sort().slice(-14),
        recent: list.slice(0, 6),
      };
    },
  });

  const max = Math.max(1, ...(data?.byDay.map(([, c]) => c) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Recommendations" value={data?.total ?? 0} icon={Sparkles} accent="from-fuchsia-500/15 to-fuchsia-500/0" />
        <StatCard label="Unique Patrons" value={data?.uniqueUsers ?? 0} icon={TrendingUp} accent="from-amber-500/20 to-amber-500/0" />
        <StatCard label="Occasions Served" value={data?.topOccasions.length ?? 0} icon={Calendar} accent="from-emerald-500/15 to-emerald-500/0" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="font-display text-lg text-amber-100 mb-4">AI Usage · Last 14 Days</h3>
          <div className="flex items-end gap-2 h-40">
            {(data?.byDay ?? []).map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-amber-500 to-yellow-300 rounded-t" style={{ height: `${(count / max) * 100}%`, minHeight: 4 }} title={`${day}: ${count}`} />
                <div className="text-[9px] text-amber-200/40">{day.slice(5)}</div>
              </div>
            ))}
            {(!data?.byDay || data.byDay.length === 0) && <Empty label="No AI usage yet" />}
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-lg text-amber-100 mb-4">Top Occasions</h3>
          <div className="space-y-2">
            {(data?.topOccasions ?? []).map(([occ, count]) => (
              <div key={occ}>
                <div className="flex justify-between text-xs text-amber-200/80"><span>{occ}</span><span>{count}</span></div>
                <div className="h-1.5 rounded bg-amber-500/10 mt-1 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300" style={{ width: `${(count / (data!.topOccasions[0][1])) * 100}%` }} />
                </div>
              </div>
            ))}
            {(!data?.topOccasions || data.topOccasions.length === 0) && <Empty label="No occasion data" />}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-display text-lg text-amber-100 mb-4">Most Recommended Products</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(data?.topProducts ?? []).map((p) => (
            <div key={p.id} className="bg-[#0c0a09] border border-amber-500/5 rounded-xl p-3">
              <div className="h-32 rounded-lg bg-amber-500/10 overflow-hidden grid place-items-center mb-2">
                {p.image_url ? <img src={p.image_url} className="h-full w-full object-cover" alt="" /> : <Sparkles className="h-5 w-5 text-amber-300/50" />}
              </div>
              <div className="text-sm text-amber-100 truncate">{p.name}</div>
              <div className="text-xs text-amber-200/50">Recommended {p.count}×</div>
            </div>
          ))}
          {(!data?.topProducts || data.topProducts.length === 0) && <Empty label="No AI recommendations yet" />}
        </div>
      </Card>
    </div>
  );
}
