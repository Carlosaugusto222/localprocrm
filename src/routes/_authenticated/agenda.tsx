import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  addDays, addMonths, endOfMonth, endOfWeek, format, startOfDay, startOfMonth,
  startOfWeek, subDays, subMonths, isSameDay, eachDayOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — LocalPro CRM" }] }),
  component: Agenda,
});

type View = "day" | "week" | "month";
const STATUS_LABEL: Record<string,string> = { scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado", no_show: "Falta" };

function Agenda() {
  const { org } = useCurrentOrg();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);

  const range = (() => {
    if (view === "day") return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 1) };
    if (view === "week") return { from: startOfWeek(cursor, { weekStartsOn: 0 }), to: endOfWeek(cursor, { weekStartsOn: 0 }) };
    return { from: startOfMonth(cursor), to: endOfMonth(cursor) };
  })();

  const { data: appts = [] } = useQuery({
    enabled: !!org,
    queryKey: ["appointments", org?.id, range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, customers(name)")
        .eq("organization_id", org!.id)
        .gte("starts_at", range.from.toISOString())
        .lte("starts_at", range.to.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const nav = (dir: 1 | -1) => {
    if (view === "day") setCursor(c => addDays(c, dir));
    else if (view === "week") setCursor(c => addDays(c, 7 * dir));
    else setCursor(c => dir > 0 ? addMonths(c, 1) : subMonths(c, 1));
  };

  return (
    <PageContainer>
      <PageHeader title="Agenda" description="Gerencie seus agendamentos."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-1"><Plus className="size-4" /> Novo</Button></DialogTrigger>
            <AppointmentDialog orgId={org?.id} initialDate={cursor} onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => nav(-1)}><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => nav(1)}><ChevronRight className="size-4" /></Button>
          <span className="ml-2 font-semibold text-sm sm:text-base">
            {view === "month" ? format(cursor, "MMMM yyyy", { locale: ptBR }) :
             view === "week" ? `${format(range.from, "dd MMM", { locale: ptBR })} - ${format(range.to, "dd MMM", { locale: ptBR })}` :
             format(cursor, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "month" ? <MonthView range={range} appts={appts} /> : <ListView appts={appts} range={range} />}
    </PageContainer>
  );
}

function ListView({ appts, range }: { appts: any[]; range: { from: Date; to: Date } }) {
  const days = eachDayOfInterval({ start: range.from, end: range.to });
  return (
    <div className="space-y-4">
      {days.map(d => {
        const items = appts.filter(a => isSameDay(new Date(a.starts_at), d));
        return (
          <div key={d.toISOString()}>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {format(d, "EEEE, dd 'de' MMM", { locale: ptBR })}
            </h3>
            {items.length === 0 ? <p className="text-sm text-muted-foreground">Sem agendamentos.</p> : (
              <div className="space-y-2">
                {items.map(a => (
                  <Card key={a.id} className="p-3 flex items-center gap-3">
                    <div className="text-center w-16 shrink-0">
                      <div className="text-sm font-semibold">{format(new Date(a.starts_at), "HH:mm")}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(a.ends_at), "HH:mm")}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{a.title}</div>
                      {a.customers?.name && <div className="text-sm text-muted-foreground">{a.customers.name}</div>}
                    </div>
                    <Badge variant="outline">{STATUS_LABEL[a.status]}</Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ range, appts }: { range: { from: Date; to: Date }; appts: any[] }) {
  const start = startOfWeek(range.from, { weekStartsOn: 0 });
  const end = endOfWeek(range.to, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/30 text-xs uppercase tracking-wider">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => <div key={d} className="p-2 text-center font-semibold">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map(d => {
          const items = appts.filter(a => isSameDay(new Date(a.starts_at), d));
          return (
            <div key={d.toISOString()} className="min-h-24 p-2 border-t border-r last:border-r-0 text-xs">
              <div className="font-semibold text-sm mb-1">{format(d, "dd")}</div>
              <div className="space-y-1">
                {items.slice(0,3).map(a => (
                  <div key={a.id} className="truncate rounded bg-primary/15 text-primary px-1.5 py-0.5">
                    {format(new Date(a.starts_at), "HH:mm")} {a.title}
                  </div>
                ))}
                {items.length > 3 && <div className="text-muted-foreground">+{items.length - 3} mais</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentDialog({ orgId, initialDate, onClose }: { orgId?: string; initialDate: Date; onClose: () => void }) {
  const qc = useQueryClient();
  const baseDate = format(initialDate, "yyyy-MM-dd");
  const [form, setForm] = useState({
    title: "", notes: "", date: baseDate, startTime: "09:00", endTime: "10:00",
    status: "scheduled" as const, customer_id: "",
  });

  const { data: customers = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["customers-select", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id,name").eq("organization_id", orgId!).order("name");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sem empresa");
      const starts_at = new Date(`${form.date}T${form.startTime}`).toISOString();
      const ends_at = new Date(`${form.date}T${form.endTime}`).toISOString();
      const { error } = await supabase.from("appointments").insert({
        organization_id: orgId,
        title: form.title, notes: form.notes || null,
        starts_at, ends_at, status: form.status,
        customer_id: form.customer_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Agendamento criado"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo agendamento</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Título</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="space-y-1.5"><Label>Cliente</Label>
          <Select value={form.customer_id || "_none"} onValueChange={v => setForm({ ...form, customer_id: v === "_none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sem cliente</SelectItem>
              {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5"><Label>Data</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="space-y-1.5"><Label>Início</Label>
            <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
          </div>
          <div className="space-y-1.5"><Label>Fim</Label>
            <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-1.5"><Label>Observações</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
