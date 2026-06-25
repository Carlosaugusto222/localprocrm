import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — LocalPro CRM" }] }),
  component: Finance,
});

function brl(n: number) { return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function Finance() {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");

  const { data: txs = [] } = useQuery({
    enabled: !!org,
    queryKey: ["transactions", org?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").eq("organization_id", org!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = txs.filter(t => tab === "all" || t.kind === tab);
  const totalIn = txs.filter(t => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = txs.filter(t => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = subDays(new Date(), 29 - i);
    const key = format(d, "yyyy-MM-dd");
    const inc = txs.filter(t => t.kind === "income" && format(new Date(t.created_at), "yyyy-MM-dd") === key).reduce((s, t) => s + Number(t.amount), 0);
    const exp = txs.filter(t => t.kind === "expense" && format(new Date(t.created_at), "yyyy-MM-dd") === key).reduce((s, t) => s + Number(t.amount), 0);
    return { day: format(d, "dd/MM"), Receita: inc, Despesa: exp };
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("transactions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  return (
    <PageContainer>
      <PageHeader title="Financeiro" description="Receitas, despesas e fluxo de caixa."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-1"><Plus className="size-4" /> Lançar</Button></DialogTrigger>
            <TxDialog orgId={org?.id} onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <SummaryCard label="Receitas" value={brl(totalIn)} accent="text-success" icon={ArrowUpRight} />
        <SummaryCard label="Despesas" value={brl(totalOut)} accent="text-destructive" icon={ArrowDownRight} />
        <SummaryCard label="Saldo" value={brl(totalIn - totalOut)} accent={totalIn - totalOut >= 0 ? "text-success" : "text-destructive"} />
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Fluxo de caixa — 30 dias</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="Receita" stackId="1" stroke="var(--color-success)" fill="var(--color-success)" fillOpacity={0.3} />
              <Area type="monotone" dataKey="Despesa" stackId="2" stroke="var(--color-destructive)" fill="var(--color-destructive)" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="mb-3">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="income">Receitas</TabsTrigger>
          <TabsTrigger value="expense">Despesas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-2">
        {filtered.map(t => (
          <Card key={t.id} className="p-3 flex items-center gap-3">
            <div className={`size-9 rounded-lg grid place-items-center ${t.kind === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
              {t.kind === "income" ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{t.description}</div>
              <div className="text-xs text-muted-foreground">{t.category ?? "—"} • {format(new Date(t.created_at), "dd MMM yyyy", { locale: ptBR })}</div>
            </div>
            <div className={`font-semibold ${t.kind === "income" ? "text-success" : "text-destructive"}`}>
              {t.kind === "income" ? "+" : "-"} {brl(Number(t.amount))}
            </div>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}><Trash2 className="size-4" /></Button>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum lançamento ainda.</p>}
      </div>
    </PageContainer>
  );
}

function SummaryCard({ label, value, accent, icon: Icon }: { label: string; value: string; accent?: string; icon?: React.ComponentType<{className?: string}> }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          {Icon && <Icon className={`size-4 ${accent ?? "text-muted-foreground"}`} />}
        </div>
        <div className={`mt-1 text-xl font-display font-bold ${accent ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function TxDialog({ orgId, onClose }: { orgId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ kind: "income" as "income"|"expense", description: "", amount: "", category: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sem empresa");
      const { error } = await supabase.from("transactions").insert({
        organization_id: orgId, kind: form.kind, description: form.description,
        amount: Number(form.amount), category: form.category || null, paid_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions"] }); toast.success("Lançamento criado"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Tipo</Label>
          <Select value={form.kind} onValueChange={v => setForm({ ...form, kind: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Descrição</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="space-y-1.5"><Label>Categoria</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
