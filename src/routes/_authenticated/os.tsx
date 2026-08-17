import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Wrench, ArrowRight } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os")({
  head: () => ({ meta: [{ title: "Ordens de Serviço — LocalPro CRM" }] }),
  component: OSPage,
});

const STATUS = [
  { id: "open", label: "Aberta", color: "bg-blue-500" },
  { id: "in_progress", label: "Em execução", color: "bg-amber-500" },
  { id: "waiting", label: "Aguardando", color: "bg-purple-500" },
  { id: "done", label: "Concluída", color: "bg-emerald-500" },
  { id: "delivered", label: "Entregue", color: "bg-teal-500" },
  { id: "cancelled", label: "Cancelada", color: "bg-rose-500" },
];

const fmtMoney = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function OSPage() {
  const { org } = useCurrentOrg();
  const orgId = org?.id;
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);

  const { data = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["service-orders", orgId, filter],
    queryFn: async () => {
      let q = supabase.from("service_orders").select("*, customer:customers(name)").eq("organization_id", orgId!).order("number", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <PageContainer>
      <PageHeader title="Ordens de Serviço" description="Acompanhe execução, peças, prazos e entregas."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-1"><Plus className="size-4" />Nova OS</Button></DialogTrigger>
            <CreateOSDialog orgId={orgId} onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          {STATUS.map(s => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="grid gap-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">Nenhuma ordem de serviço.</p>}
        {data.map((os: any) => {
          const st = STATUS.find(s => s.id === os.status) ?? STATUS[0];
          return (
            <Link key={os.id} to="/os/$id" params={{ id: os.id }} className="block">
              <Card className="p-3 flex items-center gap-3 hover:bg-accent/40 transition-all active:scale-[0.99] cursor-pointer border-l-4 border-l-transparent data-[status=open]:border-l-blue-500 data-[status=in_progress]:border-l-amber-500" data-status={os.status}>

                <div className="size-10 rounded-lg bg-muted grid place-items-center"><Wrench className="size-4 text-muted-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">#{os.number}</span>
                    <span className="font-medium text-sm truncate">{os.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {os.customer?.name ?? "Sem cliente"} · {new Date(os.opened_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="font-display font-bold tabular-nums text-sm">{fmtMoney(Number(os.total ?? 0))}</div>
                <Badge variant="secondary" className="gap-1">
                  <span className={`size-2 rounded-full ${st.color}`} />{st.label}
                </Badge>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Card>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}

function CreateOSDialog({ orgId, onClose }: { orgId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", customer_id: "", priority: "normal" });

  const { data: customers = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["customers-sel-os", orgId],
    queryFn: async () => (await supabase.from("customers").select("id,name").eq("organization_id", orgId!).order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (values: typeof form) => {
      if (!orgId) throw new Error("Sem empresa");
      const { data: nextNum } = await supabase.rpc("next_service_order_number", { _org_id: orgId });
      const { data, error } = await supabase.from("service_orders").insert({
        organization_id: orgId, number: nextNum ?? 1,
        title: values.title, description: values.description || null,
        customer_id: values.customer_id || null, priority: values.priority, status: "open",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { 
      qc.invalidateQueries({ queryKey: ["service-orders"] }); 
      toast.success("OS criada"); 
      onClose();
      if (data?.id) {
        navigate({ to: "/os/$id", params: { id: data.id } });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); create.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Título *</Label>
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Ex: Troca de óleo - Honda Civic" /></div>
        <div className="space-y-1.5"><Label>Cliente</Label>
          <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1.5"><Label>Prioridade</Label>
          <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select></div>
        <div className="space-y-1.5"><Label>Descrição</Label>
          <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending}>Criar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
