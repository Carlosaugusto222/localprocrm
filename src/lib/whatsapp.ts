// WhatsApp click-to-chat helper (wa.me) — no API key, no backend required.
// Works on web and mobile. Opens the user's WhatsApp with the message pre-filled.

export function normalizePhone(raw: string | null | undefined, defaultCountry = "55"): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  // Brazil: add 55 if missing
  if (digits.length <= 11) return defaultCountry + digits;
  return digits;
}

export function waLink(phone: string | null | undefined, message: string): string {
  const num = normalizePhone(phone);
  const text = encodeURIComponent(message);
  return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function openWhatsApp(phone: string | null | undefined, message: string) {
  if (typeof window === "undefined") return;
  window.open(waLink(phone, message), "_blank", "noopener,noreferrer");
}

// Render {placeholders} from a template
export function renderTemplate(tpl: string, vars: Record<string, string | number | undefined | null>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

export const WA_TEMPLATES = [
  {
    id: "confirm",
    title: "Confirmação de agendamento",
    body: "Olá {nome}! 👋\n\nSeu horário em *{empresa}* está confirmado para *{data}* às *{hora}*.\n\nQualquer imprevisto, me avise por aqui. Até lá! 😊",
    vars: ["nome", "empresa", "data", "hora"],
  },
  {
    id: "reminder",
    title: "Lembrete 24h antes",
    body: "Oi {nome}! Passando para lembrar do seu horário amanhã ({data}) às *{hora}* em *{empresa}*.\n\nPosso confirmar sua presença? ✅",
    vars: ["nome", "empresa", "data", "hora"],
  },
  {
    id: "billing",
    title: "Cobrança amigável",
    body: "Olá {nome}, tudo bem? 🙂\n\nIdentificamos um valor de *{valor}* em aberto referente a *{descricao}*.\n\nPosso te ajudar com o pagamento? Aceitamos Pix, cartão e dinheiro.\n\n— {empresa}",
    vars: ["nome", "empresa", "valor", "descricao"],
  },
  {
    id: "welcome",
    title: "Boas-vindas a novo cliente",
    body: "Seja muito bem-vindo(a) à *{empresa}*, {nome}! 🎉\n\nEstamos felizes em ter você como cliente. Qualquer dúvida é só chamar por aqui.",
    vars: ["nome", "empresa"],
  },
  {
    id: "promo",
    title: "Promoção do mês",
    body: "Oi {nome}! 🎁\n\nPreparamos uma condição especial este mês na *{empresa}*: *{promo}*\n\nVálida até {data}. Quer agendar? 🗓️",
    vars: ["nome", "empresa", "promo", "data"],
  },
  {
    id: "review",
    title: "Pedir avaliação",
    body: "Oi {nome}! 🌟\n\nObrigado por escolher a *{empresa}*. Sua opinião vale ouro pra gente — você poderia deixar uma avaliação?\n\n{link}",
    vars: ["nome", "empresa", "link"],
  },
  {
    id: "os",
    title: "Ordem de serviço pronta",
    body: "Olá {nome}! ✅\n\nSua OS *#{numero} — {titulo}* está *pronta para retirada*.\n\nTotal: *{valor}*\n\n— {empresa}",
    vars: ["nome", "empresa", "numero", "titulo", "valor"],
  },
] as const;
