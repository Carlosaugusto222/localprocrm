import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { McxProductCard } from "@/components/mcx-product-card";
import logoAsset from "@/assets/mcx-logo.png.asset.json";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — MCX Digital" },
      { name: "description", content: "Conheça os produtos da MCX Digital. Explore o LocalPro CRM, nossa plataforma de gestão para negócios locais." },
      { property: "og:title", content: "Produtos — MCX Digital" },
      { property: "og:description", content: "Conheça os produtos da MCX Digital. Explore o LocalPro CRM, nossa plataforma de gestão para negócios locais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Produtos,
});

function Produtos() {
  return (
    <div className="min-h-screen bg-mcx-surface text-mcx-ink">
      <header className="border-b border-mcx-ink/10">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link to="/" aria-label="MCX Digital — início" className="focus-visible:outline-2 focus-visible:outline-mcx-highlight">
            <img src={logoAsset.url} alt="MCX Digital" className="h-9 w-auto sm:h-11" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-mcx-soft transition-colors hover:text-mcx-ink focus-visible:outline-2 focus-visible:outline-mcx-highlight"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao início</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-8 sm:pt-24">
        <div className="mb-12 max-w-2xl sm:mb-16">
          <p className="mb-5 text-xs font-semibold uppercase text-mcx-highlight">MCX Digital / Produtos</p>
          <h1 className="font-display text-5xl font-semibold leading-tight sm:text-6xl">Produtos feitos para o seu negócio.</h1>
          <p className="mt-6 text-lg leading-relaxed text-mcx-soft">Tecnologia própria, criada para simplificar a operação e abrir espaço para o crescimento.</p>
        </div>
        <McxProductCard />
      </main>
    </div>
  );
}