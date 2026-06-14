import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const AnalysisSchema = z.object({
  image: z.string().min(20),
});

export type StyleAnalysis = {
  gender: "Women" | "Men" | "Unisex";
  body_proportions: string;
  height_category: "Petite" | "Average" | "Tall";
  skin_tone: string;
  style_preference: string;
  best_colors: string[];
  ai_confidence: number;
  notes: string;
};

async function callGateway(body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const r = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI gateway ${r.status}: ${t.slice(0, 300)}`);
  }
  return r.json();
}

function extractJSON(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON in model output");
  return JSON.parse(raw.slice(first, last + 1));
}

export const analyzePhoto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalysisSchema.parse(d))
  .handler(async ({ data }): Promise<StyleAnalysis> => {
    const result = await callGateway({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a luxury fashion stylist analyzing a photo for outfit recommendations. " +
            "Only infer attributes visible in the photo that are useful for fashion fit. " +
            "Never infer age, ethnicity, religion, or identity. Return STRICT JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Analyze this person for luxury couture styling. Return JSON with keys: " +
                "gender ('Women'|'Men'|'Unisex'), body_proportions (1 short phrase like 'balanced hourglass'), " +
                "height_category ('Petite'|'Average'|'Tall'), skin_tone (warm/cool/neutral + light/medium/deep), " +
                "style_preference (one phrase, e.g. 'modern minimal' or 'opulent traditional'), " +
                "best_colors (array of 4 hex-friendly color names), " +
                "ai_confidence (0-100 integer), notes (one sentence styling insight). " +
                "Output JSON only, no prose.",
            },
            { type: "image_url", image_url: { url: data.image } },
          ],
        },
      ],
    });
    const content: string = result?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJSON(content);
    return {
      gender: parsed.gender ?? "Unisex",
      body_proportions: parsed.body_proportions ?? "balanced",
      height_category: parsed.height_category ?? "Average",
      skin_tone: parsed.skin_tone ?? "neutral medium",
      style_preference: parsed.style_preference ?? "modern luxe",
      best_colors: Array.isArray(parsed.best_colors) ? parsed.best_colors.slice(0, 4) : ["Emerald", "Gold", "Maroon", "Ivory"],
      ai_confidence: Math.max(0, Math.min(100, Number(parsed.ai_confidence) || 88)),
      notes: parsed.notes ?? "",
    };
  });

const RecInput = z.object({
  analysis: z.any(),
  occasion: z.enum(["Wedding", "Festival", "Casual", "Office", "Party", "Reception", "Traditional"]),
});

export type Recommendation = {
  product_id: string;
  reason: string;
  occasion_score: number;
  luxury_score: number;
  style_score: number;
  matching_footwear: string;
  matching_accessory: string;
  color_palette: string[];
};

export const recommendOutfits = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RecInput.parse(d))
  .handler(async ({ data }): Promise<{ recommendations: Recommendation[]; products: any[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const occasionMap: Record<string, string[]> = {
      Wedding: ["Wedding", "Reception"],
      Festival: ["Festival", "Pooja", "Sangeet"],
      Casual: ["Casual", "Festival"],
      Office: ["Casual"],
      Party: ["Sangeet", "Reception", "Wedding"],
      Reception: ["Reception", "Wedding"],
      Traditional: ["Festival", "Pooja", "Wedding"],
    };
    const targetOccasions = occasionMap[data.occasion] ?? [data.occasion];
    const gender = data.analysis?.gender === "Men" ? "Men" : data.analysis?.gender === "Women" ? "Women" : null;

    let q = supabaseAdmin.from("products").select("*").eq("active", true).overlaps("occasion", targetOccasions);
    if (gender) q = q.eq("gender", gender);
    const { data: pool } = await q.order("rating", { ascending: false }).limit(20);
    let candidates: any[] = pool ?? [];

    // Fallback to bundled seed catalog when DB is empty (or has no matches yet).
    if (candidates.length === 0) {
      const { products: seed } = await import("@/lib/products");
      candidates = seed
        .filter((p) => p.occasion?.some((o) => targetOccasions.includes(o)))
        .filter((p) => (gender ? p.gender === gender : true))
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          gender: p.gender,
          occasion: p.occasion,
          price: p.price,
          mrp: p.mrp,
          rating: p.rating,
          image_url: p.image,
        }));
    }

    // Widen if still empty: ignore gender, then ignore occasion entirely.
    if (candidates.length === 0) {
      const { products: seed } = await import("@/lib/products");
      candidates = seed
        .filter((p) => p.occasion?.some((o) => targetOccasions.includes(o)))
        .map((p) => ({
          id: p.id, name: p.name, brand: p.brand, category: p.category,
          gender: p.gender, occasion: p.occasion, price: p.price, mrp: p.mrp,
          rating: p.rating, image_url: p.image,
        }));
    }
    if (candidates.length === 0) {
      const { products: seed } = await import("@/lib/products");
      candidates = seed.slice(0, 24).map((p) => ({
        id: p.id, name: p.name, brand: p.brand, category: p.category,
        gender: p.gender, occasion: p.occasion, price: p.price, mrp: p.mrp,
        rating: p.rating, image_url: p.image,
      }));
    }

    // Shuffle so Gemini sees a different slate each scan → varied picks per user.
    candidates = [...candidates].sort(() => Math.random() - 0.5).slice(0, 16);


    const compact = candidates.map((p: any) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      gender: p.gender,
      occasion: p.occasion,
      price: p.price,
      rating: p.rating,
    }));


    const result = await callGateway({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a luxury couture stylist. Choose the 4 best outfits from a catalog for a client. Output STRICT JSON only.",
        },
        {
          role: "user",
          content: `Client analysis: ${JSON.stringify(data.analysis)}
Occasion: ${data.occasion}
Catalog (pick 4 IDs from here ONLY):
${JSON.stringify(compact)}

Return JSON:
{"recommendations":[{"product_id":"...","reason":"1 short luxury-stylist sentence","occasion_score":0-100,"luxury_score":0-100,"style_score":0-100,"matching_footwear":"e.g. 'Hand-stitched leather mojari'","matching_accessory":"e.g. 'Polki choker'","color_palette":["color1","color2","color3"]}]}
Pick 4 distinct items. JSON only.`,
        },
      ],
    });
    const content: string = result?.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = extractJSON(content);
    } catch {
      parsed = { recommendations: [] };
    }
    const recs: Recommendation[] = (parsed.recommendations ?? [])
      .filter((r: any) => candidates.some((c: any) => c.id === r.product_id))
      .slice(0, 4)
      .map((r: any) => ({
        product_id: r.product_id,
        reason: r.reason ?? "",
        occasion_score: clamp(r.occasion_score),
        luxury_score: clamp(r.luxury_score),
        style_score: clamp(r.style_score),
        matching_footwear: r.matching_footwear ?? "Hand-crafted leather footwear",
        matching_accessory: r.matching_accessory ?? "Heritage jewellery",
        color_palette: Array.isArray(r.color_palette) ? r.color_palette.slice(0, 4) : [],
      }));

    // Fallback: top 4 by rating if model returned nothing valid
    const finalRecs = recs.length
      ? recs
      : candidates.slice(0, 4).map((c: any) => ({
          product_id: c.id,
          reason: "Top-rated pick for the occasion.",
          occasion_score: 92,
          luxury_score: 90,
          style_score: 88,
          matching_footwear: "Hand-crafted leather footwear",
          matching_accessory: "Heritage jewellery",
          color_palette: [],
        }));

    const ids = finalRecs.map((r) => r.product_id);
    const products = candidates.filter((c: any) => ids.includes(c.id));

    // Log to ai_usage (best-effort)
    try {
      await supabaseAdmin.from("ai_usage").insert({
        occasion: data.occasion,
        recommended_product_ids: ids,
        prompt: `analysis:${JSON.stringify(data.analysis).slice(0, 200)}`,
      });
    } catch {}

    return { recommendations: finalRecs, products };
  });

function clamp(n: any) {
  const x = Number(n);
  if (!isFinite(x)) return 85;
  return Math.max(0, Math.min(100, Math.round(x)));
}
