import type { Product } from "@/lib/products";

const STOPWORDS = new Set([
  "for", "the", "a", "an", "of", "in", "on", "with", "to", "and", "or",
  "me", "my", "please", "show", "find", "want", "need", "looking", "some",
]);

const MEN_WORDS = ["men", "man", "male", "mens", "gents", "guy", "guys", "boy", "boys", "him", "his", "groom"];
const WOMEN_WORDS = ["women", "woman", "female", "womens", "ladies", "lady", "girl", "girls", "her", "bride", "bridal"];

export type ParsedQuery = {
  gender?: "Men" | "Women";
  tokens: string[]; // remaining meaningful tokens
  raw: string;
};

export function parseQuery(input: string): ParsedQuery {
  const raw = input.trim();
  const lower = raw.toLowerCase();
  const all = lower.split(/\s+/).filter(Boolean);
  let gender: "Men" | "Women" | undefined;
  const tokens: string[] = [];
  for (const t of all) {
    if (MEN_WORDS.includes(t)) { gender = gender ?? "Men"; continue; }
    if (WOMEN_WORDS.includes(t)) { gender = gender ?? "Women"; continue; }
    if (STOPWORDS.has(t)) continue;
    tokens.push(t);
  }
  return { gender, tokens, raw };
}

export function matchProducts(products: Product[], input: string): Product[] {
  const { gender, tokens } = parseQuery(input);
  return products.filter((p) => {
    if (gender && p.gender !== gender) return false;
    if (tokens.length === 0) return !!gender; // gender-only query
    const hay = `${p.name} ${p.brand} ${p.category} ${p.occasion.join(" ")}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}
