import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  userImage: z.string().min(20),
  productImage: z.string().min(5),
  productName: z.string().min(1).max(200),
  mode: z.enum(["Full Outfit", "Top Only", "Bottom Only", "Footwear Only"]).default("Full Outfit"),
});

export const Route = createFileRoute("/api/try-on")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch (e: any) {
          return new Response(JSON.stringify({ error: "Invalid input", detail: String(e?.message ?? e) }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const modeInstruction: Record<string, string> = {
          "Full Outfit": "Replace the person's full outfit with the luxury garment shown in the second image.",
          "Top Only": "Replace ONLY the upper-body garment with the top from the second image; keep their existing bottoms.",
          "Bottom Only": "Replace ONLY the lower-body garment with the bottom from the second image; keep their existing top.",
          "Footwear Only": "Place the footwear from the second image on the person; keep all other clothing untouched.",
        };

        const prompt = `Photorealistic luxury fashion virtual try-on.
Image 1: the client.
Image 2: the couture garment "${parsed.productName}".
Task: ${modeInstruction[parsed.mode]}
Requirements:
- Preserve the person's face, hairstyle, identity, skin tone and body proportions EXACTLY.
- Match the garment's exact colors, textures, embroidery, and silhouette from image 2.
- Natural draping, accurate scaling, realistic shadows and lighting consistent with the original photo background.
- Editorial luxury fashion-magazine quality. No watermarks, no text overlays.
Output: a single photorealistic image of the client wearing the garment.`;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: parsed.userImage } },
                  { type: "image_url", image_url: { url: parsed.productImage } },
                ],
              },
            ],
            modalities: ["image", "text"],
            stream: true,
          }),
        });
        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text().catch(() => "");
          return new Response(t || "Upstream error", { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
