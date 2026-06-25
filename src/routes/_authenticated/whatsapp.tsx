import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Clock, Bell, CheckCircle2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — LocalPro CRM" }] }),
  component: WhatsApp,
});

const templates = [
  { title: "Confirmação de agendamento", body: "Olá {nome}, seu horário está confirmado para {data} às {hora}. Até lá!" },
  { title: "Lembrete 24h antes", body: "Oi {nome}! Passando para lembrar do seu horário amanhã às {hora}." },
  { title: "Cobrança amigável", body: "Olá {nome}, identificamos que há um valor de {valor} em aberto. Podemos ajudar com o pagamento?" },
  { title: "Mensagem de boas-vindas", body: "Seja bem-vindo(a) à {empresa}! Estamos felizes em ter você como cliente." },
];

function WhatsApp() {
  return (
    <PageContainer>
      <PageHeader title="WhatsApp" description="Automatize a comunicação com seus clientes." />
      <Card className="p-6 mb-6 border-warning/40 bg-warning/5">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-lg bg-warning/20 grid place-items-center text-warning-foreground">
            <Clock className="size-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold">Integração em preparação</h3>
            <p className="text-sm text-muted-foreground mt-1">
              A estrutura está pronta. Conecte um provedor (Twilio, Z-API ou WhatsApp Business API) nas configurações para começar a enviar mensagens automaticamente.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <FeatureCard icon={CheckCircle2} title="Confirmações automáticas" desc="Confirme agendamentos em poucos cliques." />
        <FeatureCard icon={Bell} title="Lembretes" desc="Reduza faltas com lembretes 24h antes." />
        <FeatureCard icon={MessageCircle} title="Cobranças" desc="Envie cobranças amigáveis aos clientes." />
      </div>

      <h2 className="font-display font-semibold text-lg mb-3">Templates prontos</h2>
      <div className="grid gap-3">
        {templates.map(t => (
          <Card key={t.title} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{t.title}</h3>
              <Badge variant="outline">Template</Badge>
            </div>
            <p className="text-sm text-muted-foreground italic">"{t.body}"</p>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{className?: string}>; title: string; desc: string }) {
  return (
    <Card className="p-4">
      <div className="size-9 rounded-lg bg-success/15 text-success grid place-items-center mb-3"><Icon className="size-4" /></div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </Card>
  );
}
