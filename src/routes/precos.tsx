import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

const URL = "https://localprocrm.lovable.app/precos";

const plans = [
  { name: "Básico", price: "49", desc: "Para começar com o essencial.", features: ["CRM completo", "Clientes ilimitados", "Tags e funil", "Suporte por e-mail"], cta: "Começar grátis" },
  { name: "Profissional", price: "99", desc: "CRM + Agenda + Financeiro + OS.", features: ["Tudo do Básico", "Agenda completa", "Ordens de serviço", "Controle financeiro", "Relatórios e exportações"], cta: "Assinar profissional", featured: true },
  { name: "Premium", price: "199", desc: "Todos os módulos + IA + PDV.", features: ["Tudo do Profissional", "PDV / Frente de loja", "Assistente IA", "WhatsApp templates", "Multi-empresa"], cta: "Falar com vendas" },
];

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Planos e preços — LocalPro CRM a partir de R$ 49/mês" },
      { name: "description", content: "Planos transparentes a partir de R$ 49/mês. CRM, agenda, financeiro, OS, PDV e IA. Comece grátis e faça upgrade quando precisar." },
      { property: "og:title", content: "Planos e preços — LocalPro CRM" },
      { property: "og:description", content: "Planos a partir de R$ 49/mês. Comece grátis." },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "LocalPro CRM",
        description: "Plataforma modular de gestão para negócios locais.",
        brand: { "@type": "Brand", name: "LocalPro CRM" },
        offers: plans.map(p => ({
          "@type": "Offer",
          name: `Plano ${p.name}`,
          price: p.price,
          priceCurrency: "BRL",
          priceSpecification: { "@type": "UnitPriceSpecification", price: p.price, priceCurrency: "BRL", unitText: "MONTH" },
          availability: "https://schema.org/InStock",
          url: URL,
        })),
      }),
    }],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">Planos transparentes</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Comece grátis. Faça upgrade quando precisar. Sem fidelidade.</p>
        </header>
        <section className="grid md:grid-cols-3 gap-4" aria-label="Lista de planos">
          {plans.map(p => (
            <article key={p.name} className={`rounded-2xl border bg-card p-6 ${p.featured ? "border-primary shadow-lg ring-1 ring-primary/30" : ""}`}>
              {p.featured && <Badge className="mb-3">Mais popular</Badge>}
              <h2 className="font-display font-bold text-xl">{p.name}</h2>
              <div className="mt-2"><span className="text-3xl font-bold">R$ {p.price}</span><span className="text-muted-foreground">/mês</span></div>
              <p className="text-sm text-muted-foreground mt-2">{p.desc}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2"><Check className="size-4 text-success shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <Link to="/auth" className="block mt-6">
                <Button className="w-full" variant={p.featured ? "default" : "outline"}>{p.cta}</Button>
              </Link>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
