import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Scissors, Sparkles, Stethoscope, Wrench, UtensilsCrossed, Dumbbell, Building2, BookOpen, Calendar, Users, Wallet, ShoppingBag, MessageCircle, BarChart3, Settings, CheckCircle2, Lightbulb, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/guia")({
  component: GuiaPage,
});

type Segment = {
  id: string;
  name: string;
  icon: typeof Scissors;
  description: string;
  modulesOn: string[];
  modulesOff: string[];
  catalog: { name: string; price: string; type: "Serviço" | "Produto" }[];
  tags: string[];
  daily: string[];
  weekly: string[];
  monthly: string[];
  tips: string[];
};

const SEGMENTS: Segment[] = [
  {
    id: "barbearia",
    name: "Barbearia",
    icon: Scissors,
    description: "Atendimentos rápidos, alta recorrência, ticket médio baixo.",
    modulesOn: ["CRM", "Agenda", "Financeiro", "Vendas", "WhatsApp"],
    modulesOff: ["Funil", "IA (inicialmente)"],
    catalog: [
      { name: "Corte masculino", price: "R$ 40", type: "Serviço" },
      { name: "Corte + Barba", price: "R$ 60", type: "Serviço" },
      { name: "Barba", price: "R$ 30", type: "Serviço" },
      { name: "Pezinho", price: "R$ 15", type: "Serviço" },
      { name: "Pomada modeladora", price: "R$ 35", type: "Produto" },
    ],
    tags: ["mensal", "vip", "barba", "só corte", "inativo"],
    daily: [
      "Abrir a Agenda na visão Dia logo de manhã",
      "Atender → fechar venda em Vendas (já lança no Financeiro)",
      "No final do dia, lançar despesas (aluguel rateado, produtos, comissão)",
    ],
    weekly: [
      "Filtrar no CRM clientes sem agendamento há 30+ dias",
      "Enviar mensagem de reativação pelo WhatsApp",
      "Exportar relatório financeiro da semana",
    ],
    monthly: [
      "Ver top 10 clientes em receita",
      "Analisar ticket médio e ajustar tabela de preços",
      "Planejar campanha sazonal (Dia dos Pais, Natal)",
    ],
    tips: [
      "Use anotações na ficha do cliente: 'máquina 2 dos lados', 'gosta sem perfume'",
      "Crie agendamentos 'fakes' pra bloquear horário de almoço",
      "Tag 'mensal' identifica quem volta a cada 30 dias — base mais valiosa",
    ],
  },
  {
    id: "salao",
    name: "Salão de Beleza",
    icon: Sparkles,
    description: "Serviços longos, múltiplas profissionais, alto ticket.",
    modulesOn: ["CRM", "Agenda", "Financeiro", "Vendas", "WhatsApp", "IA"],
    modulesOff: ["Funil"],
    catalog: [
      { name: "Escova", price: "R$ 80", type: "Serviço" },
      { name: "Coloração", price: "R$ 250", type: "Serviço" },
      { name: "Mechas", price: "R$ 400", type: "Serviço" },
      { name: "Manicure", price: "R$ 50", type: "Serviço" },
      { name: "Shampoo profissional", price: "R$ 120", type: "Produto" },
    ],
    tags: ["coloração", "alongamento", "noiva", "vip", "mensalista"],
    daily: [
      "Confirmar agendamentos do dia via WhatsApp na noite anterior",
      "Registrar consumo de produto em cada atendimento",
      "Fechar caixa separando por profissional (campo 'responsável')",
    ],
    weekly: [
      "Conferir comissões por profissional no Financeiro",
      "Reativar clientes que costumam pintar a cada 45 dias",
    ],
    monthly: [
      "Análise de margem por serviço (custo do produto vs preço)",
      "Promoção em horário ocioso (terças/quartas)",
    ],
    tips: [
      "Cadastre cada profissional como usuário pra ela ver só os próprios agendamentos",
      "Use tag por tipo de cabelo/química pra campanhas direcionadas",
    ],
  },
  {
    id: "clinica",
    name: "Clínica / Consultório",
    icon: Stethoscope,
    description: "Agendamentos com retorno, prontuário, alta privacidade.",
    modulesOn: ["CRM", "Agenda", "Financeiro", "WhatsApp"],
    modulesOff: ["Vendas", "Funil"],
    catalog: [
      { name: "Consulta inicial", price: "R$ 350", type: "Serviço" },
      { name: "Retorno", price: "R$ 0", type: "Serviço" },
      { name: "Procedimento A", price: "R$ 800", type: "Serviço" },
    ],
    tags: ["particular", "convênio", "retorno", "primeira vez"],
    daily: [
      "Confirmar consultas do dia seguinte por WhatsApp (reduz no-show)",
      "Lançar pagamento logo após atendimento",
      "Marcar retorno já na saída do paciente",
    ],
    weekly: [
      "Revisar pacientes em tratamento sem retorno marcado",
      "Conciliação de recebimentos de convênio",
    ],
    monthly: [
      "Relatório de faturamento por convênio vs particular",
      "Pacientes inativos há 6+ meses → campanha de retorno",
    ],
    tips: [
      "Use o campo de anotações apenas para dados administrativos — prontuário clínico fica em sistema próprio (LGPD)",
      "Bloqueie 15 min entre consultas como agendamento 'Intervalo'",
    ],
  },
  {
    id: "oficina",
    name: "Oficina Mecânica",
    icon: Wrench,
    description: "Serviços longos, orçamentos, peças e mão de obra.",
    modulesOn: ["CRM", "Agenda", "Financeiro", "Vendas", "WhatsApp"],
    modulesOff: ["Funil"],
    catalog: [
      { name: "Troca de óleo", price: "R$ 180", type: "Serviço" },
      { name: "Revisão completa", price: "R$ 450", type: "Serviço" },
      { name: "Alinhamento", price: "R$ 90", type: "Serviço" },
      { name: "Filtro de ar", price: "R$ 45", type: "Produto" },
    ],
    tags: ["frota", "revisão", "garantia", "particular"],
    daily: [
      "Criar orçamento em Vendas antes de iniciar o serviço",
      "Atualizar cliente por WhatsApp quando carro estiver pronto",
      "Lançar peças usadas como itens da venda",
    ],
    weekly: [
      "Lembrar clientes da próxima revisão por quilometragem",
    ],
    monthly: [
      "Margem por tipo de serviço (peça vs mão de obra)",
      "Clientes frota: relatório consolidado mensal",
    ],
    tips: [
      "Coloque a placa do veículo no nome do cliente: 'João — ABC-1234'",
      "Use anotações pra histórico de problemas: 'já trocou correia em mar/25'",
    ],
  },
  {
    id: "restaurante",
    name: "Restaurante / Bar",
    icon: UtensilsCrossed,
    description: "Reservas, delivery, controle de caixa diário.",
    modulesOn: ["Agenda (reservas)", "Financeiro", "Vendas", "WhatsApp"],
    modulesOff: ["CRM (opcional)", "Funil"],
    catalog: [
      { name: "Couvert", price: "R$ 25", type: "Serviço" },
      { name: "Reserva mesa 4 pessoas", price: "R$ 0", type: "Serviço" },
    ],
    tags: ["delivery", "reserva", "evento", "fidelidade"],
    daily: [
      "Visão Dia da Agenda = mapa de reservas",
      "Fechamento de caixa por turno (almoço/jantar)",
    ],
    weekly: [
      "Confronto entre receita declarada e movimento bancário",
    ],
    monthly: [
      "Análise de pratos mais vendidos (use o nome do produto na venda)",
    ],
    tips: [
      "Pra delivery, registre cada pedido como uma venda rápida — gera relatório de demanda por dia da semana",
    ],
  },
  {
    id: "academia",
    name: "Academia / Estúdio",
    icon: Dumbbell,
    description: "Mensalidades recorrentes, controle de matrículas.",
    modulesOn: ["CRM", "Financeiro", "WhatsApp"],
    modulesOff: ["Agenda (se aulas livres)", "Vendas"],
    catalog: [
      { name: "Mensalidade Plano Smart", price: "R$ 99", type: "Serviço" },
      { name: "Mensalidade Plano Black", price: "R$ 179", type: "Serviço" },
      { name: "Avaliação física", price: "R$ 80", type: "Serviço" },
    ],
    tags: ["smart", "black", "trimestral", "anual", "inadimplente"],
    daily: [
      "Lançar matrículas novas no CRM com tag do plano",
      "Confirmar pagamento de mensalidade no Financeiro",
    ],
    weekly: [
      "Relatório de inadimplência (clientes sem receita registrada no mês)",
      "Mensagem de cobrança via WhatsApp",
    ],
    monthly: [
      "Churn: alunos que cancelaram",
      "Receita recorrente (MRR) — soma das mensalidades ativas",
    ],
    tips: [
      "Use receita 'parcelada' no Financeiro pra contratos anuais",
      "Tag 'inadimplente' atualizada toda segunda economiza horas",
    ],
  },
  {
    id: "imobiliaria",
    name: "Imobiliária / Serviços B2B",
    icon: Building2,
    description: "Ciclo de venda longo, leads, negociação. Funil é essencial.",
    modulesOn: ["CRM", "Funil", "Agenda", "Financeiro", "WhatsApp", "IA"],
    modulesOff: ["Vendas (catálogo)"],
    catalog: [
      { name: "Comissão venda 6%", price: "%", type: "Serviço" },
      { name: "Locação 1 aluguel", price: "%", type: "Serviço" },
    ],
    tags: ["aluguel", "compra", "comercial", "alto padrão", "quente"],
    daily: [
      "Todo lead novo entra no Funil na coluna 'Novo'",
      "Agendar visita = agendamento vinculado ao cliente",
      "Mover card entre colunas conforme avança",
    ],
    weekly: [
      "Revisar coluna 'Negociação' — leads parados >7 dias",
      "Forecast: somar valor potencial em cada coluna",
    ],
    monthly: [
      "Taxa de conversão por coluna",
      "Comissão fechada vs prevista",
    ],
    tips: [
      "Funil é o coração — abra todo dia de manhã",
      "Use a IA pra escrever mensagem de follow-up personalizada",
    ],
  },
];

const MODULE_GUIDES = [
  {
    icon: Users,
    title: "CRM — Clientes",
    points: [
      "Cadastre WhatsApp logo na criação (essencial pra lembretes)",
      "Use tags pra segmentar (vip, mensal, inativo) — facilita campanhas",
      "Abra a ficha do cliente antes do atendimento: vê histórico + anotações",
      "Pipeline_stage move o cliente automaticamente entre estágios do funil",
    ],
  },
  {
    icon: Calendar,
    title: "Agenda",
    points: [
      "Visão Dia = sua tela operacional",
      "Visão Semana = ver buracos pra oferecer a quem ligar",
      "Sempre vincule o agendamento a um cliente cadastrado",
      "Bloqueie horários (almoço, intervalos) criando agendamentos fakes",
    ],
  },
  {
    icon: Wallet,
    title: "Financeiro",
    points: [
      "Receitas são criadas automaticamente ao fechar uma venda",
      "Lance despesas TODO dia (não acumule pra fim do mês)",
      "Use 'parcelado' pra contratos longos (mensalidades, financiamentos)",
      "Fluxo de caixa de 30 dias mostra tendência real",
    ],
  },
  {
    icon: ShoppingBag,
    title: "Vendas",
    points: [
      "Cadastre serviços como 'produtos' — vira catálogo",
      "Cada venda gera receita automática no Financeiro",
      "Orçamento = venda com status 'rascunho', vira pedido quando aprovado",
    ],
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    points: [
      "Templates prontos pra confirmação, lembrete e reativação",
      "Estrutura pronta — integração com API real é o próximo passo",
      "Use junto com filtros do CRM pra disparar pra grupos específicos",
    ],
  },
  {
    icon: Sparkles,
    title: "Assistente IA",
    points: [
      "4 botões rápidos: resumir base, campanha, boas-vindas, relatório do mês",
      "A IA já recebe os dados do seu tenant — não precisa explicar nada",
      "Use pra gerar texto de WhatsApp em segundos",
    ],
  },
  {
    icon: BarChart3,
    title: "Relatórios & Auditoria",
    points: [
      "Exportação em CSV, Excel (XLSX) e PDF",
      "Use o PDF pro contador, o Excel pra análise estratégica",
      "Filtre por período antes de exportar",
      "Logs de Auditoria: Rastreie quem alterou preços ou status de OS",
    ],
  },
  {
    icon: Settings,
    title: "Configurações",
    points: [
      "Ative só os módulos que você usa — interface fica mais limpa",
      "Troque de plano aqui (Básico → Pro → Premium)",
      "Convide funcionários e defina os módulos que cada um vê",
    ],
  },
];

function GuiaPage() {
  const [segmentId, setSegmentId] = useState<string>("barbearia");
  const segment = SEGMENTS.find(s => s.id === segmentId)!;
  const SegmentIcon = segment.icon;

  return (
    <PageContainer>
      <PageHeader
        title="Guia de Uso"
        description="Aprenda o fluxo ideal pro seu tipo de negócio. Aplicável em 15 minutos."
      />

      <Tabs defaultValue="segmento" className="space-y-6">
        <TabsList>
          <TabsTrigger value="segmento"><Zap className="size-4 mr-2" />Por Segmento</TabsTrigger>
          <TabsTrigger value="modulos"><BookOpen className="size-4 mr-2" />Por Módulo</TabsTrigger>
          <TabsTrigger value="inicio"><CheckCircle2 className="size-4 mr-2" />Primeiros Passos</TabsTrigger>
        </TabsList>

        <TabsContent value="segmento" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Escolha seu tipo de negócio</CardTitle>
              <CardDescription>O guia se adapta ao seu segmento.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={segmentId} onValueChange={setSegmentId}>
                <SelectTrigger className="w-full sm:w-[320px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                  <SegmentIcon className="size-5" />
                </div>
                <div>
                  <CardTitle>{segment.name}</CardTitle>
                  <CardDescription>{segment.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Módulos recomendados</CardTitle>
                <CardDescription>Ative em Configurações → Módulos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">ATIVAR</p>
                  <div className="flex flex-wrap gap-2">
                    {segment.modulesOn.map(m => (
                      <Badge key={m} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">{m}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">DESATIVAR (POR ENQUANTO)</p>
                  <div className="flex flex-wrap gap-2">
                    {segment.modulesOff.map(m => (
                      <Badge key={m} variant="outline">{m}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Tags sugeridas</CardTitle>
                <CardDescription>Use no CRM pra segmentar clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {segment.tags.map(t => (
                    <Badge key={t} variant="secondary">#{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Catálogo sugerido</CardTitle>
              <CardDescription>Cadastre em Vendas → Produtos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg divide-y">
                {segment.catalog.map(item => (
                  <div key={item.name} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{item.price}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rotina diária</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {segment.daily.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary font-bold tabular-nums">{i + 1}.</span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rotina semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {segment.weekly.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary font-bold tabular-nums">{i + 1}.</span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rotina mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {segment.monthly.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary font-bold tabular-nums">{i + 1}.</span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" />
                <CardTitle className="text-base">Dicas de ouro</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {segment.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modulos">
          <div className="grid md:grid-cols-2 gap-4">
            {MODULE_GUIDES.map(mod => (
              <Card key={mod.title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
                      <mod.icon className="size-4" />
                    </div>
                    <CardTitle className="text-base">{mod.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {mod.points.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inicio">
          <Card>
            <CardHeader>
              <CardTitle>Configure tudo em 15 minutos</CardTitle>
              <CardDescription>Siga esta ordem e seu sistema está pronto pra operar.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {[
                  { t: "Ajuste sua empresa", d: "Vá em Configurações → preencha nome, segmento e plano." },
                  { t: "Ative só os módulos que você usa", d: "Em Configurações → Módulos. Desative o que não fizer sentido — interface fica mais limpa." },
                  { t: "Frente de Loja (PDV)", d: "Use o /pdv para vendas rápidas com leitor de código de barras e controle de caixa." },
                  { t: "Cadastre seu catálogo com SKU", d: "Em Vendas → Produtos. Use SKUs para controle preciso de estoque e busca no PDV." },
                  { t: "Ordens de Serviço (OS)", d: "Gerencie reparos complexos, adicione peças e serviços, e envie para o cliente via WhatsApp." },
                  { t: "Use a IA para Planejamento", d: "Em Planejamento, peça sugestões de campanhas e posts baseados nos seus dados." },
                  { t: "WhatsApp Inbox Inteligente", d: "Responda clientes com sugestões da IA e alterne entre atendimento bot/humano." },
                  { t: "Acompanhe pela Nova Início", d: "Veja seus resultados, clientes e agenda centralizados na nova dashboard de entrada." },
                ].map((s, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold shrink-0">{i + 1}</div>
                    <div>
                      <p className="font-medium">{s.t}</p>
                      <p className="text-sm text-muted-foreground">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
