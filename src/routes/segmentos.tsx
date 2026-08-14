import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

const URL = "https://localprocrm.lovable.app/segmentos";
const OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7cde7e02-1ecb-4de6-95c6-2e23c449c4cc/id-preview-879f10b7--5ebb0209-08e6-4040-a14d-664df6d7e6d9.lovable.app-1782399781510.png";

export const Route = createFileRoute("/segmentos")({
  head: () => ({
    meta: [
      { title: "Segmentos atendidos — LocalPro CRM" },
      { name: "description", content: "Sistema de gestão para barbearias, salões, clínicas, oficinas, restaurantes, assistência técnica, hotéis, imobiliárias e mais." },
      { property: "og:title", content: "Segmentos atendidos — LocalPro CRM" },
      { property: "og:description", content: "Adaptável a qualquer negócio local: barbearia, clínica, oficina, restaurante, assistência técnica e muito mais." },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:title", content: "Segmentos atendidos — LocalPro CRM" },
      { name: "twitter:description", content: "Adaptável a qualquer negócio local: barbearia, clínica, oficina, restaurante, assistência técnica e muito mais." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Segmentos Atendidos pelo LocalPro CRM",
        description: "Lista de tipos de negócios que podem usar a plataforma.",
        itemListElement: segments.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: s.name,
          description: s.desc,
        })),
      }),
    }],
  }),
  component: SegmentsPage,
});

const segments = [
  { name: "Barbearias e Salões", desc: "Agenda por profissional, comissões, fila de espera e ficha do cliente com histórico de cortes e químicas." },
  { name: "Clínicas e Consultórios", desc: "Prontuário simplificado, agenda por sala/profissional, anamnese e lembretes automáticos por WhatsApp." },
  { name: "Oficinas Mecânicas", desc: "Ordem de serviço com peças, mão de obra, fotos do veículo, orçamento aprovado e histórico por placa." },
  { name: "Assistência Técnica", desc: "OS com diagnóstico, reparo e status pronto. Etiquetas, garantia e devolução do equipamento." },
  { name: "Restaurantes e Lanchonetes", desc: "PDV ágil, controle de mesas, comandas e fechamento de caixa diário." },
  { name: "Hotéis e Pousadas", desc: "Reservas, check-in/out, controle de hóspedes e frigobar lançado direto no consumo." },
  { name: "Imobiliárias", desc: "CRM de leads, funil de visitas, propostas e fechamento de contratos." },
  { name: "Escritórios de Advocacia", desc: "Cadastro de clientes e processos, agenda de audiências, prazos e honorários." },
  { name: "Energia Solar", desc: "Funil comercial, propostas, contratos e acompanhamento de instalação." },
  { name: "Academias e Estúdios", desc: "Alunos, mensalidades, frequência e renovações automáticas." },
  { name: "Prestadores de Serviço", desc: "Orçamentos rápidos, agenda de visitas técnicas e cobrança via WhatsApp." },
  { name: "Lojas e Comércio Local", desc: "PDV, estoque com SKU, código de barras, formas de pagamento e cupom não fiscal." },
];

function SegmentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">Adaptável a qualquer negócio local</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">O LocalPro CRM ajusta funis, catálogo e fluxos ao segmento da sua empresa logo no primeiro acesso.</p>
        </header>
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Segmentos atendidos">
          {segments.map(s => (
            <article key={s.name} className="rounded-2xl border bg-card p-6">
              <h2 className="font-display font-semibold text-lg">{s.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
            </article>
          ))}
        </section>
        <div className="text-center mt-12">
          <Link to="/auth"><Button size="lg">Configurar para o meu segmento</Button></Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
