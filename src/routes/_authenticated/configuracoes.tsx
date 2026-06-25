import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — LocalPro CRM" }] }),
  component: Settings,
});

const ALL_MODULES = [
  { id: "crm", label: "CRM" },
  { id: "appointments", label: "Agenda" },
  { id: "finance", label: "Financeiro" },
  { id: "sales", label: "Vendas" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "ai", label: "Assistente IA" },
  { id: "reports", label: "Relatórios" },
];

const PLANS = [
  { id: "basic", name: "Básico", price: "R$ 49", modules: ["crm","reports"] },
  { id: "pro", name: "Profissional", price: "R$ 99", modules: ["crm","appointments","finance","reports"] },
  { id: "premium", name: "Premium", price: "R$ 199", modules: ALL_MODULES.map(m => m.id) },
] as const;

function Settings() {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();
  const [name, setName] = useState(org?.name ?? "");
  const [segment, setSegment] = useState(org?.segment ?? "");
  const [modules, setModules] = useState<Set<string>>(new Set(org?.enabled_modules ?? []));

  useEffect(() => {
    if (org) { setName(org.name); setSegment(org.segment ?? ""); setModules(new Set(org.enabled_modules)); }
  }, [org]);

  const save = useMutation({
    mutationFn: async () => {
      if (!org) throw new Error("Sem empresa");
      const { error } = await supabase.from("organizations")
        .update({ name, segment, enabled_modules: Array.from(modules) })
        .eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organizations"] }); toast.success("Configurações salvas"); },
    onError: (e: any) => toast.error(e.message),
  });

  const changePlan = useMutation({
    mutationFn: async (plan: "basic"|"pro"|"premium") => {
      if (!org) throw new Error("Sem empresa");
      const newMods = PLANS.find(p => p.id === plan)!.modules;
      const { error } = await supabase.from("organizations").update({ plan, enabled_modules: newMods }).eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organizations"] }); toast.success("Plano atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!org) return <PageContainer><p>Carregando...</p></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title="Configurações" description="Gerencie sua empresa, plano e módulos ativos." />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Empresa</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Segmento</Label><Input value={segment} onChange={(e) => setSegment(e.target.value)} /></div>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Módulos ativos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ALL_MODULES.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                <span className="text-sm">{m.label}</span>
                <Switch
                  checked={modules.has(m.id)}
                  onCheckedChange={(c) => {
                    const next = new Set(modules);
                    if (c) next.add(m.id); else next.delete(m.id);
                    setModules(next);
                  }}
                />
              </div>
            ))}
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full mt-2">Salvar módulos</Button>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-display font-bold mt-8 mb-3">Plano</h2>
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
                <ul className="mt-4 space-y-1.5 text-sm">
                  {p.modules.map(m => <li key={m} className="flex items-center gap-1.5"><Check className="size-3.5 text-success" />{ALL_MODULES.find(x => x.id === m)?.label}</li>)}
                </ul>
                <Button className="w-full mt-4" variant={current ? "outline" : "default"} disabled={current || changePlan.isPending} onClick={() => changePlan.mutate(p.id)}>
                  {current ? "Plano atual" : "Selecionar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
