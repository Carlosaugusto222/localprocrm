import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Users, Calendar, DollarSign, ShoppingBag, Sparkles, ArrowRight, Package } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LocalPro CRM" }] }),
  component: Dashboard,
});

function brl(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function Dashboard() {
  const { org } = useCurrentOrg();
  const orgId = org?.id;

  const { data: stats } = useQuery({
    enabled: !!orgId,
    queryKey: ["dashboard", orgId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const prevStart = startOfMonth(subMonths(now, 1));
      const prevEnd = endOfMonth(subMonths(now, 1));

      const [customers, appointments, txs, prevTxs, sales, prevSales, prevCustomers] = await Promise.all([
        supabase.from("customers").select("id, created_at").eq("organization_id", orgId!),
        supabase.from("appointments").select("id, starts_at, status").eq("organization_id", orgId!).gte("starts_at", monthStart.toISOString()),
        supabase.from("transactions").select("amount, kind, paid_at, created_at").eq("organization_id", orgId!).gte("created_at", monthStart.toISOString()),
        supabase.from("transactions").select("amount, kind").eq("organization_id", orgId!).gte("created_at", prevStart.toISOString()).lte("created_at", prevEnd.toISOString()),
        supabase.from("sales").select("id, total, created_at, status").eq("organization_id", orgId!).gte("created_at", monthStart.toISOString()),
        supabase.from("sales").select("id, total").eq("organization_id", orgId!).gte("created_at", prevStart.toISOString()).lte("created_at", prevEnd.toISOString()),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", orgId!).gte("created_at", prevStart.toISOString()).lte("created_at", prevEnd.toISOString()),
      ]);

      const allTxs = txs.data ?? [];
      const revenue = allTxs.filter(t => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expenses = allTxs.filter(t => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
      const prevRevenue = (prevTxs.data ?? []).filter(t => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);

      const newCustomers = (customers.data ?? []).filter(c => new Date(c.created_at) >= monthStart).length;
      const prevNewCustomers = prevCustomers.count ?? 0;

      const salesTotal = (sales.data ?? []).reduce((s, x) => s + Number(x.total), 0);
      const salesCount = (sales.data ?? []).length;
      const prevSalesCount = (prevSales.data ?? []).length;
      const prevSalesTotal = (prevSales.data ?? []).reduce((s, x) => s + Number(x.total), 0);
      const avgTicket = salesCount ? salesTotal / salesCount : 0;
      const prevAvgTicket = prevSalesCount ? prevSalesTotal / prevSalesCount : 0;

      const days = Array.from({ length: 14 }).map((_, i) => {
        const d = subDays(now, 13 - i);
        const key = format(d, "yyyy-MM-dd");
        const total = allTxs
          .filter(t => t.kind === "income" && format(new Date(t.created_at), "yyyy-MM-dd") === key)
          .reduce((s, t) => s + Number(t.amount), 0);
        return { day: format(d, "dd/MM"), receita: total };
      });

      return {
        revenue, expenses, prevRevenue,
        newCustomers, prevNewCustomers,
        totalCustomers: customers.data?.length ?? 0,
        appointments: appointments.data?.length ?? 0,
        upcoming: (appointments.data ?? []).filter(a => new Date(a.starts_at) >= now && a.status !== "cancelled").slice(0, 5),
        salesCount, prevSalesCount, avgTicket, prevAvgTicket,
        days,
      };
    },
  });

  const delta = (cur: number, prev: number) => {
    if (!prev) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  };

  return (
    <PageContainer>
      <PageHeader title="Visão geral" description={`Bem-vindo, ${org?.name ?? ""}. Comparativo vs mês anterior.`} />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Stat icon={DollarSign} label="Receita do mês" value={brl(stats?.revenue ?? 0)} deltaPct={delta(stats?.revenue ?? 0, stats?.prevRevenue ?? 0)} accent="text-success" />
        <Stat icon={Users} label="Novos clientes" value={String(stats?.newCustomers ?? 0)} deltaPct={delta(stats?.newCustomers ?? 0, stats?.prevNewCustomers ?? 0)} />
        <Stat icon={Calendar} label="Agendamentos" value={String(stats?.appointments ?? 0)} />
        <Stat icon={ShoppingBag} label="Vendas" value={String(stats?.salesCount ?? 0)} deltaPct={delta(stats?.salesCount ?? 0, stats?.prevSalesCount ?? 0)} />
        <Stat icon={TrendingUp} label="Ticket médio" value={brl(stats?.avgTicket ?? 0)} deltaPct={delta(stats?.avgTicket ?? 0, stats?.prevAvgTicket ?? 0)} />
        <Stat icon={Package} label="Alerta Estoque" value={String(stats?.lowStockCount ?? 0)} accent={stats?.lowStockCount ? "text-orange-500" : ""} />
      </div>

      <div className="mt-6">
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-primary/20 grid place-items-center text-primary shadow-glow">
                <Sparkles className="size-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg">Insights da IA</h3>
                <p className="text-sm text-muted-foreground">Visualize recomendações acionáveis e métricas explicadas pelo assistente.</p>
              </div>
            </div>
            <Link to="/ia">
              <Button className="gap-2 group">
                Ver Insights <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Receita — últimos 14 dias</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.days ?? []}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="receita" stroke="var(--color-primary)" fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Receita x Despesa</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "Mês", receita: stats?.revenue ?? 0, despesa: stats?.expenses ?? 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="receita" fill="var(--color-success)" radius={[6,6,0,0]} />
                <Bar dataKey="despesa" fill="var(--color-destructive)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Próximos agendamentos</CardTitle></CardHeader>
        <CardContent>
          {!stats?.upcoming?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento nos próximos dias.</p>
          ) : (
            <ul className="divide-y">
              {stats.upcoming.map((a: any) => (
                <li key={a.id} className="py-3 flex items-center justify-between">
                  <span className="text-sm">{format(new Date(a.starts_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}</span>
                  <Badge variant="outline">{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function Stat({ icon: Icon, label, value, accent, deltaPct }: { icon: React.ComponentType<{className?: string}>; label: string; value: string; accent?: string; deltaPct?: number }) {
  const up = (deltaPct ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          <Icon className={`size-4 ${accent ?? "text-muted-foreground"}`} />
        </div>
        <div className={`mt-2 text-xl sm:text-2xl font-display font-bold ${accent ?? ""}`}>{value}</div>
        {deltaPct !== undefined && (
          <div className={`mt-1 flex items-center gap-1 text-xs ${up ? "text-success" : "text-destructive"}`}>
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {up ? "+" : ""}{deltaPct.toFixed(1)}% vs mês anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}
