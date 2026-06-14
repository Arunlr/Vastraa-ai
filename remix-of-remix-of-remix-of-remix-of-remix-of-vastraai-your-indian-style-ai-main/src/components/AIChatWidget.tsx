import { useState } from "react";
import { Sparkles, X, Send } from "lucide-react";

const seedMsgs = [
  { role: "ai", text: "Namaste! ✨ I'm your AI Stylist. Tell me the occasion and I'll curate looks for you." },
];

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState(seedMsgs);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userText = input;
    setMsgs(m => [...m, { role: "user", text: userText }]);
    setInput("");
    setTimeout(() => {
      setMsgs(m => [...m, { role: "ai", text: `For "${userText}", I'd recommend a Banarasi silk saree in a jewel tone — pairs beautifully with statement jhumkas. Want me to build a full look?` }]);
    }, 700);
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-royal text-gold flex items-center justify-center shadow-elegant animate-pulse-glow">
          <Sparkles className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[92vw] h-[520px] bg-card rounded-2xl shadow-elegant border border-border flex flex-col overflow-hidden animate-float-up">
          <div className="bg-royal text-primary-foreground p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-gold-grad flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary"/></div>
              <div>
                <div className="font-display text-lg leading-none">AI Stylist</div>
                <div className="text-[11px] opacity-75">Powered by VastraAI</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100"><X className="h-4 w-4"/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] text-sm rounded-2xl px-3.5 py-2.5 ${m.role === "ai" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground ml-auto"}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask for outfit ideas…" className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" />
            <button onClick={send} className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-gold-grad hover:text-primary"><Send className="h-4 w-4"/></button>
          </div>
        </div>
      )}
    </>
  );
}
