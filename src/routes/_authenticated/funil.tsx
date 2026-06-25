import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type DragEvent } from "react";
import { GripVertical, Plus } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/funil")({
  head: () => ({ meta: [{ title: "Funil de Vendas — LocalPro CRM" }] }),
  component: Funnel,
});

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: string[];
  pipeline_stage: string;
};

const STAGES: { id: string; label: string; tone: string }[] = [
  { id: "new", label: "Novo", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { id: "qualified", label: "Qualificado", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { id: "proposal", label: "Proposta", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { id: "negotiation", label: "Negociação", tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { id: "won", label: "Ganho", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { id: "lost", label: "Perdido", tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
];

function Funnel() {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const { data: customers = [] } = useQuery({
    enabled: !!org,
    queryKey: ["funnel-customers", org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id,name,phone,email,tags,pipeline_stage")
        .eq("organization_id", org!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("customers")
        .update({ pipeline_stage: stage })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["funnel-customers", org?.id] });
      const prev = qc.getQueryData<Customer[]>(["funnel-customers", org?.id]);
      if (prev) {
        qc.setQueryData<Customer[]>(
          ["funnel-customers", org?.id],
          prev.map(c => (c.id === id ? { ...c, pipeline_stage: stage } : c)),
        );
      }
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["funnel-customers", org?.id], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Etapa atualizada"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["funnel-customers", org?.id] }),
  });

  const handleDrop = (e: DragEvent, stage: string) => {
    e.preventDefault();
    setOverStage(null);
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    if (!id) return;
    const cur = customers.find(c => c.id === id);
    if (!cur || cur.pipeline_stage === stage) return;
    move.mutate({ id, stage });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Funil de Vendas"
        description="Arraste os cards entre as etapas para atualizar o status."
        actions={
          <Button asChild variant="outline" className="gap-1">
            <Link to="/crm"><Plus className="size-4" /> Novo cliente</Link>
          </Button>
        }
      />

      <div className="grid grid-flow-col auto-cols-[280px] gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {STAGES.map(stage => {
          const items = customers.filter(c => (c.pipeline_stage || "new") === stage.id);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage.id); }}
              onDragLeave={() => setOverStage(s => (s === stage.id ? null : s))}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`rounded-2xl border bg-card/40 backdrop-blur p-3 flex flex-col gap-2 transition-colors ${overStage === stage.id ? "border-primary/60 bg-accent/40" : ""}`}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.tone}`}>{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 min-h-[120px]">
                {items.map(c => (
                  <Card
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", c.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(c.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={`p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all ${dragId === c.id ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Link
                          to="/crm/$id"
                          params={{ id: c.id }}
                          className="font-medium text-sm hover:underline block truncate"
                        >
                          {c.name}
                        </Link>
                        {(c.phone || c.email) && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {c.phone ?? c.email}
                          </p>
                        )}
                        {c.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {c.tags.slice(0, 3).map(t => (
                              <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6 border-2 border-dashed rounded-lg">
                    Solte cards aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
