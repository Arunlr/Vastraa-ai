import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { products } from "@/lib/products";

const BodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "ai", "model"]),
      text: z.string(),
    })
  ),
});

// Build a concise catalog summary to enrich Gemini's search capabilities
const catalogSummary = products
  .slice(0, 50) // Rich sample of the catalog
  .map(
    (p) =>
      `• [ID: ${p.id}] "${p.name}" by ${p.brand} | Category: ${p.category} | Gender: ${p.gender} | Price: ₹${p.price.toLocaleString("en-IN")} (MRP: ₹${p.mrp.toLocaleString("en-IN")}) | Occasions: ${p.occasion.join(", ")} | Rating: ${p.rating}★`
  )
  .join("\n");

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = BodySchema.parse(await request.json());
        } catch (e: any) {
          return new Response(
            JSON.stringify({ error: "Invalid input", detail: String(e?.message ?? e) }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "GEMINI_API_KEY environment variable is not configured." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const systemInstruction = `You are VastraAI, the elite Indian traditional couture stylist and intelligent support assistant for Vastra (vastra.ai).
Your absolute highest priority is to help clients explore designer ethnic wear, locate items on the website, offer curated outfit suggestions, and assist with store questions.

### KEY WEBSITE CAPABILITIES:
- **Style Quiz** (/style-quiz): Clients upload an image of themselves or answer preferences to receive skin tone analytics, custom color palette recommendations, and tailored look suggestions. Highly recommend this for personalized styling.
- **Virtual Try-On** (/try-on): Allows clients to upload their photo and a product image to instantly see a photorealistic preview of themselves in Vastra traditional attire. Highly recommend this for virtual fitting.
- **Catalog Browsing** (/shop): Users can browse our full catalog of luxury traditional wear, filtered by Gender, Category, and Occasion.
- **Sizing Guidance** (/sizing): Personalized traditional fitting guides.
- **Order Tracking** (/track-order): Help users track their dispatched packages securely.
- **Customer Returns** (/returns): Vastra offers a premium, hassle-free 7-day return/exchange window with doorstep courier pickup.
- **Premium Brands we carry**: Sabyasachi Edit, Anita Dongre, Manish Malhotra, Abu Jani Sandeep Khosla, Tarun Tahiliani, Falguni Shane Peacock, Raw Mango, Manyavar, Tasva, Biba, Fabindia, Nalli, and Masaba.

### STUCTURED REAL PRODUCT CATALOG:
Here are the actual exquisite pieces currently live on the VastraAI platform. Recommend these specific items when appropriate and matching their request:
${catalogSummary}

### IMPORTANT COGNITIVE GUIDELINES:
1. **Focus Strictly on Vastra & Traditional Traditional Styling**:
   - Only assist and reply to style consultations, Traditional / ethnic attire look design, order management, return guidelines, and website guides.
2. **Ignore & Gently Decline Unrelated Inquiries**:
   - If the user asks ANY question unrelated to Vastra, traditional/ethnic fashion, clothing styling, or online store support (such as general software programming, mathematics, non-fashion advice, recipes, world history, random trivia, or external shopping brands), you MUST politely ignore/decline it.
   - Refusal template: "I am Vastra's dedicated AI Stylist. I am trained strictly to assist with Vastra's designer traditional collections, ethnic styling consulting, and website services. Let me help you find your perfect royal Indian style instead!"
3. **Luxurious Tone**:
   - Address clients with deep respect, professional warmth, and majestic poise. Use terms like "Namaste", "Exquisite heritage", "Royal", "Atelier", "Crafted look", and "Regal attire" appropriately to reflect fine craftsmanship, yet keep replies concise, easy to read, and modern. Never sound robotic.

Map the chat history and make a natural, intelligent recommendation. Give precise product names and suggest navigating to '/shop' or '/try-on' with the specific product ID. Use Indian Rupees (₹) for pricing.`;

        // Map client messages into the format required by the SDK
        const contents = parsed.messages.map((m) => ({
          role: m.role === "ai" ? "model" : m.role,
          parts: [{ text: m.text }],
        }));

        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });

          return new Response(JSON.stringify({ text: response.text ?? "" }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: "Gemini execution error", detail: String(error?.message ?? error) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
