import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
function createSSEParser(onEvent: (ev: { event: string; data: string }) => void) {
  let buf = "";
  return {
    feed(chunk: string) {
      buf += chunk;
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) !== -1 || (idx = buf.indexOf("\r\n\r\n")) !== -1) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + (buf[idx] === "\r" ? 4 : 2));
        let event = "message";
        const dataLines: string[] = [];
        for (const line of raw.split(/\r?\n/)) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
        }
        if (dataLines.length) onEvent({ event, data: dataLines.join("\n") });
      }
    },
  };
}
import { Camera, Upload, Sparkles, Wand2, ShoppingBag, CheckCircle2, RotateCcw, Crown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useServerFn } from "@tanstack/react-start";
import { analyzePhoto, recommendOutfits, type StyleAnalysis, type Recommendation } from "@/lib/ai-stylist.functions";
import { resolveImage } from "@/lib/product-images";
import { useCart } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/try-on")({
  component: TryOn,
  head: () => ({ meta: [
    { title: "AI Stylist & Virtual Try-On · VastraAI" },
    { name: "description", content: "Upload a photo, choose an occasion, and see yourself in luxury couture — instantly, with AI." },
  ]}),
});

type Occasion = "Wedding" | "Festival" | "Casual" | "Office" | "Party" | "Reception" | "Traditional";
const OCCASIONS: { key: Occasion; emoji: string }[] = [
  { key: "Wedding", emoji: "💍" },
  { key: "Reception", emoji: "🥂" },
  { key: "Festival", emoji: "🪔" },
  { key: "Traditional", emoji: "🕉️" },
  { key: "Party", emoji: "✨" },
  { key: "Office", emoji: "💼" },
  { key: "Casual", emoji: "☕" },
];
const MODES = ["Full Outfit", "Top Only", "Bottom Only", "Footwear Only"] as const;
type Mode = (typeof MODES)[number];

type Step = "upload" | "analyzing" | "occasion" | "recommending" | "results" | "tryon";

async function toDataUrl(input: File | string): Promise<string> {
  const readAsDataURL = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  let dataUrl: string;
  if (typeof input === "string") {
    dataUrl = input.startsWith("data:") ? input : await readAsDataURL(await (await fetch(input)).blob());
  } else {
    dataUrl = await readAsDataURL(input);
  }
  // Normalize to JPEG and downscale (gateway rejects oversized / unknown-mime data URLs).
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not decode image. Try a JPG or PNG."));
    img.src = dataUrl;
  });
  const MAX = 1280;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.9);
}

function TryOn() {
  const [step, setStep] = useState<Step>("upload");
  const [userImage, setUserImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [picked, setPicked] = useState<{ rec: Recommendation; product: any } | null>(null);
  const [tryOnSrc, setTryOnSrc] = useState<string | null>(null);
  const [tryOnFinal, setTryOnFinal] = useState(false);
  const [mode, setMode] = useState<Mode>("Full Outfit");
  const [err, setErr] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const analyze = useServerFn(analyzePhoto);
  const recommend = useServerFn(recommendOutfits);
  const { add: addToCart } = useCart();

  const handleFile = async (f: File) => {
    setErr(null);
    const url = await toDataUrl(f);
    setUserImage(url);
    setStep("analyzing");
    try {
      const a = await analyze({ data: { image: url } });
      setAnalysis(a);
      setStep("occasion");
    } catch (e: any) {
      setErr(e?.message ?? "Analysis failed");
      setStep("upload");
    }
  };

  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(s);
    } catch { toast.error("Camera access denied"); }
  };

  // Attach the MediaStream once the <video> element is mounted.
  useEffect(() => {
    if (!stream) return;
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    v.play().catch(() => {});
  }, [stream]);
  const capture = async () => {
    if (!videoRef.current) return;
    const c = document.createElement("canvas");
    c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight;
    c.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.92);
    stream?.getTracks().forEach((t) => t.stop()); setStream(null);
    // Build a fake file from data URL
    const blob = await (await fetch(dataUrl)).blob();
    await handleFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
  };

  const pickOccasion = async (occ: Occasion) => {
    if (!analysis) return;
    setOccasion(occ);
    setStep("recommending");
    setErr(null);
    try {
      const r = await recommend({ data: { analysis, occasion: occ } });
      setRecs(r.recommendations);
      setProducts(r.products);
      setStep("results");
    } catch (e: any) {
      setErr(e?.message ?? "Recommendation failed");
      setStep("occasion");
    }
  };

  const startTryOn = async (rec: Recommendation, product: any) => {
    setPicked({ rec, product });
    setStep("tryon");
    setTryOnSrc(null);
    setTryOnFinal(false);
    setErr(null);
    if (!userImage) return;
    try {
      const productImageUrl = product.image_url ?? resolveImage(product);
      const productImageData = await toDataUrl(productImageUrl);
      const res = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userImage,
          productImage: productImageData,
          productName: product.name,
          mode,
        }),
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        throw new Error(`Try-on failed (${res.status}): ${t.slice(0, 200)}`);
      }
      const parser = createSSEParser((ev) => {
          if (ev.event !== "image_generation.partial_image" && ev.event !== "image_generation.completed") return;
          try {
            const payload = JSON.parse(ev.data);
            const isFinal = ev.event === "image_generation.completed";
            flushSync(() => {
              setTryOnSrc(`data:image/png;base64,${payload.b64_json}`);
              if (isFinal) setTryOnFinal(true);
            });
          } catch {}
      });
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(value);
      }
      setTryOnFinal(true);
    } catch (e: any) {
      setErr(e?.message ?? "Virtual try-on failed");
    }
  };

  const reset = () => {
    setStep("upload"); setUserImage(null); setAnalysis(null); setOccasion(null);
    setRecs([]); setProducts([]); setPicked(null); setTryOnSrc(null); setTryOnFinal(false); setErr(null);
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-amber-50">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-amber-500/10 bg-gradient-to-b from-[#1c1410] to-[#0c0a09]">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] uppercase tracking-[0.25em] text-amber-300">
            <Crown className="h-3 w-3" /> Maison VastraAI · Studio
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold mt-4">
            Your <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">Personal Couturier</span>
          </h1>
          <p className="opacity-70 mt-3 max-w-2xl">Upload a portrait. The AI reads your silhouette and palette, curates couture for your occasion, and renders you in the look — photorealistic, in seconds.</p>
          <Stepper step={step} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 md:px-8 py-12">
        {err && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{err}</div>
        )}

        {step === "upload" && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <div className="aspect-[4/5] rounded-3xl bg-[#15110d] border border-amber-500/15 overflow-hidden relative">
                {stream ? (
                  <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-8">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-200 flex items-center justify-center shadow-[0_0_60px_-10px_rgba(251,191,36,0.6)] mb-5">
                      <Wand2 className="h-9 w-9 text-[#0c0a09]" />
                    </div>
                    <h3 className="font-display text-2xl">Begin your fitting</h3>
                    <p className="text-sm text-amber-200/60 mt-2 max-w-xs">Full-body or upper-body portrait. Photo is processed in-memory, never stored.</p>
                  </div>
                )}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <label className="cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-300 text-[#0c0a09] py-3.5 rounded-full font-bold hover:brightness-110 transition">
                  <Upload className="h-4 w-4" /> Upload Portrait
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
                </label>
                {stream ? (
                  <button onClick={capture} className="bg-amber-300 text-[#0c0a09] py-3.5 rounded-full font-bold flex items-center justify-center gap-2">
                    <Camera className="h-4 w-4" /> Capture
                  </button>
                ) : (
                  <button onClick={openCamera} className="border-2 border-amber-400/60 text-amber-200 py-3.5 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-amber-400/10 transition">
                    <Camera className="h-4 w-4" /> Use Camera
                  </button>
                )}
              </div>
            </div>
            <FeatureList />
          </div>
        )}

        {step === "analyzing" && (
          <BigLoader title="Reading your silhouette…" hint="Body proportions · Skin tone · Colour palette · Personal style" image={userImage} />
        )}

        {(step === "occasion" || step === "recommending" || step === "results" || step === "tryon") && analysis && (
          <div className="mb-10">
            <AnalysisPanel analysis={analysis} image={userImage} onReset={reset} />
          </div>
        )}

        {step === "occasion" && (
          <div>
            <h2 className="font-display text-3xl">Choose the occasion</h2>
            <p className="text-amber-200/60 mt-1 text-sm">Your couturier curates the perfect look for the moment.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
              {OCCASIONS.map((o) => (
                <button key={o.key} onClick={() => pickOccasion(o.key)}
                  className="group bg-[#15110d] border border-amber-500/15 hover:border-amber-400/60 rounded-2xl p-4 text-left transition hover:bg-[#1c1410]">
                  <div className="text-3xl">{o.emoji}</div>
                  <div className="font-display text-lg mt-2">{o.key}</div>
                  <div className="text-[11px] text-amber-200/40 mt-1 group-hover:text-amber-300 transition">Curate ›</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "recommending" && (
          <BigLoader title={`Curating couture for ${occasion}…`} hint="Cross-referencing 200+ ateliers, palettes and silhouettes" />
        )}

        {step === "results" && (
          <div>
            <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-amber-400">Curated for {occasion}</div>
                <h2 className="font-display text-3xl mt-1">Your couturier's edit</h2>
              </div>
              <button onClick={() => setStep("occasion")} className="text-sm text-amber-300/80 hover:text-amber-200 flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5"/> Change occasion</button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {recs.map((rec) => {
                const p = products.find((x) => x.id === rec.product_id);
                if (!p) return null;
                const img = p.image_url ?? resolveImage(p);
                return (
                  <div key={rec.product_id} className="bg-[#15110d] border border-amber-500/15 rounded-3xl overflow-hidden flex flex-col md:flex-row">
                    <div className="md:w-48 aspect-square md:aspect-auto bg-amber-500/5 flex-shrink-0">
                      <img src={img} alt={p.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400">{p.brand}</div>
                      <div className="font-display text-xl mt-1">{p.name}</div>
                      <p className="text-sm text-amber-200/70 mt-2 italic">"{rec.reason}"</p>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                        <ScorePill label="Occasion" v={rec.occasion_score} />
                        <ScorePill label="Luxury" v={rec.luxury_score} />
                        <ScorePill label="Style Match" v={rec.style_score} />
                      </div>
                      <div className="mt-3 text-xs text-amber-200/70">
                        <div>👞 {rec.matching_footwear}</div>
                        <div>💎 {rec.matching_accessory}</div>
                      </div>
                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <div className="text-amber-100 font-bold">₹{(p.price ?? 0).toLocaleString("en-IN")}</div>
                        <button onClick={() => startTryOn(rec, p)} className="bg-gradient-to-r from-amber-400 to-yellow-300 text-[#0c0a09] px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" /> Try On
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {recs.length === 0 && (
                <div className="md:col-span-2 text-center py-12 text-amber-200/60">No matches in catalog for this occasion yet.</div>
              )}
            </div>
          </div>
        )}

        {step === "tryon" && picked && (
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-amber-400">Virtual Fitting</div>
              <h2 className="font-display text-3xl mt-1">{picked.product.name}</h2>
              <div className="mt-5 aspect-[4/5] rounded-3xl bg-[#15110d] border border-amber-500/15 overflow-hidden relative grid place-items-center">
                {tryOnSrc ? (
                  <img src={tryOnSrc} alt="Virtual try-on" className={`h-full w-full object-cover transition-[filter] duration-500 ${tryOnFinal ? "blur-0" : "blur-xl"}`} />
                ) : (
                  <div className="text-center p-8">
                    <div className="h-16 w-16 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mx-auto"/>
                    <div className="mt-4 font-display text-xl">Tailoring the look on you…</div>
                    <div className="text-xs text-amber-200/60 mt-1">Photoreal rendering with garment lighting</div>
                  </div>
                )}
                {tryOnSrc && !tryOnFinal && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur text-amber-200 text-xs px-3 py-1.5 rounded-full">Refining details…</div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {MODES.map((m) => (
                  <button key={m} onClick={() => { setMode(m); startTryOn(picked.rec, picked.product); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${mode === m ? "bg-amber-400 text-[#0c0a09] border-amber-400" : "border-amber-500/30 text-amber-200/80 hover:border-amber-400/60"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="bg-[#15110d] border border-amber-500/15 rounded-3xl overflow-hidden">
                <img src={picked.product.image_url ?? resolveImage(picked.product)} alt={picked.product.name} className="w-full aspect-[4/5] object-cover"/>
              </div>
              <div className="mt-5 bg-gradient-to-br from-amber-500/15 to-amber-500/0 border border-amber-500/20 rounded-2xl p-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400">{picked.product.brand}</div>
                <div className="font-display text-2xl mt-1">{picked.product.name}</div>
                <div className="text-amber-100 text-xl mt-1 font-bold">₹{(picked.product.price ?? 0).toLocaleString("en-IN")}</div>
                <p className="text-sm text-amber-200/70 mt-3 italic">"{picked.rec.reason}"</p>
                <div className="grid grid-cols-3 gap-2 mt-4 text-[10px]">
                  <ScorePill label="Occasion" v={picked.rec.occasion_score} />
                  <ScorePill label="Luxury" v={picked.rec.luxury_score} />
                  <ScorePill label="Style" v={picked.rec.style_score} />
                </div>
                <div className="mt-4 text-sm text-amber-200/80 space-y-1">
                  <div>👞 <b>Pair with:</b> {picked.rec.matching_footwear}</div>
                  <div>💎 <b>Accessory:</b> {picked.rec.matching_accessory}</div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => { addToCart(picked.product as any); toast.success("Added to your atelier bag"); }}
                    className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-300 text-[#0c0a09] py-3 rounded-full font-bold flex items-center justify-center gap-2">
                    <ShoppingBag className="h-4 w-4" /> Add to Cart
                  </button>
                  <button onClick={() => setStep("results")} className="px-4 py-3 rounded-full border border-amber-500/30 text-amber-200 text-sm">Back</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels: { key: Step | "tryon"; label: string }[] = [
    { key: "upload", label: "Portrait" },
    { key: "analyzing", label: "Analysis" },
    { key: "occasion", label: "Occasion" },
    { key: "results", label: "Curation" },
    { key: "tryon", label: "Try-On" },
  ];
  const order: Record<Step, number> = { upload: 0, analyzing: 1, occasion: 2, recommending: 3, results: 3, tryon: 4 };
  const active = order[step];
  return (
    <div className="mt-8 flex flex-wrap items-center gap-2">
      {labels.map((l, i) => (
        <div key={l.key} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition ${i <= active ? "bg-amber-400/15 border-amber-400/50 text-amber-200" : "border-amber-500/15 text-amber-200/40"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${i <= active ? "bg-amber-300" : "bg-amber-200/30"}`} />
            {l.label}
          </div>
          {i < labels.length - 1 && <div className="h-px w-6 bg-amber-500/20" />}
        </div>
      ))}
    </div>
  );
}

function FeatureList() {
  return (
    <div className="space-y-4">
      {[
        { t: "AI Body & Palette Reading", d: "Silhouette, proportions, tone — all read in seconds. Never stored." },
        { t: "Couture Curation", d: "Picks from a 200+ atelier catalog, scored on occasion, luxury, and your style." },
        { t: "Photorealistic Try-On", d: "See yourself in the look. Face, hair and proportions preserved." },
        { t: "Stylist's Pairings", d: "Footwear, jewellery, and a colour palette curated for the moment." },
      ].map((f) => (
        <div key={f.t} className="bg-[#15110d] border border-amber-500/15 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-amber-300 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-display text-lg">{f.t}</div>
              <div className="text-sm text-amber-200/60 mt-1">{f.d}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BigLoader({ title, hint, image }: { title: string; hint: string; image?: string | null }) {
  return (
    <div className="grid md:grid-cols-[1fr_1.2fr] gap-10 items-center py-10">
      <div className="aspect-[4/5] rounded-3xl bg-[#15110d] border border-amber-500/15 overflow-hidden relative">
        {image && <img src={image} className="h-full w-full object-cover opacity-50"/>}
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-24 w-24 rounded-full border-4 border-amber-400 border-t-transparent animate-spin"/>
        </div>
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent animate-pulse" />
      </div>
      <div>
        <h2 className="font-display text-4xl">{title}</h2>
        <p className="text-amber-200/60 mt-3">{hint}</p>
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis, image, onReset }: { analysis: StyleAnalysis; image: string | null; onReset: () => void }) {
  return (
    <div className="bg-gradient-to-br from-[#1c1410] to-[#15110d] border border-amber-500/20 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row gap-5">
      {image && <img src={image} className="h-28 w-28 rounded-2xl object-cover border border-amber-500/30 flex-shrink-0" />}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Field k="Silhouette" v={analysis.body_proportions} />
        <Field k="Height" v={analysis.height_category} />
        <Field k="Skin tone" v={analysis.skin_tone} />
        <Field k="Style" v={analysis.style_preference} />
        <div className="col-span-2 md:col-span-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400/70">Best palette</div>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {analysis.best_colors.map((c) => (
              <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-200">{c}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between gap-3">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400/70">AI Confidence</div>
          <div className="font-display text-3xl text-amber-200">{analysis.ai_confidence}%</div>
        </div>
        <button onClick={onReset} className="text-xs text-amber-300/70 hover:text-amber-200 flex items-center gap-1"><RotateCcw className="h-3 w-3"/> New portrait</button>
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-[#0c0a09]/60 rounded-xl p-2.5 border border-amber-500/10">
      <div className="text-[10px] uppercase tracking-[0.15em] text-amber-400/70">{k}</div>
      <div className="text-amber-100 mt-0.5 capitalize">{v}</div>
    </div>
  );
}

function ScorePill({ label, v }: { label: string; v: number }) {
  return (
    <div className="bg-[#0c0a09]/60 border border-amber-500/15 rounded-lg p-2 text-center">
      <div className="text-amber-400/70 uppercase tracking-wider">{label}</div>
      <div className="text-amber-200 font-display text-base">{v}</div>
    </div>
  );
}
