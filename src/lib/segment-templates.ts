// Pre-built templates per business segment
export type SegmentTemplate = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  modules: string[];
  catalog: { name: string; kind: "product" | "service"; price: number; duration_minutes?: number; category?: string }[];
  customerTags: string[];
  pipeline?: { stage: string; label: string }[];
};

export const SEGMENT_TEMPLATES: SegmentTemplate[] = [
  {
    id: "barbershop", label: "Barbearia", emoji: "💈",
    description: "Cortes, barba, agenda por profissional",
    modules: ["crm","appointments","sales","finance","cash","team","reports","whatsapp","public_booking","loyalty"],
    catalog: [
      { name: "Corte masculino", kind: "service", price: 45, duration_minutes: 30, category: "Cabelo" },
      { name: "Barba", kind: "service", price: 35, duration_minutes: 25, category: "Barba" },
      { name: "Corte + Barba", kind: "service", price: 70, duration_minutes: 50, category: "Combo" },
      { name: "Pigmentação", kind: "service", price: 60, duration_minutes: 40, category: "Estética" },
      { name: "Sobrancelha", kind: "service", price: 20, duration_minutes: 15, category: "Estética" },
      { name: "Pomada modeladora", kind: "product", price: 45, category: "Produtos" },
      { name: "Óleo para barba", kind: "product", price: 55, category: "Produtos" },
    ],
    customerTags: ["VIP","Mensalista","Novo","Aniversariante"],
  },
  {
    id: "salon", label: "Salão de Beleza", emoji: "💇‍♀️",
    description: "Coloração, manicure, estética",
    modules: ["crm","appointments","sales","finance","cash","team","stock","reports","whatsapp","public_booking","loyalty"],
    catalog: [
      { name: "Corte feminino", kind: "service", price: 80, duration_minutes: 60, category: "Cabelo" },
      { name: "Escova", kind: "service", price: 60, duration_minutes: 45, category: "Cabelo" },
      { name: "Coloração", kind: "service", price: 180, duration_minutes: 120, category: "Cabelo" },
      { name: "Hidratação", kind: "service", price: 90, duration_minutes: 60, category: "Tratamento" },
      { name: "Manicure", kind: "service", price: 40, duration_minutes: 45, category: "Unhas" },
      { name: "Pedicure", kind: "service", price: 50, duration_minutes: 60, category: "Unhas" },
      { name: "Design de sobrancelha", kind: "service", price: 35, duration_minutes: 20, category: "Estética" },
    ],
    customerTags: ["VIP","Mensalista","Indicação","Aniversariante"],
  },
  {
    id: "clinic", label: "Clínica / Consultório", emoji: "🩺",
    description: "Consultas, retornos, prontuário",
    modules: ["crm","appointments","sales","finance","service_orders","reports","whatsapp","public_booking"],
    catalog: [
      { name: "Consulta inicial", kind: "service", price: 250, duration_minutes: 60, category: "Consultas" },
      { name: "Retorno", kind: "service", price: 150, duration_minutes: 30, category: "Consultas" },
      { name: "Avaliação", kind: "service", price: 180, duration_minutes: 45, category: "Consultas" },
      { name: "Telemedicina", kind: "service", price: 200, duration_minutes: 30, category: "Online" },
    ],
    customerTags: ["Convênio","Particular","Retorno","Primeira vez"],
  },
  {
    id: "mechanic", label: "Oficina Mecânica", emoji: "🔧",
    description: "Ordens de serviço, peças, estoque",
    modules: ["crm","appointments","sales","finance","service_orders","stock","cash","team","reports","whatsapp"],
    catalog: [
      { name: "Troca de óleo", kind: "service", price: 180, duration_minutes: 30, category: "Manutenção" },
      { name: "Alinhamento", kind: "service", price: 120, duration_minutes: 45, category: "Suspensão" },
      { name: "Balanceamento", kind: "service", price: 80, duration_minutes: 30, category: "Suspensão" },
      { name: "Revisão completa", kind: "service", price: 450, duration_minutes: 180, category: "Manutenção" },
      { name: "Diagnóstico eletrônico", kind: "service", price: 200, duration_minutes: 60, category: "Elétrica" },
      { name: "Pastilha de freio (par)", kind: "product", price: 180, category: "Peças" },
      { name: "Filtro de óleo", kind: "product", price: 45, category: "Peças" },
    ],
    customerTags: ["Frota","Particular","Revisão","Garantia"],
  },
  {
    id: "restaurant", label: "Restaurante", emoji: "🍽️",
    description: "Cardápio, pedidos, caixa, reservas",
    modules: ["crm","appointments","sales","finance","stock","cash","team","reports","whatsapp","public_booking"],
    catalog: [
      { name: "Prato executivo", kind: "product", price: 35, category: "Almoço" },
      { name: "Hambúrguer artesanal", kind: "product", price: 38, category: "Lanches" },
      { name: "Refrigerante 350ml", kind: "product", price: 8, category: "Bebidas" },
      { name: "Suco natural", kind: "product", price: 12, category: "Bebidas" },
      { name: "Sobremesa do dia", kind: "product", price: 18, category: "Sobremesas" },
      { name: "Reserva de mesa", kind: "service", price: 0, duration_minutes: 120, category: "Reservas" },
    ],
    customerTags: ["Frequente","Aniversariante","Delivery","Reserva"],
  },
  {
    id: "gym", label: "Academia", emoji: "🏋️",
    description: "Matrículas, mensalidades, treinos",
    modules: ["crm","appointments","sales","finance","team","reports","whatsapp","public_booking","loyalty"],
    catalog: [
      { name: "Mensalidade", kind: "service", price: 120, category: "Planos" },
      { name: "Trimestral", kind: "service", price: 330, category: "Planos" },
      { name: "Anual", kind: "service", price: 1200, category: "Planos" },
      { name: "Avaliação física", kind: "service", price: 80, duration_minutes: 60, category: "Avaliação" },
      { name: "Personal trainer/hora", kind: "service", price: 100, duration_minutes: 60, category: "Personal" },
      { name: "Aula experimental", kind: "service", price: 0, duration_minutes: 60, category: "Captação" },
    ],
    customerTags: ["Ativo","Inadimplente","Novo","VIP"],
  },
  {
    id: "real_estate", label: "Imobiliária", emoji: "🏠",
    description: "Imóveis, visitas, funil de vendas",
    modules: ["crm","appointments","sales","finance","reports","whatsapp"],
    catalog: [
      { name: "Visita agendada", kind: "service", price: 0, duration_minutes: 60, category: "Atendimento" },
      { name: "Avaliação de imóvel", kind: "service", price: 300, duration_minutes: 90, category: "Avaliação" },
      { name: "Documentação", kind: "service", price: 500, category: "Serviços" },
    ],
    customerTags: ["Comprador","Vendedor","Locatário","Investidor"],
    pipeline: [
      { stage: "new", label: "Lead novo" },
      { stage: "qualified", label: "Qualificado" },
      { stage: "visiting", label: "Visitando" },
      { stage: "proposal", label: "Proposta" },
      { stage: "won", label: "Fechado" },
      { stage: "lost", label: "Perdido" },
    ],
  },
  {
    id: "tech_repair", label: "Assistência Técnica", emoji: "🛠️",
    description: "OS, orçamentos, peças, garantia (celular, info, eletro)",
    modules: ["crm","appointments","sales","finance","service_orders","stock","cash","team","reports","whatsapp"],
    catalog: [
      { name: "Diagnóstico técnico", kind: "service", price: 50, duration_minutes: 30, category: "Diagnóstico" },
      { name: "Troca de tela (smartphone)", kind: "service", price: 350, duration_minutes: 60, category: "Reparo" },
      { name: "Troca de bateria", kind: "service", price: 180, duration_minutes: 40, category: "Reparo" },
      { name: "Formatação / instalação de sistema", kind: "service", price: 120, duration_minutes: 90, category: "Software" },
      { name: "Limpeza interna / pasta térmica", kind: "service", price: 90, duration_minutes: 45, category: "Manutenção" },
      { name: "Reparo em placa", kind: "service", price: 250, duration_minutes: 120, category: "Reparo" },
      { name: "Recuperação de dados", kind: "service", price: 300, duration_minutes: 120, category: "Software" },
      { name: "Película 3D", kind: "product", price: 40, category: "Acessórios" },
      { name: "Capa protetora", kind: "product", price: 50, category: "Acessórios" },
      { name: "Carregador original", kind: "product", price: 120, category: "Acessórios" },
    ],
    customerTags: ["Garantia","Orçamento","Aguardando peça","Retirado","VIP"],
    pipeline: [
      { stage: "received", label: "Recebido" },
      { stage: "diagnosing", label: "Em diagnóstico" },
      { stage: "quoted", label: "Orçamento enviado" },
      { stage: "approved", label: "Aprovado" },
      { stage: "repairing", label: "Em reparo" },
      { stage: "ready", label: "Pronto p/ retirada" },
      { stage: "delivered", label: "Entregue" },
    ],
  },
  {
    id: "generic", label: "Outro / Genérico", emoji: "🏢",
    description: "Configurar manualmente",
    modules: ["crm","appointments","sales","finance","reports"],
    catalog: [],
    customerTags: ["Cliente","Lead","VIP"],
  },
];

export function getTemplate(id?: string | null) {
  return SEGMENT_TEMPLATES.find(t => t.id === id) ?? SEGMENT_TEMPLATES[SEGMENT_TEMPLATES.length - 1];
}
