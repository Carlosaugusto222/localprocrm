import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Banknote, Play, Square, TrendingUp, TrendingDown } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({ meta: [{ title: "Caixa — LocalPro CRM" }] }),
  component: CaixaPage,
});

const fmt = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CaixaPage() {
  const { org } = useCurrentOrg();
  const orgId = org?.id;
  const qc = useQueryClient();

  const { data: openSession } = useQuery({
    enabled: !!orgId,
    queryKey: ["cash-open", orgId],
    queryFn: async () => (await supabase.from("cash_sessions").select("*").eq("organization_id", orgId!).eq("status", "open").order("opened_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const { data: sessions = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["cash-sessions", orgId],
    queryFn: async () => (await supabase.from("cash_sessions").select("*").eq("organization_id", orgId!).order("opened_at", { ascending: false }).limit(20)).data ?? [],
  });

  // Movements during open session
  const { data: movements = [] } = useQuery({
    enabled: !!openSession?.id,
    queryKey: ["cash-mov", openSession?.id],
    queryFn: async () => (await supabase.from("transactions").select("*").eq("cash_session_id", openSession!.id).order("created_at")).data ?? [],
  });

  const openCash = useMutation({
    mutationFn: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("cash_sessions").insert({
        organization_id: orgId!, opened_by: user!.id, opening_amount: amount,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Caixa aberto"); },
  });

  const closeCash = useMutation({
    mutationFn: async ({ amount, notes }: { amount: number; notes: string }) => {
      if (!openSession) return;
      const income = movements.filter((m: any) => m.kind === "income").reduce((a: number, b: any) => a + Number(b.amount), 0);
      const expense = movements.filter((m: any) => m.kind === "expense").reduce((a: number, b: any) => a + Number(b.amount), 0);

      const expected = Number(openSession.opening_amount) + income - expense;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("cash_sessions").update({
        status: "closed", closed_at: new Date().toISOString(), closed_by: user!.id,
        closing_amount: amount, expected_amount: expected, difference: amount - expected, notes,
      }).eq("id", openSession.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Caixa fechado"); },
  });

  return (
    <PageContainer>
      <PageHeader title="Caixa" description="Abertura, movimentações e fechamento do dia." />

      {!openSession ? <OpenCard onOpen={(v) => openCash.mutate(v)} /> :
        <OpenSessionView session={openSession} movements={movements} onClose={(v, n) => closeCash.mutate({ amount: v, notes: n })} />
      }

      <h2 className="text-lg font-display font-bold mt-8 mb-3">Histórico</h2>
      <div className="grid gap-2">
        {sessions.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum caixa registrado.</p>}
        {sessions.map((s: any) => (
          <Card key={s.id} className="p-3 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-muted grid place-items-center"><Banknote className="size-4 text-muted-foreground" /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">{new Date(s.opened_at).toLocaleString("pt-BR")}</div>
              <div className="text-xs text-muted-foreground">
                Abertura {fmt(Number(s.opening_amount))}
                {s.closed_at && ` · Fechamento ${fmt(Number(s.closing_amount ?? 0))}`}
                {s.difference != null && Number(s.difference) !== 0 && ` · Diferença ${fmt(Number(s.difference))}`}
              </div>
            </div>
            <Badge variant={s.status === "open" ? "default" : "secondary"}>{s.status === "open" ? "Aberto" : "Fechado"}</Badge>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}

function OpenCard({ onOpen }: { onOpen: (v: number) => void }) {
  const [amount, setAmount] = useState("0");
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Play className="size-4 text-emerald-500" />Abrir caixa</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5"><Label>Valor de abertura (troco em dinheiro)</Label>
          <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
        <Button onClick={() => onOpen(Number(amount))}>Abrir caixa</Button>
      </CardContent>
    </Card>
  );
}

function OpenSessionView({ session, movements, onClose }: { session: any; movements: any[]; onClose: (v: number, n: string) => void }) {
  const income = movements.filter(m => m.kind === "income").reduce((a, b) => a + Number(b.amount), 0);
  const expense = movements.filter(m => m.kind === "expense").reduce((a, b) => a + Number(b.amount), 0);
  const expected = Number(session.opening_amount) + income - expense;
  const [closing, setClosing] = useState(String(expected));
  const [notes, setNotes] = useState("");

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Movimento do caixa aberto</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">Abertura</div>
              <div className="text-lg font-bold tabular-nums">{fmt(Number(session.opening_amount))}</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><TrendingUp className="size-3" />Entradas</div>
              <div className="text-lg font-bold tabular-nums">{fmt(income)}</div>
            </div>
            <div className="p-3 rounded-lg bg-rose-500/10">
              <div className="text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1"><TrendingDown className="size-3" />Saídas</div>
              <div className="text-lg font-bold tabular-nums">{fmt(expense)}</div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground mb-2">{movements.length} movimentações</div>
          <ul className="text-sm divide-y divide-border max-h-64 overflow-y-auto">
            {movements.map((m: any) => (
              <li key={m.id} className="py-2 flex items-center gap-2">
                <span className={`size-2 rounded-full ${m.kind === "income" ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className="flex-1 truncate">{m.description ?? "—"}</span>
                <span className="tabular-nums">{fmt(Number(m.amount))}</span>
              </li>
            ))}
            {movements.length === 0 && <li className="py-4 text-center text-muted-foreground">Sem movimentos ainda. Lance receitas e despesas no Financeiro com o caixa aberto.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Square className="size-4 text-rose-500" />Fechar caixa</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-xs text-muted-foreground">Valor esperado</div>
            <div className="text-2xl font-display font-bold tabular-nums">{fmt(expected)}</div>
          </div>
          <div className="space-y-1.5"><Label>Valor contado em caixa</Label>
            <Input type="number" step="0.01" value={closing} onChange={e => setClosing(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <Button className="w-full" onClick={() => onClose(Number(closing), notes)}>Fechar caixa</Button>
        </CardContent>
      </Card>
    </div>
  );
}
