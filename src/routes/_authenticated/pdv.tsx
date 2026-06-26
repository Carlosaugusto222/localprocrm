import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Trash2, Plus, Minus, Receipt, ShoppingCart, X } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { generateBusinessPDF } from "@/lib/exporters";
import { PAYMENT_METHODS } from "@/lib/modules";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pdv")({
  head: () => ({ meta: [{ title: "PDV — LocalPro CRM" }] }),
  component: PDVPage,
});

type CartItem = {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
};

const fmt = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PDVPage() {
  const { org } = useCurrentOrg();
  const orgId = org?.id;
  const qc = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("0");

  const { data: products = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["pdv-products", orgId],
    queryFn: async () => (await supabase.from("products")
      .select("id,name,price,sku,barcode,kind,stock_qty,track_stock")
      .eq("organization_id", orgId!).eq("active", true).order("name")).data ?? [],
  });

  const { data: customers = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["pdv-customers", orgId],
    queryFn: async () => (await supabase.from("customers").select("id,name,phone,email")
      .eq("organization_id", orgId!).order("name").limit(500)).data ?? [],
  });

  const { data: openSession } = useQuery({
    enabled: !!orgId,
    queryKey: ["cash-open", orgId],
    queryFn: async () => (await supabase.from("cash_sessions").select("id")
      .eq("organization_id", orgId!).eq("status", "open").maybeSingle()).data,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 24);
    const s = search.toLowerCase();
    return products.filter((p: any) =>
      p.name?.toLowerCase().includes(s) ||
      p.sku?.toLowerCase().includes(s) ||
      p.barcode?.toLowerCase().includes(s)
    ).slice(0, 24);
  }, [products, search]);

  const subtotal = cart.reduce((a, c) => a + c.quantity * c.unit_price, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const change = Math.max(0, Number(paid || 0) - total);

  const addProduct = (p: any) => {
    setCart(c => {
      const i = c.findIndex(x => x.product_id === p.id);
      if (i >= 0) {
        const copy = [...c]; copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 }; return copy;
      }
      return [...c, { product_id: p.id, description: p.name, quantity: 1, unit_price: Number(p.price) }];
    });
    setSearch("");
    searchRef.current?.focus();
  };

  // Barcode quick: if Enter and search matches a single barcode/SKU, add it
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const s = search.trim().toLowerCase();
      const exact = products.find((p: any) => p.barcode?.toLowerCase() === s || p.sku?.toLowerCase() === s);
      if (exact) addProduct(exact);
      else if (filtered.length === 1) addProduct(filtered[0]);
    }
  };

  const finalize = useMutation({
    mutationFn: async (opts: { print: boolean }) => {
      if (!orgId || cart.length === 0) throw new Error("Carrinho vazio");

      const { data: sale, error } = await supabase.from("sales").insert({
        organization_id: orgId,
        customer_id: customerId || null,
        total, status: "paid", payment_method: paymentMethod,
        notes: discount && Number(discount) > 0 ? `Desconto ${fmt(Number(discount))}` : null,
      }).select().single();
      if (error) throw error;

      await supabase.from("sale_items").insert(cart.map(c => ({
        sale_id: sale.id, organization_id: orgId,
        product_id: c.product_id, description: c.description,
        quantity: c.quantity, unit_price: c.unit_price,
        subtotal: c.quantity * c.unit_price,
      })));

      // Stock movement + decrement
      for (const c of cart) {
        if (!c.product_id) continue;
        const p = products.find((x: any) => x.id === c.product_id);
        if (p?.track_stock) {
          await supabase.from("products").update({ stock_qty: Number(p.stock_qty ?? 0) - c.quantity })
            .eq("id", c.product_id);
        }
      }

      // Financial transaction (link to open cash session)
      await supabase.from("transactions").insert({
        organization_id: orgId, kind: "income", amount: total,
        description: `Venda PDV #${sale.id.slice(0, 8)}`,
        payment_method: paymentMethod,
        cash_session_id: openSession?.id ?? null,
        paid_at: new Date().toISOString(),
      });

      if (opts.print) {
        const customer = customers.find((c: any) => c.id === customerId) ?? null;
        generateBusinessPDF({
          kind: "receipt", number: sale.id.slice(0, 8).toUpperCase(),
          org: org ?? {}, customer,
          title: "Cupom de Venda (não fiscal)",
          items: cart.map(c => ({ description: c.description, quantity: c.quantity, unit_price: c.unit_price, total: c.quantity * c.unit_price })),
          notes: `Pagamento: ${PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}${Number(discount) > 0 ? ` · Desconto: ${fmt(Number(discount))}` : ""}`,
          total,
        });
      }

      return sale;
    },
    onSuccess: () => {
      toast.success("Venda registrada");
      setCart([]); setDiscount("0"); setPaid("0"); setCustomerId("");
      qc.invalidateQueries();
      searchRef.current?.focus();
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => { searchRef.current?.focus(); }, []);

  return (
    <PageContainer>
      <PageHeader title="PDV — Frente de Loja" description="Venda rápida de balcão com cupom não fiscal." />

      {!openSession && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
          ⚠️ Caixa fechado. Abra o caixa em <b>Caixa</b> para que as vendas entrem na conciliação do dia.
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Catálogo */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKey} placeholder="Buscar produto, SKU ou bipar código de barras..."
              className="pl-9 h-11" autoFocus />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map((p: any) => {
              const low = p.track_stock && Number(p.stock_qty) <= 3;
              return (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="text-left p-3 rounded-lg border bg-card hover:border-primary hover:shadow-sm transition active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium line-clamp-2 flex-1">{p.name}</div>
                    {p.kind === "service" && <Badge variant="secondary" className="text-[10px]">Serv.</Badge>}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-base font-display font-bold tabular-nums">{fmt(Number(p.price))}</span>
                    {p.track_stock && (
                      <span className={`text-[10px] ${low ? "text-rose-500" : "text-muted-foreground"}`}>
                        est. {p.stock_qty}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground py-8 text-center">
                Nenhum item. Cadastre produtos em <b>Vendas</b>.
              </p>
            )}
          </div>
        </div>

        {/* Carrinho */}
        <Card className="lg:col-span-2 lg:sticky lg:top-16 lg:self-start">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              <h2 className="font-display font-bold">Carrinho ({cart.length})</h2>
              {cart.length > 0 && (
                <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => setCart([])}>
                  <X className="size-3 mr-1" />Limpar
                </Button>
              )}
            </div>

            <div className="divide-y divide-border max-h-72 overflow-y-auto -mx-1">
              {cart.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center">Adicione itens do catálogo.</p>
              )}
              {cart.map((it, i) => (
                <div key={i} className="py-2 px-1 flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{it.description}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{fmt(it.unit_price)} cada</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="size-6"
                      onClick={() => setCart(c => c.map((x, j) => j === i ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center tabular-nums text-sm">{it.quantity}</span>
                    <Button size="icon" variant="outline" className="size-6"
                      onClick={() => setCart(c => c.map((x, j) => j === i ? { ...x, quantity: x.quantity + 1 } : x))}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <span className="w-16 text-right tabular-nums font-medium">{fmt(it.unit_price * it.quantity)}</span>
                  <Button size="icon" variant="ghost" className="size-6"
                    onClick={() => setCart(c => c.filter((_, j) => j !== i))}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Cliente (opcional)</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Consumidor" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Desconto</Label>
                  <Input type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Recebido</Label>
                  <Input type="number" step="0.01" value={paid} onChange={e => setPaid(e.target.value)} className="h-9" />
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
                {Number(discount) > 0 && <div className="flex justify-between text-rose-500"><span>Desconto</span><span className="tabular-nums">-{fmt(Number(discount))}</span></div>}
                <div className="flex justify-between text-lg font-display font-bold"><span>Total</span><span className="tabular-nums">{fmt(total)}</span></div>
                {paymentMethod === "cash" && Number(paid) > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Troco</span><span className="tabular-nums">{fmt(change)}</span></div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" disabled={cart.length === 0 || finalize.isPending}
                  onClick={() => finalize.mutate({ print: false })}>Finalizar</Button>
                <Button disabled={cart.length === 0 || finalize.isPending}
                  onClick={() => finalize.mutate({ print: true })} className="gap-1">
                  <Receipt className="size-4" />Finalizar + Cupom
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
