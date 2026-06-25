// Central registry of feature modules
export const ALL_MODULES = [
  { id: "crm", label: "CRM (Clientes)" },
  { id: "appointments", label: "Agenda" },
  { id: "sales", label: "Vendas" },
  { id: "finance", label: "Financeiro" },
  { id: "service_orders", label: "Ordens de Serviço" },
  { id: "stock", label: "Estoque" },
  { id: "cash", label: "Caixa" },
  { id: "team", label: "Equipe & Comissões" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "ai", label: "Assistente IA" },
  { id: "reports", label: "Relatórios" },
  { id: "public_booking", label: "Portal do Cliente" },
  { id: "loyalty", label: "Fidelidade" },
] as const;

export const PLANS = [
  {
    id: "basic", name: "Básico", price: "R$ 49",
    modules: ["crm", "appointments", "sales", "reports"],
  },
  {
    id: "pro", name: "Profissional", price: "R$ 99",
    modules: ["crm", "appointments", "sales", "finance", "service_orders", "stock", "cash", "reports", "whatsapp"],
  },
  {
    id: "premium", name: "Premium", price: "R$ 199",
    modules: ALL_MODULES.map(m => m.id),
  },
] as const;

export const PAYMENT_METHODS = [
  { id: "cash", label: "Dinheiro" },
  { id: "pix", label: "Pix" },
  { id: "debit", label: "Cartão Débito" },
  { id: "credit", label: "Cartão Crédito" },
  { id: "boleto", label: "Boleto" },
  { id: "transfer", label: "Transferência" },
  { id: "other", label: "Outro" },
] as const;
