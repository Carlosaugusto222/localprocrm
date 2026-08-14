import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Calendar, Wallet, ShoppingBag, Sparkles, BarChart3, ScrollText, MessageSquare, Boxes, ClipboardList, Banknote, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

const URL = "https://localprocrm.lovable.app/recursos";
const OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7cde7e02-1ecb-4de6-95c6-2e23c449c4cc/id-preview-879f10b7--5ebb0209-08e6-4040-a14d-664df6d7e6d9.lovable.app-1782399781510.png";

export const Route = createFileRoute("/recursos")({
  head: () => ({
    meta: [
      { title: "Recursos do LocalPro CRM — CRM, Agenda, PDV, OS, IA" },
      { name: "description", content: "Conheça todos os módulos: CRM, agenda com drag & drop, PDV/frente de loja, ordens de serviço, financeiro, vendas, IA e WhatsApp." },
      { property: "og:title", content: "Recursos do LocalPro CRM — CRM, Agenda, PDV, OS, IA" },
      { property: "og:description", content: "Módulos completos para gerir clientes, vendas, agenda, OS, caixa e marketing com IA." },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:title", content: "Recursos do LocalPro CRM — CRM, Agenda, PDV, OS, IA" },
      { name: "twitter:description", content: "Módulos completos para gerir clientes, vendas, agenda, OS, caixa e marketing com IA." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Recursos LocalPro CRM",
        description: "Lista de módulos e funcionalidades disponíveis.",
        itemListElement: features.map((f, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: f.title,
          description: f.desc,
        })),
      }),
    }],
  }),
  component: ResourcesPage,
});

const features = [
  { icon: Users, title: "CRM completo", desc: "Clientes, tags, segmentação, funil de vendas Kanban e histórico de interações." },
  { icon: Calendar, title: "Agenda inteligente", desc: "Calendário diário, semanal e mensal com drag & drop, lembretes e agendamento público." },
  { icon: ShoppingBag, title: "PDV / Frente de Loja", desc: "Terminal de vendas com leitor de código de barras, pagamentos múltiplos e cupom não fiscal." },
  { icon: ClipboardList, title: "Ordens de Serviço", desc: "OS profissional com orçamento, status, PDF, recibo e envio direto pelo WhatsApp." },
  { icon: Wallet, title: "Financeiro", desc: "Receitas, despesas, categorias, fluxo de caixa e relatórios completos." },
  { icon: Banknote, title: "Controle de caixa", desc: "Abertura e fechamento diário, conciliação por forma de pagamento e sangria." },
  { icon: Boxes, title: "Estoque", desc: "Produtos com SKU, código de barras, custo, estoque mínimo e baixa automática nas vendas." },
  { icon: Sparkles, title: "Assistente IA", desc: "Gere campanhas, mensagens e promoções com contexto do seu negócio." },
  { icon: MessageSquare, title: "WhatsApp", desc: "Templates prontos: confirmação, lembrete, cobrança, boas-vindas, promoções e avaliações." },
  { icon: BarChart3, title: "Relatórios e Dashboards", desc: "KPIs em tempo real, comparativo mensal e exportação em PDF, Excel e CSV." },
  { icon: ScrollText, title: "Planejamento de marketing", desc: "Calendário editorial de campanhas, promoções e publicações com sugestões da IA." },
  { icon: Building2, title: "Multi-tenant", desc: "Várias empresas em uma conta com isolamento total de dados e papéis personalizados." },
];

function ResourcesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">Recursos completos para o seu negócio</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Tudo o que você precisa para vender mais, atender melhor e organizar a operação — em um só lugar.</p>
        </header>
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Lista de recursos">
          {features.map(f => (
            <article key={f.title} className="rounded-2xl border bg-card p-6">
              <div className="size-10 rounded-lg bg-accent grid place-items-center text-accent-foreground mb-4">
                <f.icon className="size-5" />
              </div>
              <h2 className="font-display font-semibold text-lg">{f.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </article>
          ))}
        </section>
        <div className="text-center mt-12">
          <Link to="/auth"><Button size="lg">Começar grátis</Button></Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
