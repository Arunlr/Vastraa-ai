// Shared Product type + DB hooks + occasion/category constants.
// Backward-compatible: still exports the static `products` & `categories` arrays
// so the existing shop/index/try-on pages compile. Admin uses the DB hooks below
// (useProducts / fetchAllProductsAdmin) and edits are reflected via product-images.ts.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage, imageMap } from "@/lib/product-images";

export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  image: string;
  image_key?: string;
  image_url?: string | null;
  category: "Lehenga" | "Saree" | "Kurta" | "Sherwani" | "Anarkali" | string;
  gender: "Women" | "Men" | string;
  occasion: string[];
  rating: number;
  reviews: number;
  stock?: number;
  featured?: boolean;
  active?: boolean;
};

export const occasions = ["Wedding", "Festival", "Sangeet", "Reception", "Pooja", "Casual"];

// ----- Static fallback catalog (kept for synchronous SSR rendering of shop/index) -----
const seed: Array<Omit<Product, "image"> & { image_key: string }> = [
  { id: "wl1", name: "Royal Emerald Bridal Lehenga", brand: "Sabyasachi Edit", price: 30000, mrp: 30000, image_key: "wl1.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding", "Reception"], rating: 4.9, reviews: 1284 },
  { id: "wl2", name: "Crimson Bandhani Couture Lehenga", brand: "Anita Dongre", price: 30000, mrp: 30000, image_key: "wl2.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding"], rating: 4.8, reviews: 612 },
  { id: "wl3", name: "Ivory Pearl Zardozi Lehenga", brand: "Manish Malhotra", price: 30000, mrp: 30000, image_key: "wl3.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding", "Reception"], rating: 4.9, reviews: 942 },
  { id: "wl4", name: "Rani Pink Mirror Lehenga", brand: "Abu Jani Sandeep Khosla", price: 30000, mrp: 30000, image_key: "wl4.jpg", category: "Lehenga", gender: "Women", occasion: ["Sangeet", "Festival"], rating: 4.7, reviews: 428 },
  { id: "wl5", name: "Midnight Velvet Lehenga", brand: "Tarun Tahiliani", price: 30000, mrp: 30000, image_key: "wl5.jpg", category: "Lehenga", gender: "Women", occasion: ["Reception"], rating: 4.8, reviews: 356 },
  { id: "wl6", name: "Blush Rose Sequin Lehenga", brand: "Falguni Shane Peacock", price: 30000, mrp: 30000, image_key: "wl6.jpg", category: "Lehenga", gender: "Women", occasion: ["Sangeet", "Reception"], rating: 4.7, reviews: 511 },
  { id: "wl7", name: "Sapphire Threadwork Lehenga", brand: "Sabyasachi Edit", price: 30000, mrp: 30000, image_key: "wl7.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding"], rating: 4.9, reviews: 720 },
  { id: "wl8", name: "Maroon Banarasi Lehenga", brand: "Ritu Kumar", price: 30000, mrp: 30000, image_key: "wl8.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding", "Festival"], rating: 4.6, reviews: 489 },
  { id: "wl9", name: "Champagne Gota Patti Lehenga", brand: "Anita Dongre", price: 30000, mrp: 30000, image_key: "wl9.jpg", category: "Lehenga", gender: "Women", occasion: ["Sangeet"], rating: 4.7, reviews: 302 },
  { id: "wl10", name: "Wine Resham Couture Lehenga", brand: "Manish Malhotra", price: 30000, mrp: 30000, image_key: "wl10.jpg", category: "Lehenga", gender: "Women", occasion: ["Reception"], rating: 4.8, reviews: 267 },
  { id: "wl11", name: "Peach Pastel Heritage Lehenga", brand: "Tarun Tahiliani", price: 30000, mrp: 30000, image_key: "wl11.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding", "Sangeet"], rating: 4.7, reviews: 198 },
  { id: "ws1", name: "Banarasi Silk Heritage Saree", brand: "Taneira", price: 18499, mrp: 28999, image_key: "ws1.jpg", category: "Saree", gender: "Women", occasion: ["Festival", "Pooja"], rating: 4.8, reviews: 942 },
  { id: "ws2", name: "Rose Gold Kanjeevaram Saree", brand: "Pothys", price: 30000, mrp: 30000, image_key: "ws2.jpg", category: "Saree", gender: "Women", occasion: ["Wedding", "Festival"], rating: 4.9, reviews: 1511 },
  { id: "ws3", name: "Ivory Chikankari Pure Silk Saree", brand: "Raw Mango", price: 24999, mrp: 30000, image_key: "ws3.jpg", category: "Saree", gender: "Women", occasion: ["Pooja", "Festival"], rating: 4.8, reviews: 681 },
  { id: "ws4", name: "Sindoor Red Bridal Kanjeevaram", brand: "Kanchipuram Silks", price: 30000, mrp: 30000, image_key: "ws4.jpg", category: "Saree", gender: "Women", occasion: ["Wedding"], rating: 4.9, reviews: 1102 },
  { id: "ws5", name: "Emerald Patola Heirloom Saree", brand: "Patan Patola", price: 30000, mrp: 30000, image_key: "ws5.jpg", category: "Saree", gender: "Women", occasion: ["Wedding", "Festival"], rating: 4.9, reviews: 432 },
  { id: "ws6", name: "Black Pearl Chiffon Designer Saree", brand: "Sabyasachi Edit", price: 30000, mrp: 30000, image_key: "ws6.jpg", category: "Saree", gender: "Women", occasion: ["Reception"], rating: 4.8, reviews: 588 },
  { id: "ws7", name: "Mustard Bandhani Gharchola", brand: "Anita Dongre", price: 22999, mrp: 30000, image_key: "ws7.jpg", category: "Saree", gender: "Women", occasion: ["Festival", "Sangeet"], rating: 4.6, reviews: 364 },
  { id: "ws8", name: "Royal Blue Mysore Silk Saree", brand: "Nalli", price: 16999, mrp: 24999, image_key: "ws8.jpg", category: "Saree", gender: "Women", occasion: ["Festival", "Pooja"], rating: 4.7, reviews: 421 },
  { id: "ws9", name: "Lavender Organza Hand-Painted Saree", brand: "Masaba", price: 19999, mrp: 29999, image_key: "ws9.jpg", category: "Saree", gender: "Women", occasion: ["Sangeet", "Reception"], rating: 4.7, reviews: 312 },
  { id: "ws10", name: "Antique Gold Tissue Saree", brand: "Tarun Tahiliani", price: 30000, mrp: 30000, image_key: "ws10.jpg", category: "Saree", gender: "Women", occasion: ["Wedding", "Reception"], rating: 4.8, reviews: 254 },
  { id: "ws11", name: "Forest Green Paithani Silk", brand: "Taneira", price: 27999, mrp: 30000, image_key: "ws11.jpg", category: "Saree", gender: "Women", occasion: ["Festival"], rating: 4.7, reviews: 287 },
  { id: "wa1", name: "Marigold Mirror Anarkali", brand: "Biba", price: 8499, mrp: 13999, image_key: "wa1.jpg", category: "Anarkali", gender: "Women", occasion: ["Festival", "Sangeet"], rating: 4.6, reviews: 738 },
  { id: "wa2", name: "Onyx Black Velvet Anarkali", brand: "Sabyasachi Edit", price: 30000, mrp: 30000, image_key: "wa2.jpg", category: "Anarkali", gender: "Women", occasion: ["Reception"], rating: 4.8, reviews: 412 },
  { id: "wa3", name: "Powder Pink Floor-Length Anarkali", brand: "Anita Dongre", price: 24999, mrp: 30000, image_key: "wa3.jpg", category: "Anarkali", gender: "Women", occasion: ["Sangeet", "Festival"], rating: 4.7, reviews: 526 },
  { id: "wa4", name: "Saffron Silk Zari Anarkali", brand: "Manyavar Mohey", price: 14999, mrp: 22999, image_key: "wa4.jpg", category: "Anarkali", gender: "Women", occasion: ["Festival"], rating: 4.6, reviews: 389 },
  { id: "wa5", name: "Wine Embroidered Layered Anarkali", brand: "Ritu Kumar", price: 19999, mrp: 30000, image_key: "wa5.jpg", category: "Anarkali", gender: "Women", occasion: ["Reception", "Sangeet"], rating: 4.7, reviews: 271 },
  { id: "wa6", name: "Sky Blue Threadwork Anarkali", brand: "Masaba", price: 12999, mrp: 19999, image_key: "wa6.jpg", category: "Anarkali", gender: "Women", occasion: ["Festival", "Casual"], rating: 4.5, reviews: 198 },
  { id: "wa7", name: "Royal Maroon Couture Anarkali", brand: "Manish Malhotra", price: 30000, mrp: 30000, image_key: "wa7.jpg", category: "Anarkali", gender: "Women", occasion: ["Wedding", "Reception"], rating: 4.9, reviews: 312 },
  { id: "wa8", name: "Ivory Pearl Anarkali Gown", brand: "Tarun Tahiliani", price: 30000, mrp: 30000, image_key: "wa8.jpg", category: "Anarkali", gender: "Women", occasion: ["Reception"], rating: 4.8, reviews: 245 },
  { id: "wa9", name: "Coral Mirror Festive Anarkali", brand: "Biba", price: 7999, mrp: 12999, image_key: "wa9.jpg", category: "Anarkali", gender: "Women", occasion: ["Festival"], rating: 4.5, reviews: 612 },
  { id: "wa10", name: "Sage Green Chikankari Anarkali", brand: "Lucknow Atelier", price: 16999, mrp: 25999, image_key: "wa10.jpg", category: "Anarkali", gender: "Women", occasion: ["Festival", "Pooja"], rating: 4.7, reviews: 333 },
  { id: "wa11", name: "Deep Plum Velvet Anarkali", brand: "Anita Dongre", price: 29999, mrp: 30000, image_key: "wa11.jpg", category: "Anarkali", gender: "Women", occasion: ["Reception", "Wedding"], rating: 4.7, reviews: 188 },
  { id: "wk1", name: "Ivory Chikankari Kurti Set", brand: "Lucknow Atelier", price: 4999, mrp: 7999, image_key: "wk1.jpg", category: "Kurta", gender: "Women", occasion: ["Festival", "Casual"], rating: 4.7, reviews: 812 },
  { id: "wk2", name: "Rose Pink Gota Kurti", brand: "Biba", price: 3499, mrp: 5499, image_key: "wk2.jpg", category: "Kurta", gender: "Women", occasion: ["Festival"], rating: 4.6, reviews: 543 },
  { id: "wk3", name: "Indigo Block-Print Kurti", brand: "Fabindia", price: 2499, mrp: 3999, image_key: "wk3.jpg", category: "Kurta", gender: "Women", occasion: ["Casual"], rating: 4.5, reviews: 921 },
  { id: "wk4", name: "Mustard Cotton Anarkali Kurti", brand: "W for Women", price: 2999, mrp: 4499, image_key: "wk4.jpg", category: "Kurta", gender: "Women", occasion: ["Casual", "Festival"], rating: 4.5, reviews: 612 },
  { id: "wk5", name: "Emerald Silk Festive Kurti Set", brand: "Anita Dongre", price: 8999, mrp: 13999, image_key: "wk5.jpg", category: "Kurta", gender: "Women", occasion: ["Festival", "Pooja"], rating: 4.7, reviews: 387 },
  { id: "wk6", name: "Peach Mirror-Work Kurti", brand: "Global Desi", price: 3999, mrp: 5999, image_key: "wk6.jpg", category: "Kurta", gender: "Women", occasion: ["Festival"], rating: 4.6, reviews: 421 },
  { id: "wk7", name: "Maroon Velvet Designer Kurti", brand: "Ritu Kumar", price: 12999, mrp: 19999, image_key: "wk7.jpg", category: "Kurta", gender: "Women", occasion: ["Reception", "Festival"], rating: 4.7, reviews: 256 },
  { id: "wk8", name: "Pastel Yellow Linen Kurti", brand: "Soch", price: 2199, mrp: 3299, image_key: "wk8.jpg", category: "Kurta", gender: "Women", occasion: ["Casual"], rating: 4.4, reviews: 588 },
  { id: "wk9", name: "Royal Blue Embroidered Kurti", brand: "Aurelia", price: 3299, mrp: 4999, image_key: "wk9.jpg", category: "Kurta", gender: "Women", occasion: ["Festival", "Casual"], rating: 4.5, reviews: 731 },
  { id: "wk10", name: "Wine Banarasi Straight Kurti", brand: "Taneira", price: 6999, mrp: 10999, image_key: "wk10.jpg", category: "Kurta", gender: "Women", occasion: ["Festival", "Pooja"], rating: 4.7, reviews: 312 },
  { id: "wk11", name: "Coral Mul-Cotton Kurti Set", brand: "Fabindia", price: 3799, mrp: 5499, image_key: "wk11.jpg", category: "Kurta", gender: "Women", occasion: ["Casual"], rating: 4.5, reviews: 402 },
  { id: "mk1", name: "Cobalt Embroidered Kurta Set", brand: "Manyavar", price: 5499, mrp: 8999, image_key: "mk1.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Casual"], rating: 4.6, reviews: 612 },
  { id: "mk2", name: "Ivory Silk Bandhgala Kurta", brand: "Tasva", price: 8999, mrp: 13999, image_key: "mk2.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Sangeet"], rating: 4.7, reviews: 421 },
  { id: "mk3", name: "Charcoal Linen Pathani Kurta", brand: "Fabindia", price: 3499, mrp: 5499, image_key: "mk3.jpg", category: "Kurta", gender: "Men", occasion: ["Casual"], rating: 4.5, reviews: 538 },
  { id: "mk4", name: "Maroon Brocade Festive Kurta", brand: "Manyavar", price: 6999, mrp: 10999, image_key: "mk4.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Pooja"], rating: 4.7, reviews: 489 },
  { id: "mk5", name: "Beige Chikan Kurta Pyjama", brand: "Lucknow Atelier", price: 7499, mrp: 11999, image_key: "mk5.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Casual"], rating: 4.6, reviews: 312 },
  { id: "mk6", name: "Olive Mandarin-Collar Kurta", brand: "Tasva", price: 4999, mrp: 7499, image_key: "mk6.jpg", category: "Kurta", gender: "Men", occasion: ["Casual", "Festival"], rating: 4.5, reviews: 276 },
  { id: "mk7", name: "Royal Blue Silk Asymmetric Kurta", brand: "Manish Malhotra Men", price: 14999, mrp: 22999, image_key: "mk7.jpg", category: "Kurta", gender: "Men", occasion: ["Sangeet", "Reception"], rating: 4.8, reviews: 198 },
  { id: "mk8", name: "Black Velvet Bandi Kurta Set", brand: "Sabyasachi Men", price: 24999, mrp: 30000, image_key: "mk8.jpg", category: "Kurta", gender: "Men", occasion: ["Reception"], rating: 4.9, reviews: 156 },
  { id: "mk9", name: "Saffron Cotton Festive Kurta", brand: "FabIndia", price: 2999, mrp: 4499, image_key: "mk9.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Pooja"], rating: 4.4, reviews: 612 },
  { id: "mk10", name: "Wine Jacquard Kurta Jacket Set", brand: "Manyavar", price: 9999, mrp: 15999, image_key: "mk10.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Sangeet"], rating: 4.7, reviews: 345 },
  { id: "mk11", name: "Forest Green Raw Silk Kurta", brand: "Tasva", price: 6499, mrp: 9999, image_key: "mk11.jpg", category: "Kurta", gender: "Men", occasion: ["Festival"], rating: 4.6, reviews: 287 },
  { id: "ms1", name: "Ivory Zardozi Bridal Sherwani", brand: "Tasva", price: 30000, mrp: 30000, image_key: "ms1.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding", "Reception"], rating: 4.9, reviews: 421 },
  { id: "ms2", name: "Onyx Velvet Designer Sherwani", brand: "Manyavar", price: 24999, mrp: 30000, image_key: "ms2.jpg", category: "Sherwani", gender: "Men", occasion: ["Reception"], rating: 4.7, reviews: 298 },
  { id: "ms3", name: "Gold Brocade Royal Sherwani", brand: "Manish Malhotra Men", price: 30000, mrp: 30000, image_key: "ms3.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding"], rating: 4.9, reviews: 215 },
  { id: "ms4", name: "Wine Pearl-Embroidered Sherwani", brand: "Sabyasachi Men", price: 30000, mrp: 30000, image_key: "ms4.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding", "Reception"], rating: 4.9, reviews: 178 },
  { id: "ms5", name: "Beige Silk Heritage Sherwani", brand: "Tarun Tahiliani Men", price: 30000, mrp: 30000, image_key: "ms5.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding"], rating: 4.8, reviews: 234 },
  { id: "ms6", name: "Midnight Blue Threadwork Sherwani", brand: "Tasva", price: 30000, mrp: 30000, image_key: "ms6.jpg", category: "Sherwani", gender: "Men", occasion: ["Reception", "Sangeet"], rating: 4.7, reviews: 312 },
  { id: "ms7", name: "Maroon Velvet Embellished Sherwani", brand: "Manyavar", price: 28999, mrp: 30000, image_key: "ms7.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding"], rating: 4.7, reviews: 389 },
  { id: "ms8", name: "Champagne Raw Silk Sherwani", brand: "Raghavendra Rathore", price: 30000, mrp: 30000, image_key: "ms8.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding", "Reception"], rating: 4.8, reviews: 156 },
  { id: "ms9", name: "Emerald Bandhgala Sherwani", brand: "Manish Malhotra Men", price: 30000, mrp: 30000, image_key: "ms9.jpg", category: "Sherwani", gender: "Men", occasion: ["Sangeet", "Reception"], rating: 4.8, reviews: 187 },
  { id: "ms10", name: "Pearl White Crystal Sherwani", brand: "Sabyasachi Men", price: 30000, mrp: 30000, image_key: "ms10.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding"], rating: 4.9, reviews: 124 },
  { id: "ms11", name: "Rust Orange Festive Sherwani", brand: "Tasva", price: 22999, mrp: 30000, image_key: "ms11.jpg", category: "Sherwani", gender: "Men", occasion: ["Festival", "Sangeet"], rating: 4.6, reviews: 256 },

  // ----- New arrivals (10 per category) -----
  { id: "wl12", name: "Sapphire Blue Silk Bridal Lehenga", brand: "Manish Malhotra", price: 30000, mrp: 30000, image_key: "wl12.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding", "Reception"], rating: 4.9, reviews: 412 },
  { id: "wl13", name: "Coral Sequin Sangeet Lehenga", brand: "Falguni Shane Peacock", price: 30000, mrp: 30000, image_key: "wl13.jpg", category: "Lehenga", gender: "Women", occasion: ["Sangeet", "Reception"], rating: 4.8, reviews: 287 },
  { id: "wl14", name: "Antique Gold Brocade Lehenga", brand: "Ritu Kumar", price: 30000, mrp: 30000, image_key: "wl14.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding", "Festival"], rating: 4.7, reviews: 233 },
  { id: "wl15", name: "Mint Pastel Floral Lehenga", brand: "Anita Dongre", price: 30000, mrp: 30000, image_key: "wl15.jpg", category: "Lehenga", gender: "Women", occasion: ["Sangeet", "Festival"], rating: 4.7, reviews: 178 },
  { id: "wl16", name: "Burgundy Velvet Royal Lehenga", brand: "Sabyasachi Edit", price: 30000, mrp: 30000, image_key: "wl16.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding", "Reception"], rating: 4.9, reviews: 519 },
  { id: "wl17", name: "Powder Blue Mirror Lehenga", brand: "Abu Jani Sandeep Khosla", price: 30000, mrp: 30000, image_key: "wl17.jpg", category: "Lehenga", gender: "Women", occasion: ["Sangeet"], rating: 4.7, reviews: 198 },
  { id: "wl18", name: "Fuchsia Pink Resham Lehenga", brand: "Anita Dongre", price: 30000, mrp: 30000, image_key: "wl18.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding", "Sangeet"], rating: 4.7, reviews: 264 },
  { id: "wl19", name: "Olive Zardozi Heritage Lehenga", brand: "Tarun Tahiliani", price: 30000, mrp: 30000, image_key: "wl19.jpg", category: "Lehenga", gender: "Women", occasion: ["Wedding"], rating: 4.8, reviews: 211 },
  { id: "wl20", name: "Rose Gold Tissue Lehenga", brand: "Manish Malhotra", price: 30000, mrp: 30000, image_key: "wl20.jpg", category: "Lehenga", gender: "Women", occasion: ["Reception"], rating: 4.8, reviews: 189 },
  { id: "wl21", name: "Aqua Cutdana Couture Lehenga", brand: "Falguni Shane Peacock", price: 30000, mrp: 30000, image_key: "wl21.jpg", category: "Lehenga", gender: "Women", occasion: ["Reception", "Sangeet"], rating: 4.8, reviews: 142 },

  { id: "ws12", name: "Peacock Blue Kanjeevaram Saree", brand: "Kanchipuram Silks", price: 30000, mrp: 30000, image_key: "ws12.jpg", category: "Saree", gender: "Women", occasion: ["Wedding", "Festival"], rating: 4.8, reviews: 612 },
  { id: "ws13", name: "Maroon Banarasi Brocade Saree", brand: "Taneira", price: 22999, mrp: 30000, image_key: "ws13.jpg", category: "Saree", gender: "Women", occasion: ["Festival", "Pooja"], rating: 4.7, reviews: 489 },
  { id: "ws14", name: "Pista Green Organza Saree", brand: "Masaba", price: 18999, mrp: 28999, image_key: "ws14.jpg", category: "Saree", gender: "Women", occasion: ["Sangeet", "Festival"], rating: 4.7, reviews: 312 },
  { id: "ws15", name: "Ruby Red Bridal Silk Saree", brand: "Pothys", price: 30000, mrp: 30000, image_key: "ws15.jpg", category: "Saree", gender: "Women", occasion: ["Wedding"], rating: 4.9, reviews: 821 },
  { id: "ws16", name: "Charcoal Sequin Designer Saree", brand: "Sabyasachi Edit", price: 30000, mrp: 30000, image_key: "ws16.jpg", category: "Saree", gender: "Women", occasion: ["Reception"], rating: 4.8, reviews: 367 },
  { id: "ws17", name: "Mustard Bandhani Bandhej Saree", brand: "Anita Dongre", price: 19999, mrp: 29999, image_key: "ws17.jpg", category: "Saree", gender: "Women", occasion: ["Festival", "Sangeet"], rating: 4.6, reviews: 298 },
  { id: "ws18", name: "Beige Linen Handloom Saree", brand: "Raw Mango", price: 14999, mrp: 22999, image_key: "ws18.jpg", category: "Saree", gender: "Women", occasion: ["Casual", "Pooja"], rating: 4.6, reviews: 256 },
  { id: "ws19", name: "Navy Mysore Crepe Silk Saree", brand: "Nalli", price: 17999, mrp: 26999, image_key: "ws19.jpg", category: "Saree", gender: "Women", occasion: ["Festival", "Pooja"], rating: 4.7, reviews: 334 },
  { id: "ws20", name: "Plum Tussar Silk Saree", brand: "Taneira", price: 21999, mrp: 30000, image_key: "ws20.jpg", category: "Saree", gender: "Women", occasion: ["Festival"], rating: 4.7, reviews: 198 },
  { id: "ws21", name: "Sea Green Patola Silk Saree", brand: "Patan Patola", price: 30000, mrp: 30000, image_key: "ws21.jpg", category: "Saree", gender: "Women", occasion: ["Wedding", "Festival"], rating: 4.9, reviews: 312 },

  { id: "wa12", name: "Crimson Velvet Floor-Length Anarkali", brand: "Sabyasachi Edit", price: 30000, mrp: 30000, image_key: "wa12.jpg", category: "Anarkali", gender: "Women", occasion: ["Reception", "Wedding"], rating: 4.8, reviews: 287 },
  { id: "wa13", name: "Mint Green Threadwork Anarkali", brand: "Anita Dongre", price: 22999, mrp: 30000, image_key: "wa13.jpg", category: "Anarkali", gender: "Women", occasion: ["Festival", "Sangeet"], rating: 4.7, reviews: 312 },
  { id: "wa14", name: "Peach Pearl Layered Anarkali", brand: "Tarun Tahiliani", price: 30000, mrp: 30000, image_key: "wa14.jpg", category: "Anarkali", gender: "Women", occasion: ["Reception"], rating: 4.8, reviews: 178 },
  { id: "wa15", name: "Royal Purple Zari Anarkali", brand: "Ritu Kumar", price: 26999, mrp: 30000, image_key: "wa15.jpg", category: "Anarkali", gender: "Women", occasion: ["Reception", "Sangeet"], rating: 4.7, reviews: 211 },
  { id: "wa16", name: "Ivory Gold Pearl Anarkali", brand: "Manish Malhotra", price: 30000, mrp: 30000, image_key: "wa16.jpg", category: "Anarkali", gender: "Women", occasion: ["Wedding", "Reception"], rating: 4.9, reviews: 267 },
  { id: "wa17", name: "Teal Mirror Festive Anarkali", brand: "Biba", price: 11999, mrp: 17999, image_key: "wa17.jpg", category: "Anarkali", gender: "Women", occasion: ["Festival"], rating: 4.5, reviews: 423 },
  { id: "wa18", name: "Mauve Sequin Reception Anarkali", brand: "Falguni Shane Peacock", price: 30000, mrp: 30000, image_key: "wa18.jpg", category: "Anarkali", gender: "Women", occasion: ["Reception"], rating: 4.7, reviews: 198 },
  { id: "wa19", name: "Sunset Orange Silk Anarkali", brand: "Anita Dongre", price: 18999, mrp: 28999, image_key: "wa19.jpg", category: "Anarkali", gender: "Women", occasion: ["Festival", "Sangeet"], rating: 4.6, reviews: 256 },
  { id: "wa20", name: "Black Pearl Bridal Anarkali", brand: "Sabyasachi Edit", price: 30000, mrp: 30000, image_key: "wa20.jpg", category: "Anarkali", gender: "Women", occasion: ["Reception", "Wedding"], rating: 4.9, reviews: 156 },
  { id: "wa21", name: "Pastel Blue Chikankari Anarkali", brand: "Lucknow Atelier", price: 17999, mrp: 26999, image_key: "wa21.jpg", category: "Anarkali", gender: "Women", occasion: ["Festival", "Pooja"], rating: 4.7, reviews: 289 },

  { id: "wk12", name: "Olive Green Cotton Kurti", brand: "Fabindia", price: 2299, mrp: 3499, image_key: "wk12.jpg", category: "Kurta", gender: "Women", occasion: ["Casual"], rating: 4.5, reviews: 543 },
  { id: "wk13", name: "Hot Pink Embroidered Kurti", brand: "Biba", price: 3799, mrp: 5799, image_key: "wk13.jpg", category: "Kurta", gender: "Women", occasion: ["Festival"], rating: 4.6, reviews: 421 },
  { id: "wk14", name: "White Schiffli Cotton Kurti", brand: "W for Women", price: 2599, mrp: 3899, image_key: "wk14.jpg", category: "Kurta", gender: "Women", occasion: ["Casual"], rating: 4.5, reviews: 612 },
  { id: "wk15", name: "Navy Block-Print Kurti", brand: "Fabindia", price: 2399, mrp: 3699, image_key: "wk15.jpg", category: "Kurta", gender: "Women", occasion: ["Casual", "Festival"], rating: 4.5, reviews: 388 },
  { id: "wk16", name: "Beige Linen A-Line Kurti", brand: "Soch", price: 2799, mrp: 4199, image_key: "wk16.jpg", category: "Kurta", gender: "Women", occasion: ["Casual"], rating: 4.4, reviews: 312 },
  { id: "wk17", name: "Magenta Silk Festive Kurti Set", brand: "Anita Dongre", price: 8499, mrp: 12999, image_key: "wk17.jpg", category: "Kurta", gender: "Women", occasion: ["Festival", "Sangeet"], rating: 4.7, reviews: 245 },
  { id: "wk18", name: "Turquoise Mirror Kurti Set", brand: "Global Desi", price: 4299, mrp: 6499, image_key: "wk18.jpg", category: "Kurta", gender: "Women", occasion: ["Festival"], rating: 4.6, reviews: 287 },
  { id: "wk19", name: "Brown Khadi Straight Kurti", brand: "Fabindia", price: 2199, mrp: 3299, image_key: "wk19.jpg", category: "Kurta", gender: "Women", occasion: ["Casual"], rating: 4.4, reviews: 332 },
  { id: "wk20", name: "Lemon Yellow Floral Kurti", brand: "Aurelia", price: 2899, mrp: 4299, image_key: "wk20.jpg", category: "Kurta", gender: "Women", occasion: ["Casual", "Festival"], rating: 4.5, reviews: 401 },
  { id: "wk21", name: "Rust Gota-Patti Kurti Set", brand: "Biba", price: 4699, mrp: 6999, image_key: "wk21.jpg", category: "Kurta", gender: "Women", occasion: ["Festival", "Pooja"], rating: 4.6, reviews: 298 },

  { id: "mk12", name: "Off-White Linen Festive Kurta", brand: "Tasva", price: 3899, mrp: 5999, image_key: "mk12.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Casual"], rating: 4.5, reviews: 412 },
  { id: "mk13", name: "Navy Brocade Bandhgala Kurta", brand: "Manyavar", price: 7499, mrp: 11499, image_key: "mk13.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Sangeet"], rating: 4.7, reviews: 332 },
  { id: "mk14", name: "Mustard Silk Pathani Kurta", brand: "Tasva", price: 5499, mrp: 8499, image_key: "mk14.jpg", category: "Kurta", gender: "Men", occasion: ["Festival"], rating: 4.6, reviews: 256 },
  { id: "mk15", name: "Grey Mandarin-Collar Kurta", brand: "FabIndia", price: 3299, mrp: 4999, image_key: "mk15.jpg", category: "Kurta", gender: "Men", occasion: ["Casual"], rating: 4.5, reviews: 387 },
  { id: "mk16", name: "Sage Green Cotton Kurta Set", brand: "Tasva", price: 4799, mrp: 7299, image_key: "mk16.jpg", category: "Kurta", gender: "Men", occasion: ["Casual", "Festival"], rating: 4.5, reviews: 312 },
  { id: "mk17", name: "Burgundy Embroidered Kurta Jacket", brand: "Manyavar", price: 9999, mrp: 15499, image_key: "mk17.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Sangeet"], rating: 4.7, reviews: 289 },
  { id: "mk18", name: "Black Silk Asymmetric Kurta", brand: "Manish Malhotra Men", price: 13999, mrp: 21499, image_key: "mk18.jpg", category: "Kurta", gender: "Men", occasion: ["Reception", "Sangeet"], rating: 4.8, reviews: 178 },
  { id: "mk19", name: "Cream Chikankari Kurta Set", brand: "Lucknow Atelier", price: 6999, mrp: 10999, image_key: "mk19.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Casual"], rating: 4.6, reviews: 245 },
  { id: "mk20", name: "Indigo Block-Print Kurta", brand: "FabIndia", price: 2799, mrp: 4199, image_key: "mk20.jpg", category: "Kurta", gender: "Men", occasion: ["Casual"], rating: 4.5, reviews: 421 },
  { id: "mk21", name: "Royal Maroon Brocade Kurta", brand: "Manyavar", price: 6499, mrp: 9999, image_key: "mk21.jpg", category: "Kurta", gender: "Men", occasion: ["Festival", "Pooja"], rating: 4.6, reviews: 311 },

  { id: "ms12", name: "Champagne Pearl Bridal Sherwani", brand: "Tasva", price: 30000, mrp: 30000, image_key: "ms12.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding"], rating: 4.8, reviews: 287 },
  { id: "ms13", name: "Royal Blue Velvet Sherwani", brand: "Manyavar", price: 30000, mrp: 30000, image_key: "ms13.jpg", category: "Sherwani", gender: "Men", occasion: ["Reception", "Sangeet"], rating: 4.7, reviews: 312 },
  { id: "ms14", name: "Ivory Threadwork Wedding Sherwani", brand: "Tarun Tahiliani Men", price: 30000, mrp: 30000, image_key: "ms14.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding"], rating: 4.8, reviews: 198 },
  { id: "ms15", name: "Black Zardozi Reception Sherwani", brand: "Sabyasachi Men", price: 30000, mrp: 30000, image_key: "ms15.jpg", category: "Sherwani", gender: "Men", occasion: ["Reception"], rating: 4.9, reviews: 156 },
  { id: "ms16", name: "Emerald Brocade Sangeet Sherwani", brand: "Manish Malhotra Men", price: 30000, mrp: 30000, image_key: "ms16.jpg", category: "Sherwani", gender: "Men", occasion: ["Sangeet", "Reception"], rating: 4.7, reviews: 211 },
  { id: "ms17", name: "Beige Raw Silk Heritage Sherwani", brand: "Raghavendra Rathore", price: 30000, mrp: 30000, image_key: "ms17.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding"], rating: 4.8, reviews: 167 },
  { id: "ms18", name: "Maroon Gold Embellished Sherwani", brand: "Manyavar", price: 30000, mrp: 30000, image_key: "ms18.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding", "Reception"], rating: 4.7, reviews: 298 },
  { id: "ms19", name: "Pastel Mint Designer Sherwani", brand: "Tasva", price: 28999, mrp: 30000, image_key: "ms19.jpg", category: "Sherwani", gender: "Men", occasion: ["Sangeet"], rating: 4.6, reviews: 178 },
  { id: "ms20", name: "Wine Crystal Bridal Sherwani", brand: "Sabyasachi Men", price: 30000, mrp: 30000, image_key: "ms20.jpg", category: "Sherwani", gender: "Men", occasion: ["Wedding"], rating: 4.9, reviews: 134 },
  { id: "ms21", name: "Charcoal Bandhgala Sherwani", brand: "Tasva", price: 26999, mrp: 30000, image_key: "ms21.jpg", category: "Sherwani", gender: "Men", occasion: ["Reception"], rating: 4.6, reviews: 245 },
];

export const products: Product[] = seed.map((p) => ({ ...p, image: imageMap[p.image_key] }));

export const categories = [
  { name: "Lehengas", image: imageMap["wl1.jpg"], count: products.filter((p) => p.category === "Lehenga").length },
  { name: "Sarees", image: imageMap["ws2.jpg"], count: products.filter((p) => p.category === "Saree").length },
  { name: "Kurtas", image: imageMap["wk1.jpg"], count: products.filter((p) => p.category === "Kurta").length },
  { name: "Sherwanis", image: imageMap["ms3.jpg"], count: products.filter((p) => p.category === "Sherwani").length },
  { name: "Anarkalis", image: imageMap["wa1.jpg"], count: products.filter((p) => p.category === "Anarkali").length },
];

// ----- DB-backed fetchers (admin + future shop wiring) -----
type Row = {
  id: string; name: string; brand: string; price: number; mrp: number;
  image_key: string; image_url: string | null; category: string; gender: string;
  occasion: string[]; rating: number | string; reviews: number; stock: number;
  featured: boolean; active: boolean;
};
function rowToProduct(r: Row): Product {
  return {
    id: r.id, name: r.name, brand: r.brand, price: r.price, mrp: r.mrp,
    image: resolveImage(r), image_key: r.image_key, image_url: r.image_url,
    category: r.category, gender: r.gender, occasion: r.occasion ?? [],
    rating: Number(r.rating), reviews: r.reviews, stock: r.stock,
    featured: r.featured, active: r.active,
  };
}
export async function fetchAllProductsAdmin(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Row[]).map(rowToProduct);
}
export function useAdminProducts() {
  return useQuery({ queryKey: ["admin", "products"], queryFn: fetchAllProductsAdmin, staleTime: 10_000 });
}
