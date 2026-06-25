import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Package, Trash2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({ meta: [{ title: "Vendas — LocalPro CRM" }] }),
  component: Sales,
});

function brl(n: number) { return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function Sales() {
  const { org } = useCurrentOrg();
  return (
    <PageContainer>
      <PageHeader title="Vendas" description="Produtos, serviços, orçamentos e pedidos." />
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Produtos / Serviços</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
        </TabsList>
        <TabsContent value="products"><ProductsList orgId={org?.id} /></TabsContent>
        <TabsContent value="sales"><SalesList orgId={org?.id} /></TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function ProductsList({ orgId }: { orgId?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["products", orgId],
    queryFn: async () => (await supabase.from("products").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false })).data ?? [],
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("products").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
  return (
    <div className="mt-4">
      <div className="flex justify-end mb-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="size-4" /> Novo</Button></DialogTrigger>
          <ProductDialog orgId={orgId} onClose={() => setOpen(false)} />
        </Dialog>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map((p: any) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="size-9 rounded-lg bg-accent grid place-items-center text-accent-foreground"><Package className="size-4" /></div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}><Trash2 className="size-4" /></Button>
            </div>
            <h3 className="font-semibold mt-2">{p.name}</h3>
            <div className="text-xs text-muted-foreground">{p.category ?? p.kind}</div>
            <div className="mt-2 font-display font-bold text-lg">{brl(Number(p.price))}</div>
          </Card>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground col-span-full py-8 text-center">Nenhum produto ou serviço cadastrado.</p>}
      </div>
    </div>
  );
}

function ProductDialog({ orgId, onClose }: { orgId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "", category: "", kind: "product", price: "" });
  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sem empresa");
      const { error } = await supabase.from("products").insert({
        organization_id: orgId, name: form.name, description: form.description || null,
        category: form.category || null, kind: form.kind, price: Number(form.price),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Salvo"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo produto ou serviço</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Tipo</Label>
            <Select value={form.kind} onValueChange={v => setForm({ ...form, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Produto</SelectItem>
                <SelectItem value="service">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
        </div>
        <div className="space-y-1.5"><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending}>Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function SalesList({ orgId }: { orgId?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["sales", orgId],
    queryFn: async () => (await supabase.from("sales").select("*, customers(name)").eq("organization_id", orgId!).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="mt-4">
      <div className="flex justify-end mb-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="size-4" /> Nova venda</Button></DialogTrigger>
          <SaleDialog orgId={orgId} onClose={() => setOpen(false)} />
        </Dialog>
      </div>
      <div className="grid gap-2">
        {data.map((s: any) => (
          <Card key={s.id} className="p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{s.customers?.name ?? "Sem cliente"}</div>
              <div className="text-xs text-muted-foreground">{s.notes ?? "—"}</div>
            </div>
            <Badge variant="outline">{s.status}</Badge>
            <div className="font-display font-bold">{brl(Number(s.total))}</div>
          </Card>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma venda registrada.</p>}
      </div>
    </div>
  );
}

function SaleDialog({ orgId, onClose }: { orgId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ customer_id: "", total: "", notes: "", status: "order" as const });
  const { data: customers = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["customers-sel-sales", orgId],
    queryFn: async () => (await supabase.from("customers").select("id,name").eq("organization_id", orgId!).order("name")).data ?? [],
  });
  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sem empresa");
      const { error } = await supabase.from("sales").insert({
        organization_id: orgId, customer_id: form.customer_id || null,
        total: Number(form.total), notes: form.notes || null, status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales"] }); toast.success("Venda registrada"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova venda</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Cliente</Label>
          <Select value={form.customer_id || "_none"} onValueChange={v => setForm({ ...form, customer_id: v === "_none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sem cliente</SelectItem>
              {(customers as any[]).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Total (R$)</Label><Input type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quote">Orçamento</SelectItem>
                <SelectItem value="order">Pedido</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending}>Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
