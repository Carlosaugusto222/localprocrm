import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Check, Upload, Copy, ExternalLink, Clock } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { ALL_MODULES, PLANS } from "@/lib/modules";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — LocalPro CRM" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || undefined,
  } as { tab?: string }),
  component: Settings,
});

const WEEKDAYS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

function Settings() {
  const { org } = useCurrentOrg();
  const { tab } = useSearch({ from: "/_authenticated/configuracoes" });
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});
  const [modules, setModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name, segment: org.segment ?? "",
        phone: (org as any).phone ?? "", email: (org as any).email ?? "",
        cnpj: (org as any).cnpj ?? "", website: (org as any).website ?? "",
        address: (org as any).address ?? "", city: (org as any).city ?? "",
        state: (org as any).state ?? "", zip: (org as any).zip ?? "",
        logo_url: (org as any).logo_url ?? "",
        public_booking_enabled: (org as any).public_booking_enabled ?? false,
        cash_auto_open_time: (org as any).cash_auto_open_time ?? "",
        cash_auto_close_time: (org as any).cash_auto_close_time ?? "",
      });
      setModules(new Set(org.enabled_modules));
    }
  }, [org]);

  const { data: hours = [] } = useQuery({
    enabled: !!org?.id,
    queryKey: ["hours", org?.id],
    queryFn: async () => (await supabase.from("business_hours").select("*").eq("organization_id", org!.id).order("weekday")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!org) return;
      const { error } = await supabase.from("organizations").update({
        ...form, enabled_modules: Array.from(modules),
      }).eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organizations"] }); toast.success("Configurações salvas"); },
    onError: (e: any) => toast.error(e.message),
  });

  const changePlan = useMutation({
    mutationFn: async (plan: "basic" | "pro" | "premium") => {
      if (!org) return;
      const planDef = PLANS.find(p => p.id === plan)!;
      const { error } = await supabase.from("organizations")
        .update({ plan, enabled_modules: [...planDef.modules] }).eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organizations"] }); toast.success("Plano atualizado"); },
  });

  const upsertHour = useMutation({
    mutationFn: async (h: any) => {
      const { error } = await supabase.from("business_hours").upsert(h, { onConflict: "organization_id,weekday" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hours"] }),
  });

  const uploadLogo = async (file: File) => {
    if (!org) return;
    const ext = file.name.split(".").pop();
    const path = `${org.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("org-assets").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("org-assets").getPublicUrl(path);
    setForm({ ...form, logo_url: pub.publicUrl });
    await supabase.from("organizations").update({ logo_url: pub.publicUrl }).eq("id", org.id);
    qc.invalidateQueries({ queryKey: ["organizations"] });
    toast.success("Logo enviado");
  };

  if (!org) return <PageContainer><p>Carregando...</p></PageContainer>;

  const bookingUrl = typeof window !== "undefined" ? `${window.location.origin}/agendar/${org.slug}` : "";

  return (
    <PageContainer>
      <PageHeader title="Configurações" description="Empresa, plano, módulos, horários e portal do cliente." />

      <Tabs defaultValue={tab || "company"}>
        <TabsList>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="modules">Módulos & Plano</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="caixa">Caixa</TabsTrigger>
          <TabsTrigger value="booking">Portal do Cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Identidade</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="size-20 rounded-2xl object-cover border" />
                ) : (
                  <div className="size-20 rounded-2xl bg-muted grid place-items-center text-muted-foreground"><Upload className="size-6" /></div>
                )}
                <div>
                  <Label htmlFor="logo" className="cursor-pointer">
                    <span className="inline-flex items-center gap-1 text-sm bg-secondary text-secondary-foreground rounded-md px-3 py-2 hover:bg-secondary/80">
                      <Upload className="size-3.5" />Enviar logo
                    </span>
                  </Label>
                  <input id="logo" type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                  <p className="text-xs text-muted-foreground mt-1">PNG ou JPG, quadrado de preferência.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Nome" v={form.name} on={v => setForm({ ...form, name: v })} />
                <Field label="Segmento" v={form.segment} on={v => setForm({ ...form, segment: v })} />
                <Field label="CNPJ" v={form.cnpj} on={v => setForm({ ...form, cnpj: v })} />
                <Field label="Telefone" v={form.phone} on={v => setForm({ ...form, phone: v })} />
                <Field label="Email comercial" v={form.email} on={v => setForm({ ...form, email: v })} />
                <Field label="Site" v={form.website} on={v => setForm({ ...form, website: v })} />
                <Field label="Endereço" v={form.address} on={v => setForm({ ...form, address: v })} />
                <Field label="Cidade" v={form.city} on={v => setForm({ ...form, city: v })} />
                <Field label="Estado" v={form.state} on={v => setForm({ ...form, state: v })} />
                <Field label="CEP" v={form.zip} on={v => setForm({ ...form, zip: v })} />
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Módulos ativos</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-2">
                {ALL_MODULES.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                    <span className="text-sm">{m.label}</span>
                    <Switch checked={modules.has(m.id)} onCheckedChange={(c) => {
                      const next = new Set(modules); c ? next.add(m.id) : next.delete(m.id); setModules(next);
                    }} />
                  </div>
                ))}
              </div>
              <Button className="mt-3" onClick={() => save.mutate()}>Salvar módulos</Button>
            </CardContent>
          </Card>

          <h2 className="text-xl font-display font-bold mt-6 mb-3">Plano</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {PLANS.map(p => {
              const current = org.plan === p.id;
              return (
                <Card key={p.id} className={current ? "border-primary ring-1 ring-primary/30" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-lg">{p.name}</h3>
                      {current && <Badge>Atual</Badge>}
                    </div>
                    <div className="mt-1"><span className="text-2xl font-bold">{p.price}</span><span className="text-muted-foreground text-sm">/mês</span></div>
                    <ul className="mt-4 space-y-1 text-xs">
                      {p.modules.map(m => <li key={m} className="flex items-center gap-1.5"><Check className="size-3 text-emerald-500" />{ALL_MODULES.find(x => x.id === m)?.label}</li>)}
                    </ul>
                    <Button className="w-full mt-4" variant={current ? "outline" : "default"} disabled={current} onClick={() => changePlan.mutate(p.id as any)}>
                      {current ? "Plano atual" : "Selecionar"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="hours" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Horário de atendimento</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {WEEKDAYS.map((d, i) => {
                const h = hours.find((x: any) => x.weekday === i) ?? { weekday: i, closed: true, open_time: "09:00", close_time: "18:00" };
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg hover:bg-accent">
                    <span className="col-span-3 text-sm font-medium">{d}</span>
                    <div className="col-span-2 flex items-center gap-2">
                      <Switch checked={!h.closed} onCheckedChange={c => upsertHour.mutate({ organization_id: org.id, weekday: i, open_time: h.open_time ?? "09:00", close_time: h.close_time ?? "18:00", closed: !c })} />
                      <span className="text-xs text-muted-foreground">{h.closed ? "Fechado" : "Aberto"}</span>
                    </div>
                    <Input type="time" className="col-span-3" disabled={h.closed} defaultValue={h.open_time ?? "09:00"}
                      onBlur={e => upsertHour.mutate({ organization_id: org.id, weekday: i, open_time: e.target.value, close_time: h.close_time ?? "18:00", closed: !!h.closed })} />
                    <span className="col-span-1 text-center text-xs">às</span>
                    <Input type="time" className="col-span-3" disabled={h.closed} defaultValue={h.close_time ?? "18:00"}
                      onBlur={e => upsertHour.mutate({ organization_id: org.id, weekday: i, open_time: h.open_time ?? "09:00", close_time: e.target.value, closed: !!h.closed })} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caixa" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="size-5" />Automação de Caixa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Programe horários fixos para sugerir a abertura e fechamento do caixa.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sugerir abertura às</Label>
                  <Input type="time" value={form.cash_auto_open_time || ""} onChange={e => setForm({ ...form, cash_auto_open_time: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sugerir fechamento às</Label>
                  <Input type="time" value={form.cash_auto_close_time || ""} onChange={e => setForm({ ...form, cash_auto_close_time: e.target.value })} />
                </div>
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar programação</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Portal do Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div>
                  <div className="font-medium">Aceitar agendamentos online</div>
                  <div className="text-xs text-muted-foreground">Crie um link público pra clientes agendarem sozinhos.</div>
                </div>
                <Switch checked={!!form.public_booking_enabled} onCheckedChange={v => { setForm({ ...form, public_booking_enabled: v }); save.mutate(); }} />
              </div>

              {form.public_booking_enabled && (
                <div className="space-y-2">
                  <Label>Seu link público</Label>
                  <div className="flex gap-2">
                    <Input value={bookingUrl} readOnly />
                    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success("Link copiado"); }}>
                      <Copy className="size-4" />
                    </Button>
                    <Button asChild variant="outline"><a href={bookingUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Divulgue no Instagram, Google Maps, WhatsApp. Cada agendamento aparece com status "agendado" pra você confirmar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-xs text-muted-foreground text-center">
        <Link to="/onboarding" search={{}} className="underline hover:text-foreground">Reabrir assistente de configuração</Link>
      </div>
    </PageContainer>
  );
}

function Field({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input value={v ?? ""} onChange={e => on(e.target.value)} /></div>;
}
