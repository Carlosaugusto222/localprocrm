import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Package, Trash2, Pencil } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { logAudit } from "@/lib/audit";
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
  const [editing, setEditing] = useState<any | null>(null);
  const { data = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["products", orgId],
    queryFn: async () => (await supabase.from("products").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false })).data ?? [],
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("products").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const handleOpen = (v: boolean) => { setOpen(v); if (!v) setEditing(null); };
  const openEdit = (p: any) => { setEditing(p); setOpen(true); };

  return (
    <div className="mt-4">
      <div className="flex justify-end mb-3">
        <Dialog open={open} onOpenChange={handleOpen}>
          <DialogTrigger asChild><Button className="gap-1" onClick={() => setEditing(null)}><Plus className="size-4" /> Novo</Button></DialogTrigger>
          <ProductDialog orgId={orgId} editing={editing} onClose={() => handleOpen(false)} />
        </Dialog>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map((p: any) => {
          const low = p.track_stock && Number(p.stock_qty) <= Number(p.stock_min);
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="size-9 rounded-lg bg-accent grid place-items-center text-accent-foreground"><Package className="size-4" /></div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
              <h3 className="font-semibold mt-2">{p.name}</h3>
              <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                <span>{p.kind === "service" ? "Serviço" : "Produto"}</span>
                {p.sku && <span>· SKU {p.sku}</span>}
                {p.category && <span>· {p.category}</span>}
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div className="font-display font-bold text-lg">{brl(Number(p.price))}</div>
                {p.track_stock && (
                  <Badge variant={low ? "destructive" : "outline"} className="text-[10px]">
                    Estoque: {Number(p.stock_qty)}
                  </Badge>
                )}
              </div>
            </Card>
          );
        })}
        {data.length === 0 && <p className="text-sm text-muted-foreground col-span-full py-8 text-center">Nenhum produto ou serviço cadastrado.</p>}
      </div>
    </div>
  );
}

function ProductDialog({ orgId, editing, onClose }: { orgId?: string; editing?: any; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!editing;
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    category: editing?.category ?? "",
    kind: editing?.kind ?? "product",
    price: editing?.price?.toString() ?? "",
    sku: editing?.sku ?? "",
    cost: editing?.cost?.toString() ?? "",
    track_stock: editing?.track_stock ?? false,
    stock_qty: editing?.stock_qty?.toString() ?? "0",
    stock_min: editing?.stock_min?.toString() ?? "0",
    duration_minutes: editing?.duration_minutes?.toString() ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sem empresa");
      const payload: any = {
        organization_id: orgId,
        name: form.name,
        description: form.description || null,
        category: form.category || null,
        kind: form.kind,
        price: Number(form.price),
        sku: form.sku || null,
        cost: form.cost ? Number(form.cost) : null,
        track_stock: form.track_stock,
        stock_qty: Number(form.stock_qty || 0),
        stock_min: Number(form.stock_min || 0),
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      };
      const { error } = isEdit
        ? await supabase.from("products").update(payload).eq("id", editing.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
      
      if (user && orgId) {
        const changes: any = {};
        if (isEdit) {
          if (Number(form.price) !== Number(editing.price)) changes.price = { old: editing.price, new: Number(form.price) };
          if (Number(form.cost) !== Number(editing.cost)) changes.cost = { old: editing.cost, new: Number(form.cost) };
          if (form.track_stock && Number(form.stock_qty) !== Number(editing.stock_qty)) changes.stock = { old: editing.stock_qty, new: Number(form.stock_qty) };
        }
        
        if (!isEdit || Object.keys(changes).length > 0) {
          await logAudit({
            orgId,
            userId: user.id,
            action: isEdit ? "update_product" : "create_product",
            entity: "products",
            entityId: isEdit ? editing.id : undefined,
            payload: isEdit ? { changes } : { name: form.name, price: Number(form.price) }
          });
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success(isEdit ? "Atualizado" : "Salvo"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>{isEdit ? "Editar item" : "Novo produto ou serviço"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Tipo</Label>
            <Select value={form.kind} onValueChange={v => setForm({ ...form, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Produto</SelectItem>
                <SelectItem value="service">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Preço (R$) *</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>SKU / Código</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ex: BRB-001" /></div>
          <div className="space-y-1.5"><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        </div>
        {form.kind === "service" && (
          <div className="space-y-1.5"><Label>Duração (minutos)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="Ex: 30" /></div>
        )}
        {form.kind === "product" && (
          <div className="border rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.track_stock} onChange={e => setForm({ ...form, track_stock: e.target.checked })} />
              Controlar estoque deste produto
            </label>
            {form.track_stock && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Quantidade atual</Label><Input type="number" step="0.001" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Estoque mínimo</Label><Input type="number" step="0.001" value={form.stock_min} onChange={(e) => setForm({ ...form, stock_min: e.target.value })} /></div>
              </div>
            )}
          </div>
        )}
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={save.isPending}>Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function SalesList({ orgId }: { orgId?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["sales", orgId],
    queryFn: async () => (await supabase.from("sales").select("*, customers(name)").eq("organization_id", orgId!).order("created_at", { ascending: false })).data ?? [],
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("sale_items").delete().eq("sale_id", id);
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales"] }); toast.success("Venda excluída"); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleOpen = (v: boolean) => { setOpen(v); if (!v) setEditingId(null); };
  const openEdit = (id: string) => { setEditingId(id); setOpen(true); };

  return (
    <div className="mt-4">
      <div className="flex justify-end mb-3">
        <Dialog open={open} onOpenChange={handleOpen}>
          <DialogTrigger asChild><Button className="gap-1" onClick={() => setEditingId(null)}><Plus className="size-4" /> Nova venda</Button></DialogTrigger>
          <SaleDialog orgId={orgId} saleId={editingId} onClose={() => handleOpen(false)} />
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
            <Button variant="ghost" size="icon" onClick={() => openEdit(s.id)}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir esta venda?")) del.mutate(s.id); }}><Trash2 className="size-4" /></Button>
          </Card>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma venda registrada.</p>}
      </div>
    </div>
  );
}

type SaleItem = { product_id: string | null; description: string; quantity: number; unit_price: number };

function SaleDialog({ orgId, saleId, onClose }: { orgId?: string; saleId?: string | null; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!saleId;
  const [form, setForm] = useState({ customer_id: "", notes: "", status: "order" as "quote" | "order" | "paid" | "cancelled" | "returned" });
  const [items, setItems] = useState<SaleItem[]>([]);
  const { data: customers = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["customers-sel-sales", orgId],
    queryFn: async () => (await supabase.from("customers").select("id,name").eq("organization_id", orgId!).order("name")).data ?? [],
  });
  const { data: products = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["products-sel-sales", orgId],
    queryFn: async () => (await supabase.from("products").select("id,name,price,kind").eq("organization_id", orgId!).order("name")).data ?? [],
  });

  const { data: existing } = useQuery({
    enabled: !!saleId,
    queryKey: ["sale-edit", saleId],
    queryFn: async () => {
      const { data: sale } = await supabase.from("sales").select("*").eq("id", saleId!).single();
      const { data: its } = await supabase.from("sale_items").select("*").eq("sale_id", saleId!);
      return { sale, items: its ?? [] };
    },
  });

  useEffect(() => {
    if (existing?.sale) {
      setForm({
        customer_id: existing.sale.customer_id ?? "",
        notes: existing.sale.notes ?? "",
        status: existing.sale.status,
      });
      setItems((existing.items as any[]).map(it => ({
        product_id: it.product_id, description: it.description,
        quantity: Number(it.quantity), unit_price: Number(it.unit_price),
      })));
    }
  }, [existing]);

  const total = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);

  const addProduct = (productId: string) => {
    const p = (products as any[]).find(x => x.id === productId);
    if (!p) return;
    setItems(prev => [...prev, { product_id: p.id, description: p.name, quantity: 1, unit_price: Number(p.price) }]);
  };
  const updateItem = (idx: number, patch: Partial<SaleItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const save = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sem empresa");
      if (items.length === 0) throw new Error("Adicione ao menos um item");
      let id = saleId;
      if (isEdit) {
        const { error } = await supabase.from("sales").update({
          customer_id: form.customer_id || null, total, notes: form.notes || null, status: form.status,
        }).eq("id", saleId!);
        if (error) throw error;
        
        if (user && orgId && existing?.sale) {
          const changes: any = {};
          if (form.status !== existing.sale.status) changes.status = { old: existing.sale.status, new: form.status };
          if (total !== Number(existing.sale.total)) changes.total = { old: existing.sale.total, new: total };
          
          if (Object.keys(changes).length > 0) {
            await logAudit({
              orgId,
              userId: user.id,
              action: "update_sale",
              entity: "sales",
              entityId: saleId!,
              payload: { changes }
            });
          }
        }
        await supabase.from("sale_items").delete().eq("sale_id", saleId!);
      } else {
        const { data: sale, error } = await supabase.from("sales").insert({
          organization_id: orgId, customer_id: form.customer_id || null,
          total, notes: form.notes || null, status: form.status,
        }).select("id").single();
        if (error) throw error;
        id = sale.id;
        
        if (user && orgId) {
          await logAudit({
            orgId,
            userId: user.id,
            action: "create_sale",
            entity: "sales",
            entityId: id,
            payload: { total, status: form.status }
          });
        }
      }
      const payload = items.map(it => ({
        sale_id: id!, organization_id: orgId, product_id: it.product_id || null,
        description: it.description, quantity: Number(it.quantity),
        unit_price: Number(it.unit_price), subtotal: Number(it.quantity) * Number(it.unit_price),
      }));
      const { error: itemsErr } = await supabase.from("sale_items").insert(payload);
      if (itemsErr) throw itemsErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sale-edit", saleId] });
      toast.success(isEdit ? "Venda atualizada" : "Venda registrada");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{isEdit ? "Editar venda" : "Nova venda"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Cliente</Label>
            <Select value={form.customer_id || "_none"} onValueChange={v => setForm({ ...form, customer_id: v === "_none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem cliente</SelectItem>
                {(customers as any[]).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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

        <div className="space-y-2 border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <Label>Itens</Label>
            <div className="w-64">
              <Select value="" onValueChange={addProduct}>
                <SelectTrigger><SelectValue placeholder="+ Adicionar produto/serviço" /></SelectTrigger>
                <SelectContent>
                  {(products as any[]).length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum cadastrado</div>}
                  {(products as any[]).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {brl(Number(p.price))} {p.kind === "service" ? "(serviço)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Selecione um produto ou serviço acima para começar.</p>}

          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5 space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Input value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Qtd</Label>
                <Input type="number" step="0.01" min="0" value={it.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Preço</Label>
                <Input type="number" step="0.01" min="0" value={it.unit_price} onChange={e => updateItem(idx, { unit_price: Number(e.target.value) })} />
              </div>
              <div className="col-span-2 text-right text-sm font-medium pb-2">
                {brl(it.quantity * it.unit_price)}
              </div>
              <div className="col-span-1 pb-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center border-t pt-2 mt-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display font-bold text-lg">{brl(total)}</span>
          </div>
        </div>

        <div className="space-y-1.5"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={save.isPending}>Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
