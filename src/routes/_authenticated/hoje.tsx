import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, Calendar, UserPlus, MessageCircle, Wallet, Wrench, Banknote,
  Clock, ArrowRight, Sparkles, Kanban, Cake, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/hoje")({
  component: HojePage,
});

function HojePage() {
  const { org } = useCurrentOrg();
  const navigate = useNavigate();
  const orgId = org?.id;

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (org && (org as any).onboarding_completed === false) {
      navigate({ to: "/onboarding" });
    }
  }, [org, navigate]);

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data: appts } = useQuery({
    queryKey: ["hoje-appts", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("appointments")
        .select("id,title,starts_at,ends_at,status,customer:customers(name)")
        .eq("organization_id", orgId!).gte("starts_at", startOfDay).lt("starts_at", endOfDay)
        .order("starts_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["hoje-sales", orgId],
    enabled: !!orgId,
    queryFn: async () => (await supabase.from("sales")
      .select("id,total,status,created_at,customer:customers(name)")
      .eq("organization_id", orgId!).gte("created_at", startOfDay)
      .order("created_at", { ascending: false }).limit(8)).data ?? [],
  });

  // Birthdays this month
  const { data: birthdays = [] } = useQuery({
    queryKey: ["hoje-birthdays", orgId, today.getMonth()],
    enabled: !!orgId,
    queryFn: async () => {
      const m = today.getMonth() + 1;
      const { data } = await supabase.from("customers")
        .select("id,name,birthdate,phone").eq("organization_id", orgId!).not("birthdate", "is", null);
      return (data ?? []).filter(c => c.birthdate && new Date(c.birthdate).getMonth() + 1 === m);
    },
  });

  // Low stock
  const { data: lowStock = [] } = useQuery({
    queryKey: ["hoje-lowstock", orgId],
    enabled: !!orgId,
    queryFn: async () => (await supabase.from("products")
      .select("id,name,stock_qty,stock_min")
      .eq("organization_id", orgId!)
      .eq("track_stock", true)).data ?? [],
  });
  const lowStockItems = lowStock.filter((p: any) => Number(p.stock_qty) <= Number(p.stock_min ?? 0));

  // Open OS
  const { data: openOS = [] } = useQuery({
    queryKey: ["hoje-os", orgId],
    enabled: !!orgId,
    queryFn: async () => (await supabase.from("service_orders")
      .select("id,number,title,status,customer:customers(name)")
      .eq("organization_id", orgId!).in("status", ["open","in_progress","waiting"])
      .order("opened_at", { ascending: false }).limit(5)).data ?? [],
  });

  const totalDia = (sales ?? []).filter((s: any) => s.status === "paid" || s.status === "completed")
    .reduce((acc: number, s: any) => acc + Number(s.total ?? 0), 0);

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const fmtMoney = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const quickActions = [
    { title: "Nova Venda", icon: ShoppingBag, to: "/vendas", color: "from-emerald-500 to-teal-500" },
    { title: "Novo Agendamento", icon: Calendar, to: "/agenda", color: "from-blue-500 to-indigo-500" },
    { title: "Nova OS", icon: Wrench, to: "/os", color: "from-orange-500 to-red-500" },
    { title: "Novo Cliente", icon: UserPlus, to: "/crm", color: "from-purple-500 to-fuchsia-500" },
    { title: "Funil", icon: Kanban, to: "/funil", color: "from-pink-500 to-rose-500" },
    { title: "Caixa", icon: Banknote, to: "/caixa", color: "from-amber-500 to-yellow-500" },
    { title: "Estoque", icon: Package, to: "/estoque", color: "from-zinc-500 to-slate-500" },
    { title: "Financeiro", icon: Wallet, to: "/financeiro", color: "from-cyan-500 to-blue-500" },
    { title: "WhatsApp", icon: MessageCircle, to: "/whatsapp", color: "from-green-500 to-emerald-500" },
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

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 mb-8 animate-in-fade">
        {quickActions.map((a, i) => (
          <Link key={a.to + a.title} to={a.to} className={cn("group animate-in-slide-up", `delay-[${i * 50}ms]`)}>
            <Card className="h-full transition-all hover:shadow-glow hover:-translate-y-1 border-border/40 overflow-hidden">
              <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                <div className={cn("size-10 rounded-xl bg-gradient-to-br grid place-items-center text-white shadow-sm shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3", a.color)}>
                  <a.icon className="size-5" />

                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                    {a.title}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>


      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-4 text-primary" />Agenda de hoje
            </CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/agenda">Ver tudo <ArrowRight className="size-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            {!appts || appts.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Nenhum agendamento para hoje.
                <div className="mt-3"><Button asChild size="sm"><Link to="/agenda">Criar agendamento</Link></Button></div>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {appts.map((a: any) => (
                  <li key={a.id} className="py-3 flex items-center gap-3">
                    <div className="size-10 rounded-md bg-muted grid place-items-center"><Clock className="size-4 text-muted-foreground" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{a.title || "Atendimento"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.customer?.name ?? "Sem cliente"} · {fmtTime(a.starts_at)}{a.ends_at && ` – ${fmtTime(a.ends_at)}`}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] uppercase">{a.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><ShoppingBag className="size-4 text-primary" />Vendas de hoje</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/vendas">Ver <ArrowRight className="size-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold tracking-tight mb-1">{fmtMoney(totalDia)}</div>
            <div className="text-xs text-muted-foreground mb-4">{(sales ?? []).length} {(sales ?? []).length === 1 ? "venda" : "vendas"}</div>
            {(!sales || sales.length === 0) ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Nenhuma venda ainda.</div>
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

        {openOS.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Wrench className="size-4 text-orange-500" />OS abertas</CardTitle>
              <Button asChild size="sm" variant="ghost"><Link to="/os">Ver <ArrowRight className="size-3 ml-1" /></Link></Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/60 text-sm">
                {openOS.map((os: any) => (
                  <li key={os.id} className="py-2 truncate">
                    <Link to="/os/$id" params={{ id: os.id }} className="hover:underline">
                      <span className="text-xs font-mono text-muted-foreground">#{os.number}</span> {os.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {birthdays.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Cake className="size-4 text-pink-500" />Aniversariantes do mês</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/60 text-sm">
                {birthdays.slice(0, 6).map((c: any) => (
                  <li key={c.id} className="py-2 flex items-center justify-between">
                    <span>{c.name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.birthdate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {lowStockItems.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShoppingBag className="size-4 text-amber-500" />Estoque baixo</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/60 text-sm">
                {lowStockItems.slice(0, 5).map((p: any) => (
                  <li key={p.id} className="py-2 flex items-center justify-between">
                    <span className="truncate">{p.name}</span>
                    <Badge variant="destructive" className="text-[10px]">{Number(p.stock_qty)}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
