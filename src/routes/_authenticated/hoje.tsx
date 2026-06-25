import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, Calendar, UserPlus, MessageCircle, Wallet,
  Clock, ArrowRight, Sparkles, Kanban,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hoje")({
  component: HojePage,
});

function HojePage() {
  const { org } = useCurrentOrg();
  const orgId = org?.id;

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data: appts } = useQuery({
    queryKey: ["hoje-appts", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id,title,start_at,end_at,status,customer:customers(name)")
        .eq("organization_id", orgId!)
        .gte("start_at", startOfDay)
        .lt("start_at", endOfDay)
        .order("start_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["hoje-sales", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("id,total,status,created_at,customer:customers(name)")
        .eq("organization_id", orgId!)
        .gte("created_at", startOfDay)
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const totalDia = (sales ?? [])
    .filter((s: any) => s.status === "paid" || s.status === "completed")
    .reduce((acc: number, s: any) => acc + Number(s.total ?? 0), 0);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const fmtMoney = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const quickActions = [
    { title: "Nova Venda", desc: "Registrar venda ou orçamento", icon: ShoppingBag, to: "/vendas", color: "from-emerald-500 to-teal-500" },
    { title: "Novo Agendamento", desc: "Marcar na agenda", icon: Calendar, to: "/agenda", color: "from-blue-500 to-indigo-500" },
    { title: "Novo Cliente", desc: "Cadastrar no CRM", icon: UserPlus, to: "/crm", color: "from-purple-500 to-fuchsia-500" },
    { title: "Funil", desc: "Mover oportunidades", icon: Kanban, to: "/funil", color: "from-orange-500 to-rose-500" },
    { title: "Lançar Caixa", desc: "Receita ou despesa", icon: Wallet, to: "/financeiro", color: "from-amber-500 to-yellow-500" },
    { title: "Mensagem WhatsApp", desc: "Disparar template", icon: MessageCircle, to: "/whatsapp", color: "from-green-500 to-emerald-500" },
  ] as const;

  return (
    <PageContainer>
      <PageHeader
        title="Hoje"
        description={`Tudo que importa pro seu dia${org?.name ? ` em ${org.name}` : ""}.`}
        actions={
          <Button asChild variant="outline">
            <Link to="/ia"><Sparkles className="size-4 mr-2" />Perguntar à IA</Link>
          </Button>
        }
      />

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {quickActions.map(a => (
          <Link key={a.to + a.title} to={a.to} className="group">
            <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-0.5 border-border/60">
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`size-10 rounded-lg bg-gradient-to-br ${a.color} grid place-items-center text-white shadow-sm shrink-0`}>
                  <a.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm flex items-center gap-1">
                    {a.title}
                    <ArrowRight className="size-3 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Agenda do dia */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-4 text-primary" />
              Agenda de hoje
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/agenda">Ver tudo <ArrowRight className="size-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!appts || appts.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Nenhum agendamento para hoje.
                <div className="mt-3">
                  <Button asChild size="sm"><Link to="/agenda">Criar agendamento</Link></Button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {appts.map((a: any) => (
                  <li key={a.id} className="py-3 flex items-center gap-3">
                    <div className="size-10 rounded-md bg-muted grid place-items-center text-xs font-mono">
                      <Clock className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{a.title || "Atendimento"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.customer?.name ?? "Sem cliente"} · {fmtTime(a.start_at)}
                        {a.end_at && ` – ${fmtTime(a.end_at)}`}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] uppercase">{a.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Vendas do dia */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="size-4 text-primary" />
              Vendas de hoje
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/vendas">Ver tudo <ArrowRight className="size-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold tracking-tight mb-1">{fmtMoney(totalDia)}</div>
            <div className="text-xs text-muted-foreground mb-4">
              {(sales ?? []).length} {(sales ?? []).length === 1 ? "venda" : "vendas"} registradas
            </div>
            {(!sales || sales.length === 0) ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhuma venda ainda hoje.
              </div>
            ) : (
              <ul className="space-y-2">
                {sales.slice(0, 5).map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">{s.customer?.name ?? "Venda avulsa"}</span>
                    <span className="font-medium tabular-nums">{fmtMoney(Number(s.total ?? 0))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
