import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MessageCircle, Copy, Send, Search, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WA_TEMPLATES, renderTemplate, openWhatsApp } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — LocalPro CRM" }] }),
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const { org } = useCurrentOrg();
  const [tplId, setTplId] = useState<string>(WA_TEMPLATES[0].id);
  const [vars, setVars] = useState<Record<string, string>>({ empresa: org?.name ?? "" });
  const [customerId, setCustomerId] = useState<string>("");
  const [manualPhone, setManualPhone] = useState("");
  const [search, setSearch] = useState("");

  const tpl = WA_TEMPLATES.find(t => t.id === tplId) ?? WA_TEMPLATES[0];

  const { data: customers = [] } = useQuery({
    enabled: !!org?.id,
    queryKey: ["customers-wa", org?.id, search],
    queryFn: async () => {
      let q = supabase.from("customers").select("id,name,phone,whatsapp").eq("organization_id", org!.id).order("name").limit(50);
      if (search) q = q.ilike("name", `%${search}%`);
      return (await q).data ?? [];
    },
  });

  const selectedCustomer = customers.find((c: any) => c.id === customerId);
  const phone = selectedCustomer?.whatsapp || selectedCustomer?.phone || manualPhone;

  const message = useMemo(() => renderTemplate(tpl.body, {
    ...vars,
    empresa: vars.empresa || org?.name || "",
    nome: vars.nome || selectedCustomer?.name || "",
  }), [tpl, vars, org, selectedCustomer]);

  const send = () => {
    if (!phone) { toast.error("Informe um número ou escolha um cliente com telefone"); return; }
    openWhatsApp(phone, message);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    toast.success("Mensagem copiada");
  };

  return (
    <PageContainer>
      <PageHeader title="WhatsApp" description="Envie mensagens prontas para seus clientes via WhatsApp." />

      <Card className="p-4 mb-6 border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 grid place-items-center">
            <MessageCircle className="size-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium">Pronto pra usar — sem configuração</p>
            <p className="text-muted-foreground mt-0.5">Usamos links wa.me. Ao clicar em "Enviar", abre o WhatsApp Web ou app com a mensagem pronta. Funciona com qualquer número.</p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">1. Escolha o modelo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={tplId} onValueChange={(v) => { setTplId(v); setVars(p => ({ ...p, empresa: p.empresa || org?.name || "" })); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WA_TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              {tpl.vars.map(v => (
                <div key={v} className="space-y-1">
                  <Label className="text-xs capitalize">{v}</Label>
                  <Input value={vars[v] ?? (v === "empresa" ? org?.name ?? "" : v === "nome" ? selectedCustomer?.name ?? "" : "")}
                    onChange={e => setVars(p => ({ ...p, [v]: e.target.value }))}
                    placeholder={`{${v}}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">2. Escolha o destinatário</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.whatsapp || c.phone ? `· ${c.whatsapp || c.phone}` : "· sem telefone"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label className="text-xs">Ou digite um número (com DDD)</Label>
              <Input value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="11 98888-7777" />
            </div>
            {phone && <Badge variant="secondary" className="gap-1"><Phone className="size-3" /> {phone}</Badge>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">3. Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={message} onChange={e => { /* read-only-ish preview but allow tweaks */ }} readOnly rows={8} className="font-mono text-sm bg-muted/30" />
          <div className="flex gap-2 mt-3 justify-end">
            <Button variant="outline" onClick={copy} className="gap-1"><Copy className="size-4" /> Copiar</Button>
            <Button onClick={send} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"><Send className="size-4" /> Enviar pelo WhatsApp</Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="font-display font-semibold text-lg mt-8 mb-3">Onde mais o WhatsApp está integrado</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <InfoCard title="Ordens de Serviço" desc="No detalhe da OS há um botão 'WhatsApp' que envia status, itens e total ao cliente." />
        <InfoCard title="Clientes (CRM)" desc="Cada cliente com telefone tem um botão verde para abrir conversa rápida." />
        <InfoCard title="PDV / Vendas" desc="Após a venda, envie o comprovante pelo WhatsApp em um clique." />
      </div>
    </PageContainer>
  );
}

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="p-4">
      <div className="size-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 grid place-items-center mb-3">
        <MessageCircle className="size-4" />
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </Card>
  );
}
