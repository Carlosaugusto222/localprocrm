import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Save, ShieldCheck, MessageCircle, KeyRound, Webhook } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { getWaChannel, saveWaChannel } from "@/lib/wa.functions";

export const Route = createFileRoute("/_authenticated/wa-config")({
  head: () => ({ meta: [{ title: "WhatsApp Atendente — Config" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: WaConfigPage,
});

function randomToken(len = 24) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function WaConfigPage() {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();
  const fetchChannel = useServerFn(getWaChannel);
  const save = useServerFn(saveWaChannel);

  const { data: channel } = useQuery({
    enabled: !!org?.id,
    queryKey: ["wa_channel", org?.id],
    queryFn: () => fetchChannel({ data: { organizationId: org!.id } }),
  });

  const [form, setForm] = useState({
    phone_number_id: "", waba_id: "", display_phone_number: "",
    access_token: "", app_secret: "", verify_token: "",
    enabled: true, auto_reply: true,
    system_prompt: "",
    escalation_keywords: ["humano", "atendente", "reclamação", "cancelar"],
  });

  useEffect(() => {
    if (channel) setForm({
      phone_number_id: channel.phone_number_id ?? "",
      waba_id: channel.waba_id ?? "",
      display_phone_number: channel.display_phone_number ?? "",
      access_token: channel.access_token ?? "",
      app_secret: channel.app_secret ?? "",
      verify_token: channel.verify_token ?? "",
      enabled: channel.enabled ?? true,
      auto_reply: channel.auto_reply ?? true,
      system_prompt: channel.system_prompt ?? "",
      escalation_keywords: channel.escalation_keywords ?? [],
    });
    else setForm(f => ({ ...f, verify_token: f.verify_token || randomToken(16) }));
  }, [channel]);

  const mutation = useMutation({
    mutationFn: () => save({ data: { organizationId: org!.id, ...form } }),
    onSuccess: () => { toast.success("Configuração salva"); qc.invalidateQueries({ queryKey: ["wa_channel"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/wa/webhook` : "/api/public/wa/webhook";

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast.success(`${label} copiado`);
  };

  return (
    <PageContainer>
      <PageHeader title="WhatsApp Atendente IA" description="Conecte sua conta WhatsApp Business oficial (Meta Cloud API). A IA responde 24/7 com o contexto da sua empresa." />

      <Card className="border-emerald-500/30 bg-emerald-500/5 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Webhook className="size-4" /> Configure no painel da Meta</CardTitle>
          <CardDescription>Use estes valores para configurar o webhook do seu app WhatsApp em developers.facebook.com.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Callback URL</Label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => copy(webhookUrl, "URL")}><Copy className="size-4" /></Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Verify Token</Label>
            <div className="flex gap-2 mt-1">
              <Input value={form.verify_token} onChange={e => setForm(f => ({ ...f, verify_token: e.target.value }))} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => copy(form.verify_token, "Token")}><Copy className="size-4" /></Button>
              <Button type="button" variant="outline" onClick={() => setForm(f => ({ ...f, verify_token: randomToken(16) }))}>Gerar</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cole esse mesmo token no campo "Verify Token" no Meta. Inscreva-se no evento <code>messages</code>.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-4" /> Credenciais Meta</CardTitle>
            <CardDescription>Encontradas em "WhatsApp → Configuração da API" e "Configurações do app".</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Phone Number ID" value={form.phone_number_id} onChange={v => setForm(f => ({ ...f, phone_number_id: v }))} />
            <Field label="WhatsApp Business Account ID (opcional)" value={form.waba_id} onChange={v => setForm(f => ({ ...f, waba_id: v }))} />
            <Field label="Número exibido (ex: +55 11 …)" value={form.display_phone_number} onChange={v => setForm(f => ({ ...f, display_phone_number: v }))} />
            <Field label="Access Token (permanente)" value={form.access_token} onChange={v => setForm(f => ({ ...f, access_token: v }))} secret />
            <Field label="App Secret" value={form.app_secret} onChange={v => setForm(f => ({ ...f, app_secret: v }))} secret />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" /> Comportamento do atendente</CardTitle>
            <CardDescription>Controle quando e como a IA responde.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Canal ativo</Label>
                <p className="text-xs text-muted-foreground">Recebe e processa mensagens.</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Resposta automática por IA</Label>
                <p className="text-xs text-muted-foreground">Desative para responder só manualmente.</p>
              </div>
              <Switch checked={form.auto_reply} onCheckedChange={v => setForm(f => ({ ...f, auto_reply: v }))} />
            </div>
            <div>
              <Label className="text-xs">Palavras-chave para escalar para humano</Label>
              <Input
                value={form.escalation_keywords.join(", ")}
                onChange={e => setForm(f => ({ ...f, escalation_keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                placeholder="humano, atendente, reclamação"
              />
            </div>
            <div>
              <Label className="text-xs">Instruções customizadas (opcional)</Label>
              <Textarea
                rows={6}
                value={form.system_prompt}
                onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                placeholder="Ex.: Sempre ofereça os pacotes mensais. Não dê descontos. Confirme nome e telefone antes de agendar."
              />
              <p className="text-xs text-muted-foreground mt-1">Se vazio, usamos um prompt padrão com seu catálogo, horários e segmento.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 justify-end mt-6">
        {channel && <Badge variant="secondary" className="gap-1"><MessageCircle className="size-3" /> Canal configurado</Badge>}
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-1">
          <Save className="size-4" /> {mutation.isPending ? "Salvando…" : "Salvar configuração"}
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader><CardTitle className="text-base">Passo a passo para conectar</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>1. Acesse <a className="text-primary underline" href="https://developers.facebook.com/apps" target="_blank" rel="noopener">developers.facebook.com/apps</a> e crie um app do tipo Business.</p>
          <p>2. Adicione o produto <strong>WhatsApp</strong>. Em "Configuração da API" copie o <strong>Phone Number ID</strong> e gere um <strong>Access Token permanente</strong> (via System User em Business Settings).</p>
          <p>3. Em "Configurações do app → Básico" copie o <strong>App Secret</strong>.</p>
          <p>4. Em "WhatsApp → Configuração" → "Webhook", clique em "Editar". Cole a <strong>Callback URL</strong> e o <strong>Verify Token</strong> acima. Inscreva-se no evento <code>messages</code>.</p>
          <p>5. Preencha os campos aqui, salve, e mande "oi" do seu celular pessoal para o número de teste. Em segundos a IA responde.</p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function Field({ label, value, onChange, secret }: { label: string; value: string; onChange: (v: string) => void; secret?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input type={secret && !show ? "password" : "text"} value={value} onChange={e => onChange(e.target.value)} className="font-mono text-xs" />
        {secret && <Button type="button" variant="outline" size="sm" onClick={() => setShow(s => !s)}>{show ? "Ocultar" : "Ver"}</Button>}
      </div>
    </div>
  );
}
