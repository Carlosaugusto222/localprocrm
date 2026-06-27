import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

const URL = "https://localprocrm.lovable.app/contato";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — LocalPro CRM" },
      { name: "description", content: "Fale com a equipe LocalPro CRM. Tire dúvidas, peça uma demonstração ou solicite suporte personalizado." },
      { property: "og:title", content: "Contato — LocalPro CRM" },
      { property: "og:description", content: "Fale com a nossa equipe e descubra como o LocalPro pode transformar o seu negócio." },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "Contato — LocalPro CRM",
        url: URL,
      }),
    }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">Fale com a gente</h1>
          <p className="mt-4 text-lg text-muted-foreground">Estamos prontos para ajudar você a tirar o máximo do LocalPro CRM.</p>
        </header>
        <section className="grid sm:grid-cols-2 gap-4">
          <a href="mailto:contato@localprocrm.com" className="rounded-2xl border bg-card p-6 hover:border-primary/30 transition-colors">
            <Mail className="size-6 text-primary mb-3" />
            <h2 className="font-display font-semibold text-lg">E-mail</h2>
            <p className="text-sm text-muted-foreground mt-1">contato@localprocrm.com</p>
          </a>
          <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="rounded-2xl border bg-card p-6 hover:border-primary/30 transition-colors">
            <MessageSquare className="size-6 text-primary mb-3" />
            <h2 className="font-display font-semibold text-lg">WhatsApp</h2>
            <p className="text-sm text-muted-foreground mt-1">Atendimento comercial em horário comercial.</p>
          </a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
