import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, User, Send, MessageCircle, CircleDot, Sparkles, Loader2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { listWaConversations, listWaMessages, sendWaReply, setWaConversationStatus } from "@/lib/wa.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/wa-inbox")({
  head: () => ({ meta: [{ title: "WhatsApp — Caixa de entrada" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: WaInboxPage,
});

function WaInboxPage() {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();
  const fetchConvs = useServerFn(listWaConversations);
  const fetchMsgs = useServerFn(listWaMessages);
  const sendReply = useServerFn(sendWaReply);
  const setStatus = useServerFn(setWaConversationStatus);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { data: convs = [] } = useQuery({
    enabled: !!org?.id,
    queryKey: ["wa_convs", org?.id],
    queryFn: () => fetchConvs({ data: { organizationId: org!.id } }),
    refetchInterval: 5000,
  });

  const { data: msgs = [] } = useQuery({
    enabled: !!selectedId,
    queryKey: ["wa_msgs", selectedId],
    queryFn: () => fetchMsgs({ data: { conversationId: selectedId! } }),
    refetchInterval: 4000,
  });

  const selected = convs.find(c => c.id === selectedId);

  const send = useMutation({
    mutationFn: () => sendReply({ data: { organizationId: org!.id, conversationId: selectedId!, text: draft } }),
    onSuccess: () => { setDraft(""); qc.invalidateQueries({ queryKey: ["wa_msgs", selectedId] }); qc.invalidateQueries({ queryKey: ["wa_convs"] }); },
    onError: (e: any) => toast.error(e.message ?? "Falha ao enviar"),
  });

  const updateStatus = useMutation({
    mutationFn: (status: "bot" | "human" | "closed") => setStatus({ data: { conversationId: selectedId!, status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wa_convs"] }); toast.success("Status atualizado"); },
  });

  return (
    <PageContainer>
      <PageHeader title="Caixa de entrada WhatsApp" description="Conversas recebidas via WhatsApp Business. Acompanhe a IA ou assuma o controle." />

      <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        <Card className="overflow-hidden flex flex-col">
          <div className="p-3 border-b text-sm font-medium flex items-center justify-between">
            <span>Conversas</span>
            <Badge variant="secondary">{convs.length}</Badge>
          </div>
          <div className="flex-1 overflow-auto divide-y">
            {convs.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma conversa ainda. Configure o canal em <a className="text-primary underline" href="/wa-config">WhatsApp Config</a> e mande "oi" do seu celular.
              </div>
            )}
            {convs.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn("w-full text-left p-3 hover:bg-muted/50 transition flex flex-col gap-1", selectedId === c.id && "bg-muted")}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate text-sm">{c.wa_name || c.wa_phone}</div>
                  {c.unread_count > 0 && <CircleDot className="size-3 text-primary shrink-0" />}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">{c.wa_phone}</span>
                  <StatusPill status={c.status} />
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              <div className="text-center">
                <MessageCircle className="size-10 mx-auto mb-2 opacity-30" />
                Selecione uma conversa
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{selected.wa_name || selected.wa_phone}</div>
                  <div className="text-xs text-muted-foreground">{selected.wa_phone}</div>
                </div>
                <div className="flex gap-2">
                  <StatusPill status={selected.status} />
                  {selected.status !== "human" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("human")}>Assumir</Button>}
                  {selected.status !== "bot" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("bot")}>Devolver à IA</Button>}
                  {selected.status !== "closed" && <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate("closed")}>Encerrar</Button>}
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3 bg-muted/20">
                {msgs.map(m => (
                  <div key={m.id} className={cn("flex", m.direction === "in" ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm",
                      m.direction === "in" ? "bg-card border" : "bg-primary text-primary-foreground"
                    )}>
                      {m.text || <em className="opacity-60">(sem texto)</em>}
                      <div className={cn("text-[10px] mt-1 flex items-center gap-1 opacity-70")}>
                        {m.ai_used && <Bot className="size-3" />}
                        {!m.ai_used && m.direction === "out" && <User className="size-3" />}
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {m.error && <span className="text-destructive">· {m.error}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t flex gap-2">
                <Textarea
                  rows={2}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Mensagem manual (a IA pausa enquanto o status estiver em 'humano')"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (draft.trim()) send.mutate(); } }}
                />
                <Button onClick={() => send.mutate()} disabled={!draft.trim() || send.isPending} className="gap-1 self-end">
                  <Send className="size-4" /> Enviar
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    bot: { label: "IA", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    human: { label: "Humano", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    closed: { label: "Encerrada", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? map.bot;
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", s.cls)}>{s.label}</span>;
}
