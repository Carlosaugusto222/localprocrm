import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { SEGMENT_TEMPLATES, getTemplate } from "@/lib/segment-templates";
import { ALL_MODULES } from "@/lib/modules";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Bem-vindo — LocalPro CRM" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: org?.name ?? "",
    phone: "",
    segment: org?.segment ?? "",
    modules: new Set<string>(org?.enabled_modules ?? []),
    importCatalog: true,
  });

  const tpl = getTemplate(data.segment);

  const apply = useMutation({
    mutationFn: async () => {
      if (!org) throw new Error("Sem empresa");
      const enabled = Array.from(data.modules);

      const { error: e1 } = await supabase.from("organizations").update({
        name: data.name, phone: data.phone, segment: data.segment,
        enabled_modules: enabled, onboarding_completed: true,
      }).eq("id", org.id);
      if (e1) throw e1;

      if (data.importCatalog && tpl.catalog.length > 0) {
        await supabase.from("products").insert(
          tpl.catalog.map(c => ({
            organization_id: org.id,
            name: c.name, kind: c.kind, price: c.price,
            duration_minutes: c.duration_minutes ?? null, category: c.category ?? null,
            active: true,
          }))
        );
      }

      // default business hours: Mon-Fri 9-18, Sat 9-13, Sun closed
      const defaults = [0,1,2,3,4,5,6].map(w => ({
        organization_id: org.id, weekday: w,
        open_time: w === 0 ? null : "09:00", close_time: w === 0 ? null : (w === 6 ? "13:00" : "18:00"),
        closed: w === 0,
      }));
      await supabase.from("business_hours").upsert(defaults, { onConflict: "organization_id,weekday" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Tudo pronto! Bem-vindo ao LocalPro");
      navigate({ to: "/hoje" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMod = (id: string) => {
    const next = new Set(data.modules);
    next.has(id) ? next.delete(id) : next.add(id);
    setData({ ...data, modules: next });
  };

  if (!org) return <PageContainer><p>Carregando...</p></PageContainer>;

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex size-12 rounded-2xl bg-gradient-to-br from-primary to-chart-4 grid place-items-center text-primary-foreground shadow-lg mb-3">
            <Sparkles className="size-6" />
          </div>
          <h1 className="text-3xl font-display font-bold">Vamos configurar sua empresa</h1>
          <p className="text-muted-foreground mt-2">Em 1 minuto seu sistema fica pronto pro seu segmento.</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`h-1.5 w-12 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {step === 0 && (
              <>
                <h2 className="font-display font-bold text-xl">Dados da empresa</h2>
                <div className="space-y-1.5"><Label>Nome</Label>
                  <Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="Ex: Barbearia do João" /></div>
                <div className="space-y-1.5"><Label>Telefone / WhatsApp</Label>
                  <Input value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} placeholder="(11) 91234-5678" /></div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="font-display font-bold text-xl">Qual seu segmento?</h2>
                <p className="text-sm text-muted-foreground">Escolha o que mais se parece com seu negócio — você pode mudar depois.</p>
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  {SEGMENT_TEMPLATES.map(s => (
                    <button key={s.id} type="button"
                      onClick={() => setData({ ...data, segment: s.id, modules: new Set(s.modules) })}
                      className={`text-left p-3 rounded-lg border-2 transition-all ${data.segment === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{s.emoji}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{s.label}</div>
                          <div className="text-xs text-muted-foreground">{s.description}</div>
                        </div>
                        {data.segment === s.id && <Check className="size-4 text-primary" />}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="font-display font-bold text-xl">Módulos ativos</h2>
                <p className="text-sm text-muted-foreground">Sugerimos esses pra <strong>{tpl.label}</strong>. Ajuste como quiser.</p>
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  {ALL_MODULES.map(m => {
                    const on = data.modules.has(m.id);
                    return (
                      <button key={m.id} type="button" onClick={() => toggleMod(m.id)}
                        className={`text-left p-3 rounded-lg border-2 flex items-center justify-between ${on ? "border-primary bg-primary/5" : "border-border"}`}>
                        <span className="text-sm font-medium">{m.label}</span>
                        {on && <Check className="size-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="font-display font-bold text-xl">Catálogo inicial</h2>
                <p className="text-sm text-muted-foreground">Vamos cadastrar {tpl.catalog.length} produtos/serviços típicos de <strong>{tpl.label}</strong> pra você começar.</p>
                {tpl.catalog.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto mt-2 p-2 bg-muted/40 rounded-lg">
                    {tpl.catalog.map(c => (
                      <div key={c.name} className="text-xs flex items-center justify-between bg-background rounded px-2 py-1.5 border">
                        <span className="truncate">{c.name}</span>
                        <Badge variant="secondary" className="text-[10px]">R$ {c.price}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Segmento genérico — você cadastra seus produtos depois.</p>
                )}
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={data.importCatalog}
                    onChange={e => setData({ ...data, importCatalog: e.target.checked })}
                    className="size-4 rounded" />
                  <span className="text-sm">Importar catálogo sugerido</span>
                </label>
              </>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep(s => s - 1)}>Voltar</Button>
              {step < 3 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !data.segment}>
                  Continuar <ArrowRight className="size-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
                  {apply.isPending ? "Configurando..." : "Concluir"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <button onClick={() => navigate({ to: "/hoje" })} className="text-xs text-muted-foreground hover:text-foreground">
            Pular configuração
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
