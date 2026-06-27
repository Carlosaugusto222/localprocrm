import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, CalendarDays, Sparkles, BarChart3, ArrowRight, ShoppingBag, Wallet, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth } from "date-fns";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "EmpreHub — Centro do seu negócio" }] }),
  component: EmpreHub,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function EmpreHub() {
  const { user } = useAuth();
  const { org } = useCurrentOrg();
  const firstName = (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "").split(" ")[0];

  const { data: stats } = useQuery({
    enabled: !!org?.id,
    queryKey: ["inicio-stats", org?.id],
    queryFn: async () => {
      const orgId = org!.id;
      const monthStart = startOfMonth(new Date()).toISOString();
      const [cust, sales, txs, prod] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("sales").select("total").eq("organization_id", orgId).gte("created_at", monthStart),
        supabase.from("transactions").select("amount,kind").eq("organization_id", orgId).gte("created_at", monthStart),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);
      const salesArr = sales.data ?? [];
      const revenue = (txs.data ?? []).filter((t: any) => t.kind === "income").reduce((s, t: any) => s + Number(t.amount), 0);
      return {
        customers: cust.count ?? 0,
        salesCount: salesArr.length,
        revenue,
        products: prod.count ?? 0,
      };
    },
  });

  const modules = [
    { to: "/crm", icon: Users, title: "Clientes", desc: "Organize todos os seus clientes e nunca mais perca uma venda.", tint: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-500" },
    { to: "/planejamento", icon: CalendarDays, title: "Planejamento", desc: "Planeje campanhas, promoções e organize seu calendário de marketing.", tint: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-500" },
    { to: "/ia", icon: Sparkles, title: "IA", desc: "Gere conteúdos, campanhas e mensagens automaticamente.", tint: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-500" },
    { to: "/dashboard", icon: BarChart3, title: "Resultados", desc: "Acompanhe sua evolução em vendas e clientes.", tint: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500" },
  ] as const;

  const indicators = [
    { label: "Clientes", value: stats?.customers, icon: Users },
    { label: "Vendas do mês", value: stats?.salesCount, icon: ShoppingBag },
    { label: "Faturamento", value: stats?.revenue !== undefined ? `R$ ${stats.revenue.toFixed(2)}` : undefined, icon: Wallet },
    { label: "Produtos", value: stats?.products, icon: Package },
  ].filter(i => i.value !== undefined && i.value !== null);

  return (
    <PageContainer>
      <div className="text-center mb-10 sm:mb-14 mt-4 sm:mt-8">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Início
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-semibold tracking-tight">
          {greeting()}{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="text-muted-foreground mt-3 text-base sm:text-lg max-w-xl mx-auto">
          Organize seus clientes, planeje seu marketing e venda mais com Inteligência Artificial.
        </p>
      </div>

      {indicators.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 max-w-4xl mx-auto">
          {indicators.map(i => (
            <Card key={i.label} className="p-4 flex items-center gap-3">
              <div className="size-9 rounded-lg bg-muted grid place-items-center text-muted-foreground">
                <i.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{i.label}</div>
                <div className="font-display font-semibold truncate">{i.value}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {modules.map(m => (
          <Link key={m.to} to={m.to} className="group">
            <Card className={`relative overflow-hidden p-6 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-glow border-border/60`}>
              <div className={`absolute -top-12 -right-12 size-40 rounded-full bg-gradient-to-br ${m.tint} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <div className={`size-12 rounded-xl bg-background border grid place-items-center ${m.iconColor} mb-4 shadow-sm`}>
                  <m.icon className="size-5" />
                </div>
                <h3 className="font-display font-semibold text-xl">{m.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{m.desc}</p>
                <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-primary opacity-80 group-hover:opacity-100 group-hover:gap-2.5 transition-all">
                  Acessar <ArrowRight className="size-3.5" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-center mt-10">
        <Link to="/hoje">
          <Button variant="ghost" size="sm" className="text-muted-foreground">Ir para o painel operacional →</Button>
        </Link>
      </div>
    </PageContainer>
  );
}
