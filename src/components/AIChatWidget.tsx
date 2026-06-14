import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";

const seedMsgs = [
  { role: "ai" as const, text: "Namaste! ✨ I'm your VastraAI Stylist. Tell me the occasion or outfit style you are seeking, and I'll curate the perfect royal Indian couture look for you." },
];

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState(seedMsgs);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Smooth auto-scroll to the latest message or loader
  useEffect(() => {
    if (open) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgs, isLoading, open]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input;
    const updatedMsgs = [...msgs, { role: "user" as const, text: userText }];
    setMsgs(updatedMsgs);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: updatedMsgs }),
      });

      if (!response.ok) {
        throw new Error("Atelier connection failed");
      }

      const data = await response.json();
      if (data.text) {
        setMsgs([...updatedMsgs, { role: "ai" as const, text: data.text }]);
      } else {
        throw new Error("No response from stylist");
      }
    } catch (err) {
      console.error("VastraAI Chatbot error:", err);
      setMsgs([
        ...updatedMsgs,
        {
          role: "ai" as const,
          text: "Forgive me, my connections to our designer ateliers are slightly delayed at the moment. Please ask me again, and I'll gladly retrieve the couture details for you.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} suppressHydrationWarning className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-royal text-gold flex items-center justify-center shadow-elegant animate-pulse-glow">
          <Sparkles className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[92vw] h-[550px] bg-card rounded-2xl shadow-elegant border border-border flex flex-col overflow-hidden animate-float-up">
          <div className="bg-royal text-primary-foreground p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-gold-grad flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary"/></div>
              <div>
                <div className="font-display text-lg leading-none text-gold">VastraAI Stylist</div>
                <div className="text-[11px] opacity-75">Curating Regal Heritage Lookbooks</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} suppressHydrationWarning className="opacity-70 hover:opacity-100"><X className="h-4 w-4"/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] text-sm rounded-2xl px-3.5 py-2.5 whitespace-pre-wrap leading-relaxed ${m.role === "ai" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground ml-auto"}`}>
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div className="max-w-[85%] text-sm rounded-2xl px-3.5 py-2.5 bg-secondary text-secondary-foreground flex items-center gap-1.5 self-start">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-[11px] text-muted-foreground ml-1">Consulting Vastra catalogs…</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t flex gap-2 bg-card">
            <input 
              value={input} 
              suppressHydrationWarning 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === "Enter" && send()} 
              disabled={isLoading}
              placeholder="Ask for wedding looks, returns, lehengas…" 
              className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-75" 
            />
            <button 
              onClick={send} 
              disabled={isLoading || !input.trim()}
              suppressHydrationWarning 
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-gold-grad hover:text-primary transition disabled:opacity-50"
            >
              <Send className="h-4 w-4"/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
