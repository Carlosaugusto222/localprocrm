import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/ia")({
  head: () => ({ meta: [{ title: "Assistente IA — LocalPro CRM" }] }),
  component: AI,
});

const suggestions = [
  "Crie uma campanha de fim de ano para fidelizar clientes inativos",
  "Escreva uma mensagem de boas-vindas para um novo cliente",
  "Sugira 3 ideias para aumentar o ticket médio",
  "Como reduzir faltas em agendamentos?",
];

function AI() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  const submit = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Assistente IA"
        description="Crie mensagens, campanhas e tire dúvidas sobre seu negócio."
        actions={<Badge variant="outline" className="gap-1"><Sparkles className="size-3" /> Powered by Lovable AI</Badge>}
      />

      <Card className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-chart-4 grid place-items-center text-primary-foreground mb-4">
                <Sparkles className="size-6" />
              </div>
              <h2 className="font-display font-bold text-xl">Como posso ajudar hoje?</h2>
              <p className="text-sm text-muted-foreground mt-1">Peça mensagens, campanhas, ideias e mais.</p>
              <div className="grid sm:grid-cols-2 gap-2 mt-6 w-full">
                {suggestions.map(s => (
                  <button key={s} onClick={() => submit(s)} className="text-left text-sm p-3 rounded-lg border hover:border-primary/40 hover:bg-accent transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.parts.map((p, i) => p.type === "text" ? <span key={i}>{p.text}</span> : null)}
                </div>
              </div>
            ))
          )}
          {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Pensando...</div>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className="border-t p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte algo..." disabled={isLoading} />
          <Button type="submit" disabled={isLoading || !input.trim()}><Send className="size-4" /></Button>
        </form>
      </Card>
    </PageContainer>
  );
}
