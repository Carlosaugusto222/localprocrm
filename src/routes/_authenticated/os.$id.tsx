import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle, FileText, Receipt, MessageCircle, Edit } from "lucide-react";
import { PageContainer } from "@/components/page-header";
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
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/hooks/use-auth";
import { generateBusinessPDF } from "@/lib/exporters";

export const Route = createFileRoute("/_authenticated/os/$id")({
  component: OSDetail,
});

const STATUS = [
  { id: "open", label: "Aberta" },
  { id: "in_progress", label: "Em execução" },
  { id: "waiting", label: "Aguardando peça" },
  { id: "done", label: "Concluída" },
  { id: "delivered", label: "Entregue" },
  { id: "cancelled", label: "Cancelada" },
];

const fmtMoney = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function OSDetail() {
  const { id } = Route.useParams();
  const { org } = useCurrentOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: os } = useQuery({
    queryKey: ["os", id],
    queryFn: async () => (await supabase.from("service_orders").select("*, customer:customers(id,name,phone)").eq("id", id).single()).data,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["os-items", id],
    queryFn: async () => (await supabase.from("service_order_items").select("*").eq("service_order_id", id).order("created_at")).data ?? [],
  });

  const { data: products = [] } = useQuery({
    enabled: !!org?.id,
    queryKey: ["products-sel-os", org?.id],
    queryFn: async () => (await supabase.from("products").select("id,name,price,kind").eq("organization_id", org!.id).order("name")).data ?? [],
  });

  const updateOS = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("service_orders").update(patch).eq("id", id);
      if (error) throw error;
      
      if (user && org?.id) {
        await logAudit({
          orgId: org.id,
          userId: user.id,
          action: "update_os",
          entity: "service_orders",
          entityId: id,
          payload: patch
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["os", id] }); toast.success("Atualizado"); },
  });

  const addItem = useMutation({
    mutationFn: async (item: { product_id: string | null; description: string; quantity: number; unit_price: number; discount?: number }) => {
      const { error } = await supabase.from("service_order_items").insert({ 
        service_order_id: id, 
        ...item,
        total: (Number(item.quantity) * Number(item.unit_price)) - Number(item.discount || 0)
      });
      if (error) throw error;
      
      // recompute total
      const { data: its } = await supabase.from("service_order_items").select("total").eq("service_order_id", id);
      const total = (its ?? []).reduce((a, b) => a + Number(b.total ?? 0), 0);
      await supabase.from("service_orders").update({ total }).eq("id", id);
      
      if (user && org?.id) {
        await logAudit({
          orgId: org.id,
          userId: user.id,
          action: "update_os_items",
          entity: "service_orders",
          entityId: id,
          payload: { action: "add_item", item, new_total: total }
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["os-items", id] }); qc.invalidateQueries({ queryKey: ["os", id] }); },
  });

  const delItem = useMutation({
    mutationFn: async (itemId: string) => {
      await supabase.from("service_order_items").delete().eq("id", itemId);
      const { data: its } = await supabase.from("service_order_items").select("total").eq("service_order_id", id);
      const total = (its ?? []).reduce((a, b) => a + Number(b.total ?? 0), 0);
      await supabase.from("service_orders").update({ total }).eq("id", id);
      
      if (user && org?.id) {
        await logAudit({
          orgId: org.id,
          userId: user.id,
          action: "update_os_items",
          entity: "service_orders",
          entityId: id,
          payload: { action: "remove_item", item_id: itemId, new_total: total }
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["os-items", id] }); qc.invalidateQueries({ queryKey: ["os", id] }); },
  });

  const closeOS = useMutation({
    mutationFn: async () => {
      if (!os || !org) return;
      // Mark done, create sale + financial transaction
      await supabase.from("service_orders").update({ status: "done", closed_at: new Date().toISOString() }).eq("id", id);

      if (Number(os.total) > 0) {
        const { data: sale } = await supabase.from("sales").insert({
          organization_id: org.id, 
          customer_id: os.customer_id, 
          total: Number(os.total),
          status: "paid", 
          notes: `OS #${os.number} - ${os.title}`,
        }).select().single();

        if (sale) {
          await supabase.from("sale_items").insert(
            items.map((it: any) => ({
              sale_id: sale.id, 
              organization_id: org.id,
              product_id: it.product_id, 
              description: it.description,
              quantity: Number(it.quantity), 
              unit_price: Number(it.unit_price),
              subtotal: Number(it.total),
            }))
          );
          await supabase.from("transactions").insert({
            organization_id: org.id, kind: "income", amount: Number(os.total),
            description: `OS #${os.number}`, paid_at: new Date().toISOString(),
          });
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["os", id] }); toast.success("OS concluída e venda gerada"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!os) return <PageContainer><p>Carregando...</p></PageContainer>;

  const checklist: { text: string; done: boolean }[] = (Array.isArray(os.checklist) ? os.checklist : []) as any;


  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/os"><ArrowLeft className="size-4 mr-1" /> Voltar</Link></Button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
              #{os.number}
            </div>
            {(os.extra_fields as any)?.serial_number && (
              <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-tighter">
                {(os.extra_fields as any).serial_number}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-display font-bold">{os.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
            <span>{os.customer?.name ?? "Sem cliente"}</span>
            <span>·</span>
            <span>Aberta em {new Date(os.opened_at).toLocaleDateString("pt-BR")}</span>
            {(os.extra_fields as any)?.brand_model && (
              <>
                <span>·</span>
                <span className="font-medium text-foreground">{(os.extra_fields as any).brand_model}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Edit className="size-4" /> Editar Dados
              </Button>
            </DialogTrigger>
            <EditOSDialog os={os} orgId={org?.id} onUpdated={() => qc.invalidateQueries({ queryKey: ["os", id] })} />
          </Dialog>

          <Button variant="outline" size="sm" className="gap-1"
            onClick={() => generateBusinessPDF({
              kind: "quote", number: os.number, org: org ?? {}, customer: os.customer,
              title: os.title, items: items.map((it: any) => ({ description: it.description, quantity: Number(it.quantity), unit_price: Number(it.unit_price), total: Number(it.total) })),
              notes: os.description, total: Number(os.total ?? 0),
            })}><FileText className="size-4" /> Orçamento</Button>
          <Button variant="outline" size="sm" className="gap-1"
            onClick={() => generateBusinessPDF({
              kind: "receipt", number: os.number, org: org ?? {}, customer: os.customer,
              title: os.title, items: items.map((it: any) => ({ description: it.description, quantity: Number(it.quantity), unit_price: Number(it.unit_price), total: Number(it.total) })),
              notes: os.description, total: Number(os.total ?? 0),
            })}><Receipt className="size-4" /> Recibo</Button>
          <Button variant="outline" size="sm" className="gap-1" disabled={!os.customer?.phone}
            onClick={() => {
              const phone = String(os.customer?.phone ?? "").replace(/\D/g, "");
              const statusLbl = STATUS.find(s => s.id === os.status)?.label ?? os.status;
              const itemsTxt = items.map((it: any) => `• ${it.description} (${it.quantity}x ${fmtMoney(Number(it.unit_price))})`).join("\n");
              const msg = [
                `Olá ${os.customer?.name ?? ""}! 👋`,
                ``,
                `Atualização da sua OS *#${os.number} — ${os.title}*`,
                `Status: *${statusLbl}*`,
                ``,
                itemsTxt && `Itens:\n${itemsTxt}`,
                ``,
                `Total: *${fmtMoney(Number(os.total ?? 0))}*`,
                org?.name && `\n— ${org.name}`,
              ].filter(Boolean).join("\n");
              window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
            }}><MessageCircle className="size-4" /> WhatsApp</Button>
          {os.status !== "done" && os.status !== "delivered" && (
            <Button onClick={() => closeOS.mutate()} disabled={closeOS.isPending}>Concluir e faturar</Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Itens (peças e serviços)</CardTitle></CardHeader>
          <CardContent>
            <AddItemRow products={products} onAdd={(it) => addItem.mutate(it)} />
            <div className="mt-3 divide-y divide-border">
              {items.map((it: any) => (
                <div key={it.id} className="py-2 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{it.description}</div>
                    {Number(it.discount) > 0 && (
                      <div className="text-[10px] text-emerald-600 font-medium">
                        Desconto: -{fmtMoney(Number(it.discount))}
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground tabular-nums text-right whitespace-nowrap">
                    {it.quantity} × {fmtMoney(Number(it.unit_price))}
                  </div>
                  <div className="font-medium tabular-nums w-24 text-right">{fmtMoney(Number(it.total))}</div>
                  <Button size="icon" variant="ghost" onClick={() => delItem.mutate(it.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum item.</p>}
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-display font-bold tabular-nums">{fmtMoney(Number(os.total ?? 0))}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Checklist</CardTitle></CardHeader>
            <CardContent>
              <Checklist value={checklist} onChange={(v) => updateOS.mutate({ checklist: v })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Descrição / Notas</CardTitle></CardHeader>
            <CardContent>
              <Textarea defaultValue={os.description ?? ""} rows={5}
                onBlur={e => e.target.value !== (os.description ?? "") && updateOS.mutate({ description: e.target.value })} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function EditOSDialog({ os, orgId, onUpdated }: { os: any; orgId?: string; onUpdated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ 
    title: os.title, 
    description: os.description || "", 
    customer_id: os.customer_id || "", 
    priority: os.priority || "normal",
    status: os.status,
    extra_fields: os.extra_fields || {}
  });

  const { data: customers = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["customers-sel-os-edit", orgId],
    queryFn: async () => (await supabase.from("customers").select("id,name").eq("organization_id", orgId!).order("name")).data ?? [],
  });

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("service_orders").update({
        title: form.title,
        description: form.description,
        customer_id: form.customer_id || null,
        priority: form.priority,
        status: form.status,
        extra_fields: form.extra_fields
      }).eq("id", os.id);
      if (error) throw error;

      if (user && orgId) {
        await logAudit({
          orgId,
          userId: user.id,
          action: "update_os_header",
          entity: "service_orders",
          entityId: os.id,
          payload: form
        });
      }
    },
    onSuccess: () => {
      toast.success("OS atualizada");
      onUpdated();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateExtraField = (key: string, value: string) => {
    setForm(prev => ({
      ...prev,
      extra_fields: { ...prev.extra_fields, [key]: value }
    }));
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Editar Ordem de Serviço</DialogTitle></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); update.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Título *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
            </Select></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="border-t pt-4">
          <Label className="text-sm font-semibold mb-2 block">Campos Extras / Informações Adicionais</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Marca/Modelo</Label>
              <Input value={(form.extra_fields as any).brand_model || ""} onChange={e => updateExtraField("brand_model", e.target.value)} placeholder="Ex: Honda Civic" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Placa / Serial</Label>
              <Input value={(form.extra_fields as any).serial_number || ""} onChange={e => updateExtraField("serial_number", e.target.value)} placeholder="Ex: ABC-1234" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor / Detalhes</Label>
              <Input value={(form.extra_fields as any).color || ""} onChange={e => updateExtraField("color", e.target.value)} placeholder="Ex: Preto Fosco" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kilometragem / Uso</Label>
              <Input value={(form.extra_fields as any).usage_metrics || ""} onChange={e => updateExtraField("usage_metrics", e.target.value)} placeholder="Ex: 50.000 km" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5"><Label>Descrição</Label>
          <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
        
        <DialogFooter>
          <Button type="submit" disabled={update.isPending} className="w-full sm:w-auto">Salvar Alterações</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}


function AddItemRow({ products, onAdd }: { products: any[]; onAdd: (i: any) => void }) {
  const [pid, setPid] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("0");
  const [discount, setDiscount] = useState("0");

  const pickProduct = (id: string) => {
    setPid(id);
    const p = products.find(x => x.id === id);
    if (p) { setDesc(p.name); setPrice(String(p.price)); setDiscount("0"); }
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-4 space-y-1"><Label className="text-xs text-muted-foreground">Produto/Serviço</Label>
        <Select value={pid} onValueChange={pickProduct}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            {products.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} {p.sku ? `(SKU: ${p.sku})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 space-y-1"><Label className="text-xs text-muted-foreground">Qtd</Label>
        <Input value={qty} onChange={e => setQty(e.target.value)} type="number" step="0.01" className="h-9" /></div>
      <div className="col-span-2 space-y-1"><Label className="text-xs text-muted-foreground">Unitário</Label>
        <Input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01" className="h-9" /></div>
      <div className="col-span-2 space-y-1"><Label className="text-xs text-muted-foreground">Desconto</Label>
        <Input value={discount} onChange={e => setDiscount(e.target.value)} type="number" step="0.01" className="h-9 text-emerald-600" /></div>
      <div className="col-span-2 flex justify-end">
        <Button className="w-full h-9" size="sm" onClick={() => {
          if (!desc && !pid) return;
          onAdd({ 
            product_id: pid || null, 
            description: desc || (products.find(x => x.id === pid)?.name ?? ""), 
            quantity: Number(qty), 
            unit_price: Number(price),
            discount: Number(discount)
          });
          setPid(""); setDesc(""); setQty("1"); setPrice("0"); setDiscount("0");
        }}><Plus className="size-4 mr-1" /> Add</Button>
      </div>
    </div>
  );
}

function Checklist({ value, onChange }: { value: { text: string; done: boolean }[]; onChange: (v: any) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <button onClick={() => onChange(value.map((x, j) => j === i ? { ...x, done: !x.done } : x))}>
            {c.done ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Circle className="size-4 text-muted-foreground" />}
          </button>
          <span className={`text-sm flex-1 ${c.done ? "line-through text-muted-foreground" : ""}`}>{c.text}</span>
          <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-xs text-muted-foreground hover:text-destructive">×</button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={text} onChange={e => setText(e.target.value)} placeholder="Nova tarefa..." className="text-sm h-8" />
        <Button size="sm" variant="outline" onClick={() => {
          if (text.trim()) { onChange([...value, { text: text.trim(), done: false }]); setText(""); }
        }}>Adicionar</Button>
      </div>
    </div>
  );
}
