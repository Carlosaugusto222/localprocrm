import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, Calendar, Sparkles, Users, Wallet, ShoppingBag, BarChart3, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LocalPro CRM — Gestão completa para o seu negócio local" },
      { name: "description", content: "CRM, agenda, financeiro, vendas e IA. Tudo o que o seu negócio precisa em uma única plataforma modular." },
      { property: "og:title", content: "LocalPro CRM" },
      { property: "og:description", content: "Gestão modular para barbearias, clínicas, oficinas, restaurantes e qualquer negócio local." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

const modules = [
  { icon: Users, title: "CRM", desc: "Clientes, tags, funil de vendas e histórico completo." },
  { icon: Calendar, title: "Agenda", desc: "Calendário diário, semanal e mensal com confirmações." },
  { icon: Wallet, title: "Financeiro", desc: "Receitas, despesas, fluxo de caixa e relatórios." },
  { icon: ShoppingBag, title: "Vendas", desc: "Produtos, serviços, orçamentos e pedidos." },
  { icon: Sparkles, title: "Assistente IA", desc: "Gere mensagens, campanhas e resuma atendimentos." },
  { icon: BarChart3, title: "Relatórios", desc: "Receita, conversão, clientes e ticket médio." },
];

const plans = [
  { name: "Básico", price: "R$ 49", desc: "Para começar com o essencial.", features: ["CRM completo", "Cadastro ilimitado de clientes", "Tags e funil"], cta: "Começar" },
  { name: "Profissional", price: "R$ 99", desc: "CRM + Agenda + Financeiro.", features: ["Tudo do Básico", "Agenda completa", "Controle financeiro", "Relatórios"], cta: "Mais popular", featured: true },
  { name: "Premium", price: "R$ 199", desc: "Todos os módulos + IA.", features: ["Tudo do Profissional", "Vendas e orçamentos", "Assistente IA", "WhatsApp"], cta: "Falar com vendas" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 surface-glass">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 grid place-items-center text-primary-foreground">
              <Zap className="size-4" />
            </div>
            <span className="font-display font-bold text-lg">LocalPro <span className="text-muted-foreground">CRM</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#modulos" className="hover:text-foreground">Módulos</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
            <a href="#segmentos" className="hover:text-foreground">Para quem</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/auth"><Button size="sm" className="gap-1">Criar conta <ArrowRight className="size-3.5" /></Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-accent),transparent_70%)]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <Badge variant="outline" className="mb-6 gap-1.5 py-1.5 px-3">
            <Sparkles className="size-3" /> Plataforma white-label para qualquer negócio
          </Badge>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-bold tracking-tight">
            Gestão completa<br />
            <span className="gradient-text">para o seu negócio local.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            CRM, agenda, financeiro, vendas e IA em uma única plataforma modular. Ative apenas o que você precisa.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="gap-2">Começar grátis <ArrowRight className="size-4" /></Button></Link>
            <a href="#planos"><Button size="lg" variant="outline">Ver planos</Button></a>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section id="modulos" className="py-20 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold">Tudo em um só lugar</h2>
            <p className="mt-3 text-muted-foreground">Módulos que crescem com o seu negócio.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(m => (
              <div key={m.title} className="rounded-2xl border bg-card p-6 hover:border-primary/30 transition-colors">
                <div className="size-10 rounded-lg bg-accent grid place-items-center text-accent-foreground mb-4">
                  <m.icon className="size-5" />
                </div>
                <h3 className="font-display font-semibold text-lg">{m.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segmentos */}
      <section id="segmentos" className="py-20 border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold">Feito para qualquer segmento</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {["Barbearias","Salões","Clínicas","Consultórios","Oficinas","Restaurantes","Pousadas","Hotéis","Imobiliárias","Advocacia","Energia Solar","Academias","Prestadores"].map(s => (
              <Badge key={s} variant="secondary" className="text-sm px-3 py-1.5">{s}</Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold">Planos transparentes</h2>
            <p className="mt-3 text-muted-foreground">Comece grátis. Faça upgrade quando precisar.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map(p => (
              <div key={p.name} className={`rounded-2xl border bg-card p-6 ${p.featured ? "border-primary shadow-lg ring-1 ring-primary/30" : ""}`}>
                {p.featured && <Badge className="mb-3">Mais popular</Badge>}
                <h3 className="font-display font-bold text-xl">{p.name}</h3>
                <div className="mt-2"><span className="text-3xl font-bold">{p.price}</span><span className="text-muted-foreground">/mês</span></div>
                <p className="text-sm text-muted-foreground mt-2">{p.desc}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2"><Check className="size-4 text-success shrink-0 mt-0.5" />{f}</li>
                  ))}
                </ul>
                <Link to="/auth" className="block mt-6">
                  <Button className="w-full" variant={p.featured ? "default" : "outline"}>{p.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} LocalPro CRM. Plataforma modular para negócios locais.
      </footer>
    </div>
  );
}
