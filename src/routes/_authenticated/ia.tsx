import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, Send, Loader2, Users, MessageSquareText, BarChart3, Megaphone } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const { org } = useCurrentOrg();
  const [input, setInput] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
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

  const runAction = async (key: string) => {
    if (!org || isLoading) return;
    setBusyAction(key);
    try {
      const prompt = await buildActionPrompt(key, org.id, org.name);
      if (!prompt) return;
      await sendMessage({ text: prompt });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao preparar contexto");
    } finally {
      setBusyAction(null);
    }
  };

  const actions = [
    { key: "summarize", label: "Resumir base de clientes", icon: Users },
    { key: "campaign", label: "Gerar campanha WhatsApp", icon: Megaphone },
    { key: "welcome", label: "Mensagem de boas-vindas", icon: MessageSquareText },
    { key: "report", label: "Relatório do mês em texto", icon: BarChart3 },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Assistente IA"
        description="Crie mensagens, campanhas e tire dúvidas sobre seu negócio."
        actions={<Badge variant="outline" className="gap-1"><Sparkles className="size-3" /> Powered by Lovable AI</Badge>}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {actions.map(a => (
          <Button
            key={a.key}
            variant="outline"
            className="justify-start gap-2 h-auto py-3"
            disabled={isLoading || !org}
            onClick={() => runAction(a.key)}
          >
            {busyAction === a.key ? <Loader2 className="size-4 animate-spin" /> : <a.icon className="size-4 text-primary" />}
            <span className="text-sm text-left">{a.label}</span>
          </Button>
        ))}
      </div>

      <Card className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-chart-4 grid place-items-center text-primary-foreground mb-4">
                <Sparkles className="size-6" />
              </div>
              <h2 className="font-display font-bold text-xl">Como posso ajudar hoje?</h2>
              <p className="text-sm text-muted-foreground mt-1">Use as ações rápidas acima ou peça algo abaixo.</p>
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

async function buildActionPrompt(key: string, orgId: string, orgName: string): Promise<string | null> {
  if (key === "summarize") {
    const res = await supabase
      .from("customers")
      .select("name,status,tags,pipeline_stage,created_at")
      .eq("organization_id", orgId)
      .limit(200);
    const cs = (res.data ?? []) as any[];
    const total = cs.length;
    const byStatus = cs.reduce<Record<string, number>>((a, c) => { a[c.status] = (a[c.status] ?? 0) + 1; return a; }, {});
    const byStage = cs.reduce<Record<string, number>>((a, c) => { a[c.pipeline_stage || "new"] = (a[c.pipeline_stage || "new"] ?? 0) + 1; return a; }, {});
    const tagCount = cs.flatMap(c => c.tags ?? []).reduce<Record<string, number>>((a, t) => { a[t] = (a[t] ?? 0) + 1; return a; }, {});
    return `Resuma a base de clientes de ${orgName} e dê 5 insights acionáveis.\n\nTotal: ${total}\nPor status: ${JSON.stringify(byStatus)}\nPor etapa do funil: ${JSON.stringify(byStage)}\nTags mais comuns: ${JSON.stringify(tagCount)}`;
  }

  if (key === "campaign") {
    const res = await supabase
      .from("customers")
      .select("name,tags")
      .eq("organization_id", orgId)
      .eq("status", "inactive")
      .limit(20);
    const inactive = (res.data ?? []) as any[];
    return `Crie uma campanha de reativação via WhatsApp para ${orgName}. ${inactive.length} clientes inativos (exemplos de nomes: ${inactive.slice(0,5).map(c => c.name).join(", ") || "—"}).\n\nEntregue:\n1) Objetivo da campanha\n2) Mensagem WhatsApp curta com personalização {{nome}} (máx. 3 linhas)\n3) Mensagem de follow-up 3 dias depois\n4) Oferta sugerida\n5) KPI para medir.`;
  }

  if (key === "welcome") {
    return `Escreva 3 variações de mensagem de boas-vindas via WhatsApp para um novo cliente de ${orgName}. Tom: acolhedor, profissional, brasileiro. Inclua placeholder {{nome}} e {{empresa}}. Máximo 4 linhas cada.`;
  }

  if (key === "report") {
    const since = new Date(); since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString();
    const [txs, newCs, appts] = await Promise.all([
      supabase.from("transactions").select("kind,amount").eq("organization_id", orgId).gte("created_at", sinceISO),
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", sinceISO),
      supabase.from("appointments").select("status").eq("organization_id", orgId).gte("starts_at", sinceISO),
    ]);
    const income = (txs.data ?? []).filter((t: any) => t.kind === "income").reduce((s, t: any) => s + Number(t.amount), 0);
    const expense = (txs.data ?? []).filter((t: any) => t.kind === "expense").reduce((s, t: any) => s + Number(t.amount), 0);
    const apptByStatus = (appts.data ?? []).reduce<Record<string, number>>((a, x: any) => { a[x.status] = (a[x.status] ?? 0) + 1; return a; }, {});
    return `Escreva um relatório executivo dos últimos 30 dias para ${orgName}, em linguagem natural e tom profissional brasileiro.\n\nDados:\n- Receita: R$ ${income.toFixed(2)}\n- Despesa: R$ ${expense.toFixed(2)}\n- Lucro: R$ ${(income-expense).toFixed(2)}\n- Novos clientes: ${newCs.count ?? 0}\n- Agendamentos por status: ${JSON.stringify(apptByStatus)}\n\nFormato: resumo executivo (3 linhas), destaques, pontos de atenção, e 3 recomendações.`;
  }
  return null;
}

