import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Loader2, Trash2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/planejamento")({
  head: () => ({ meta: [{ title: "Planejamento — LocalPro CRM" }] }),
  component: Planejamento,
});

type Event = {
  id: string; title: string; description: string | null; category: string;
  event_date: string; event_time: string | null; status: string;
};

const CATEGORIES = [
  { id: "campanha", label: "Campanha", color: "bg-blue-500" },
  { id: "promocao", label: "Promoção", color: "bg-amber-500" },
  { id: "publicacao", label: "Publicação", color: "bg-violet-500" },
  { id: "lembrete", label: "Lembrete", color: "bg-emerald-500" },
];

function catMeta(id: string) { return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0]; }

function Planejamento() {
  const { org } = useCurrentOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const [openAi, setOpenAi] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const { data: events = [] } = useQuery({
    enabled: !!org?.id,
    queryKey: ["marketing_calendar", org?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_calendar" as any)
        .select("*")
        .eq("organization_id", org!.id)
        .gte("event_date", format(gridStart, "yyyy-MM-dd"))
        .lte("event_date", format(gridEnd, "yyyy-MM-dd"))
        .order("event_date");
      if (error) throw error;
      return (data ?? []) as unknown as Event[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Partial<Event> & { id?: string }) => {
      if (payload.id) {
        const { error } = await supabase.from("marketing_calendar" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketing_calendar" as any).insert({
          ...payload, organization_id: org!.id, user_id: user!.id,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketing_calendar"] }); setOpenDialog(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_calendar" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["marketing_calendar"] }); setOpenDialog(false); setEditing(null); toast.success("Removido"); },
  });

  const days = useMemo(() => {
    const arr: Date[] = []; let d = gridStart;
    while (d <= gridEnd) { arr.push(d); d = new Date(d.getTime() + 86400000); }
    return arr;
  }, [gridStart, gridEnd]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of events) {
      const key = e.event_date;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    }
    return m;
  }, [events]);

  const openNew = (date: Date) => { setSelectedDate(date); setEditing(null); setOpenDialog(true); };
  const openEdit = (ev: Event) => { setEditing(ev); setSelectedDate(new Date(ev.event_date + "T00:00:00")); setOpenDialog(true); };

  return (
    <PageContainer>
      <PageHeader
        title="Planejamento"
        description="Calendário de campanhas, promoções e ações de marketing."
        actions={
          <>
            <Button variant="outline" onClick={() => setOpenAi(true)} className="gap-2"><Sparkles className="size-4" /> Criar com IA</Button>
            <Button onClick={() => openNew(new Date())} className="gap-2"><Plus className="size-4" /> Novo evento</Button>
          </>
        }
      />

      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-xl capitalize">{format(cursor, "MMMM yyyy", { locale: ptBR })}</h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, -1))}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden text-xs">
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
            <div key={d} className="bg-muted/50 p-2 text-center font-medium text-muted-foreground">{d}</div>
          ))}
          {days.map(d => {
            const key = format(d, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) ?? [];
            const isToday = isSameDay(d, new Date());
            const inMonth = isSameMonth(d, cursor);
            return (
              <button
                key={key}
                onClick={() => openNew(d)}
                className={`bg-card min-h-[96px] p-1.5 text-left flex flex-col gap-1 hover:bg-accent/40 transition-colors ${!inMonth ? "opacity-40" : ""}`}
              >
                <span className={`text-[11px] font-medium ${isToday ? "size-5 rounded-full bg-primary text-primary-foreground grid place-items-center" : "text-muted-foreground"}`}>
                  {format(d, "d")}
                </span>
                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map(ev => {
                    const c = catMeta(ev.category);
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                        className="text-[10px] truncate rounded px-1 py-0.5 bg-muted hover:bg-muted-foreground/10 flex items-center gap-1"
                      >
                        <span className={`size-1.5 rounded-full ${c.color}`} />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</div>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
          {CATEGORIES.map(c => (
            <div key={c.id} className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${c.color}`} />{c.label}</div>
          ))}
        </div>
      </Card>

      <EventDialog
        open={openDialog} onOpenChange={setOpenDialog}
        editing={editing} date={selectedDate}
        onSave={(p) => upsert.mutate({ ...p, id: editing?.id })}
        onDelete={editing ? () => remove.mutate(editing.id) : undefined}
        saving={upsert.isPending}
      />
      <AiDialog open={openAi} onOpenChange={setOpenAi} onPick={(text) => {
        setOpenAi(false);
        setEditing({ id: "", title: "Sugestão IA", description: text, category: "campanha", event_date: format(new Date(), "yyyy-MM-dd"), event_time: null, status: "planned" } as any);
        setSelectedDate(new Date());
        setOpenDialog(true);
      }} />
    </PageContainer>
  );
}

function EventDialog({ open, onOpenChange, editing, date, onSave, onDelete, saving }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Event | null; date: Date | null;
  onSave: (p: any) => void; onDelete?: () => void; saving: boolean;
}) {
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [category, setCategory] = useState("campanha"); const [time, setTime] = useState("");
  const [status, setStatus] = useState("planned");

  // sync when opening
  useMemo(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setCategory(editing?.category ?? "campanha");
      setTime(editing?.event_time?.slice(0,5) ?? "");
      setStatus(editing?.status ?? "planned");
    }
  }, [open, editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing?.id ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Horário</Label><Input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planejado</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {date && <div className="text-xs text-muted-foreground">Data: {format(date, "PPP", { locale: ptBR })}</div>}
        </div>
        <DialogFooter className="gap-2">
          {onDelete && <Button variant="ghost" onClick={onDelete} className="mr-auto text-destructive"><Trash2 className="size-4 mr-1" />Remover</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={saving || !title.trim() || !date}
            onClick={() => onSave({
              title: title.trim(), description: description || null, category,
              event_date: format(date!, "yyyy-MM-dd"), event_time: time || null, status,
            })}
          >{saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AiDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (text: string) => void }) {
  const { org } = useCurrentOrg();
  const [segment, setSegment] = useState(org?.segment ?? "");
  const [goal, setGoal] = useState("");
  const [dates, setDates] = useState("");
  const [tone, setTone] = useState("amigável");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const generate = async () => {
    setLoading(true); setResult("");
    try {
      const prompt = `Sugira um plano de marketing curto para o segmento "${segment || "negócio local"}". Objetivo: ${goal || "aumentar vendas"}. Datas/Eventos relevantes: ${dates || "—"}. Tom: ${tone}.\n\nEntregue uma lista de 3 a 5 ações com título, descrição (1-2 linhas) e data sugerida.`;
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: prompt }] }] }),
      });
      const text = await res.text();
      // The stream payload contains text deltas; do a coarse extract
      const cleaned = text.replace(/data: /g, "").replace(/\n/g, " ");
      setResult(cleaned.length > 4000 ? cleaned.slice(0, 4000) : cleaned);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /> Criar com IA</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Segmento</Label><Input value={segment} onChange={e => setSegment(e.target.value)} placeholder="barbearia, clínica..." /></div>
            <div><Label>Tom</Label><Input value={tone} onChange={e => setTone(e.target.value)} /></div>
          </div>
          <div><Label>Objetivo</Label><Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="aumentar vendas, fidelizar..." /></div>
          <div><Label>Datas especiais</Label><Input value={dates} onChange={e => setDates(e.target.value)} placeholder="Dia das Mães, Black Friday..." /></div>
          <Button onClick={generate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Gerar sugestão
          </Button>
          {result && (
            <div className="rounded-lg border p-3 max-h-64 overflow-auto text-sm whitespace-pre-wrap bg-muted/30">{result}</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {result && <Button onClick={() => onPick(result)}>Usar como evento</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
