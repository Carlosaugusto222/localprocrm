import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle, FileText, Receipt, MessageCircle } from "lucide-react";
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
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["os", id] }); toast.success("Atualizado"); },
  });

  const addItem = useMutation({
    mutationFn: async (item: { product_id: string | null; description: string; quantity: number; unit_price: number }) => {
      const { error } = await supabase.from("service_order_items").insert({ service_order_id: id, ...item });
      if (error) throw error;
      // recompute total
      const { data: its } = await supabase.from("service_order_items").select("total").eq("service_order_id", id);
      const total = (its ?? []).reduce((a, b) => a + Number(b.total ?? 0), 0);
      await supabase.from("service_orders").update({ total }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["os-items", id] }); qc.invalidateQueries({ queryKey: ["os", id] }); },
  });

  const delItem = useMutation({
    mutationFn: async (itemId: string) => {
      await supabase.from("service_order_items").delete().eq("id", itemId);
      const { data: its } = await supabase.from("service_order_items").select("total").eq("service_order_id", id);
      const total = (its ?? []).reduce((a, b) => a + Number(b.total ?? 0), 0);
      await supabase.from("service_orders").update({ total }).eq("id", id);
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
          organization_id: org.id, customer_id: os.customer_id, total: Number(os.total),
          status: "paid", notes: `OS #${os.number} - ${os.title}`,
        }).select().single();

        if (sale) {
          await supabase.from("sale_items").insert(
            items.map((it: any) => ({
              sale_id: sale.id, organization_id: org.id,
              product_id: it.product_id, description: it.description,
              quantity: Number(it.quantity), unit_price: Number(it.unit_price),
              subtotal: Number(it.quantity) * Number(it.unit_price),
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
          <div className="text-xs font-mono text-muted-foreground">#{os.number}</div>
          <h1 className="text-2xl font-display font-bold">{os.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {os.customer?.name ?? "Sem cliente"} · Aberta em {new Date(os.opened_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={os.status} onValueChange={v => updateOS.mutate({ status: v })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
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
                  <div className="flex-1 truncate">{it.description}</div>
                  <div className="text-muted-foreground tabular-nums">{it.quantity} × {fmtMoney(Number(it.unit_price))}</div>
                  <div className="font-medium tabular-nums w-24 text-right">{fmtMoney(Number(it.total))}</div>
                  <Button size="icon" variant="ghost" onClick={() => delItem.mutate(it.id)}><Trash2 className="size-3.5" /></Button>
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

function AddItemRow({ products, onAdd }: { products: any[]; onAdd: (i: any) => void }) {
  const [pid, setPid] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("0");

  const pickProduct = (id: string) => {
    setPid(id);
    const p = products.find(x => x.id === id);
    if (p) { setDesc(p.name); setPrice(String(p.price)); }
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-5 space-y-1"><Label className="text-xs">Produto/Serviço</Label>
        <Select value={pid} onValueChange={pickProduct}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="col-span-3 space-y-1"><Label className="text-xs">Descrição</Label>
        <Input value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div className="col-span-1 space-y-1"><Label className="text-xs">Qtd</Label>
        <Input value={qty} onChange={e => setQty(e.target.value)} type="number" step="0.01" /></div>
      <div className="col-span-2 space-y-1"><Label className="text-xs">Preço</Label>
        <Input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01" /></div>
      <Button className="col-span-1" size="icon" onClick={() => {
        if (!desc) return;
        onAdd({ product_id: pid || null, description: desc, quantity: Number(qty), unit_price: Number(price) });
        setPid(""); setDesc(""); setQty("1"); setPrice("0");
      }}><Plus className="size-4" /></Button>
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
