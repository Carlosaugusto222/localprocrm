import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search, Trash2, Plus, Minus, Receipt, ShoppingCart, X, User, Percent,
  Banknote, CreditCard, QrCode, FileText, Wallet, Lock, Unlock, Tag, Package, Scissors, Keyboard,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { generateBusinessPDF } from "@/lib/exporters";
import { PAYMENT_METHODS } from "@/lib/modules";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pdv")({
  head: () => ({ meta: [{ title: "PDV — LocalPro CRM" }] }),
  component: PDVPage,
});

type CartItem = {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  kind?: string | null;
};

const fmt = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PAYMENT_ICONS: Record<string, any> = {
  cash: Banknote, pix: QrCode, debit: CreditCard, credit: CreditCard,
  boleto: FileText, transfer: Wallet, other: Wallet,
};

function PDVPage() {
  const { org } = useCurrentOrg();
  const orgId = org?.id;
  const qc = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "product" | "service">("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
    queryFn: async () => (await supabase.from("customers").select("id,name,phone")
      .eq("organization_id", orgId!).order("name").limit(500)).data ?? [],
  });

  const { data: openSession } = useQuery({
    enabled: !!orgId,
    queryKey: ["cash-open", orgId],
    queryFn: async () => (await supabase.from("cash_sessions").select("id,opened_at,opening_amount")
      .eq("organization_id", orgId!).eq("status", "open").maybeSingle()).data,
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter((p: any) => {
      if (filter !== "all" && p.kind !== filter) return false;
      if (!s) return true;
      return p.name?.toLowerCase().includes(s)
        || p.sku?.toLowerCase().includes(s)
        || p.barcode?.toLowerCase().includes(s);
    });
  }, [products, search, filter]);

  const subtotal = cart.reduce((a, c) => a + c.quantity * c.unit_price, 0);
  const discountNum = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const total = Math.max(0, subtotal - discountNum);
  const paidNum = paymentMethod === "cash" ? Number(paid || 0) : total;
  const change = Math.max(0, paidNum - total);
  const itemCount = cart.reduce((a, c) => a + c.quantity, 0);

  const addProduct = useCallback((p: any) => {
    setCart(c => {
      const i = c.findIndex(x => x.product_id === p.id);
      if (i >= 0) {
        const copy = [...c]; copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 }; return copy;
      }
      return [...c, { product_id: p.id, description: p.name, quantity: 1, unit_price: Number(p.price), kind: p.kind }];
    });
    setSearch("");
    searchRef.current?.focus();
  }, []);

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const s = search.trim().toLowerCase();
      const exact = products.find((p: any) => p.barcode?.toLowerCase() === s || p.sku?.toLowerCase() === s);
      if (exact) addProduct(exact);
      else if (filtered.length === 1) addProduct(filtered[0]);
    }
  };

  // Global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "F4") { e.preventDefault(); if (cart.length) setCheckoutOpen(true); }
      else if (e.key === "Escape" && !checkoutOpen) { setSearch(""); }
      else if (e.key === "?" && e.shiftKey) { setShortcutsOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart.length, checkoutOpen]);

  const finalize = useMutation({
    mutationFn: async (opts: { action: "print" | "download" | "none" }) => {
      if (!orgId || cart.length === 0) throw new Error("Carrinho vazio");

      const { data: sale, error } = await supabase.from("sales").insert({
        organization_id: orgId,
        customer_id: customerId || null,
        total, status: "paid", payment_method: paymentMethod,
        notes: discountNum > 0 ? `Desconto ${fmt(discountNum)}` : null,
      }).select().single();
      if (error) throw error;

      await supabase.from("sale_items").insert(cart.map(c => ({
        sale_id: sale.id, organization_id: orgId,
        product_id: c.product_id, description: c.description,
        quantity: c.quantity, unit_price: c.unit_price,
        subtotal: c.quantity * c.unit_price,
      })));

      for (const c of cart) {
        if (!c.product_id) continue;
        const p = products.find((x: any) => x.id === c.product_id);
        if (p?.track_stock) {
          await supabase.from("products").update({ stock_qty: Number(p.stock_qty ?? 0) - c.quantity })
            .eq("id", c.product_id);
        }
      }

      await supabase.from("transactions").insert({
        organization_id: orgId, kind: "income", amount: total,
        description: `Venda PDV #${sale.id.slice(0, 8)}`,
        payment_method: paymentMethod,
        cash_session_id: openSession?.id ?? null,
        paid_at: new Date().toISOString(),
      });

      if (opts.action !== "none") {
        const customer = customers.find((c: any) => c.id === customerId) ?? null;
        generateBusinessPDF({
          kind: "receipt", number: sale.id.slice(0, 8).toUpperCase(),
          org: org ?? {}, customer,
          title: "Cupom de Venda (não fiscal)",
          items: cart.map(c => ({ description: c.description, quantity: c.quantity, unit_price: c.unit_price, total: c.quantity * c.unit_price })),
          notes: `Pagamento: ${PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}${discountNum > 0 ? ` · Desconto: ${fmt(discountNum)}` : ""}`,
          total,
          action: opts.action,
        });
      }
      return sale;
    },
    onSuccess: () => {
      toast.success("Venda finalizada com sucesso");
      setCart([]); setDiscount("0"); setPaid(""); setCustomerId(""); setPaymentMethod("cash");
      setCheckoutOpen(false);
      qc.invalidateQueries();
      searchRef.current?.focus();
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => { searchRef.current?.focus(); }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-muted/30">
        {/* Status bar */}
        <div className="h-11 px-4 flex items-center gap-3 border-b bg-card text-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className={cn("size-2 rounded-full", openSession ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
            <span className="font-medium">
              {openSession ? "Caixa aberto" : "Caixa fechado"}
            </span>
            {openSession?.opened_at && (
              <span className="text-muted-foreground text-xs">
                · desde {new Date(openSession.opened_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div className="h-4 w-px bg-border mx-1" />
          <span className="text-muted-foreground text-xs hidden sm:inline">{org?.name}</span>
          <div className="ml-auto flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShortcutsOpen(true)}>
                  <Keyboard className="size-3.5" /> Atalhos
                </Button>
              </TooltipTrigger>
              <TooltipContent>F2 buscar · F4 finalizar · ESC limpar busca</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex-1 grid lg:grid-cols-[1fr_420px] min-h-0">
          {/* LEFT — catalog */}
          <div className="flex flex-col min-h-0 border-r">
            {/* Search + filters */}
            <div className="p-4 space-y-3 border-b bg-card">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={handleSearchKey}
                  placeholder="Buscar por nome, SKU ou bipar código de barras…  (F2)"
                  className="pl-9 pr-20 h-12 text-base font-medium"
                  autoFocus
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-6 items-center rounded border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
                  F2
                </kbd>
              </div>
              <div className="flex items-center gap-1">
                {[
                  { id: "all" as const, label: "Tudo", icon: Tag },
                  { id: "product" as const, label: "Produtos", icon: Package },
                  { id: "service" as const, label: "Serviços", icon: Scissors },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={cn(
                      "h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition",
                      filter === id
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    <Icon className="size-3.5" />{label}
                  </button>
                ))}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {filtered.length} {filtered.length === 1 ? "item" : "itens"}
                </span>
              </div>
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Package className="size-12 mb-3 opacity-30" />
                  <p className="font-medium">Nenhum item encontrado</p>
                  <p className="text-xs mt-1">Cadastre produtos e serviços em <b>Vendas</b>.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filtered.map((p: any) => {
                    const low = p.track_stock && Number(p.stock_qty) <= 3;
                    const out = p.track_stock && Number(p.stock_qty) <= 0;
                    const isService = p.kind === "service";
                    return (
                      <button
                        key={p.id}
                        onClick={() => addProduct(p)}
                        disabled={out}
                        className={cn(
                          "group relative text-left rounded-xl border bg-card overflow-hidden transition",
                          "hover:border-primary hover:shadow-md hover:-translate-y-0.5",
                          "active:translate-y-0 active:scale-[0.99]",
                          "disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
                        )}
                      >
                        <div className={cn(
                          "h-20 flex items-center justify-center",
                          isService
                            ? "bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-transparent"
                            : "bg-gradient-to-br from-primary/15 via-sky-500/10 to-transparent"
                        )}>
                          {isService
                            ? <Scissors className="size-7 text-violet-500/70" />
                            : <Package className="size-7 text-primary/70" />}
                          {p.track_stock && (
                            <span className={cn(
                              "absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-md tabular-nums",
                              out ? "bg-rose-500 text-white" :
                              low ? "bg-amber-500/90 text-white" :
                                    "bg-background/90 text-muted-foreground"
                            )}>
                              {out ? "Sem estoque" : `${p.stock_qty} un`}
                            </span>
                          )}
                          {isService && (
                            <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-500/90 text-white">
                              Serv.
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                          {p.sku && <div className="text-[10px] text-muted-foreground mt-1 font-mono">{p.sku}</div>}
                          <div className="mt-2 font-display font-bold text-base tabular-nums">{fmt(Number(p.price))}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — cart */}
          <div className="flex flex-col min-h-0 bg-card">
            {/* Cart header */}
            <div className="p-4 border-b flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ShoppingCart className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold leading-tight">Venda atual</div>
                <div className="text-xs text-muted-foreground">
                  {itemCount === 0 ? "Carrinho vazio" : `${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
                </div>
              </div>
              {cart.length > 0 && (
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setCart([])}>
                  <X className="size-3.5 mr-1" />Cancelar
                </Button>
              )}
            </div>

            {/* Customer picker */}
            <div className="p-4 border-b">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Cliente
              </Label>
              <Select value={customerId || "none"} onValueChange={v => setCustomerId(v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1.5 h-10">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" />
                    <SelectValue placeholder="Consumidor" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Consumidor (sem cadastro)</SelectItem>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <ShoppingCart className="size-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Selecione itens do catálogo</p>
                  <p className="text-xs mt-1">ou bipe um código de barras na busca.</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {cart.map((it, i) => (
                    <li key={i} className="p-3 flex items-start gap-3 hover:bg-muted/40">
                      <div className={cn(
                        "size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        it.kind === "service" ? "bg-violet-500/10 text-violet-500" : "bg-primary/10 text-primary"
                      )}>
                        {it.kind === "service" ? <Scissors className="size-4" /> : <Package className="size-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{it.description}</div>
                        <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                          {fmt(it.unit_price)} × {it.quantity}
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <Button size="icon" variant="outline" className="size-7"
                            onClick={() => setCart(c => c.map((x, j) => j === i ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}>
                            <Minus className="size-3" />
                          </Button>
                          <Input
                            type="number" min={1} value={it.quantity}
                            onChange={e => setCart(c => c.map((x, j) => j === i ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x))}
                            className="h-7 w-14 text-center tabular-nums px-1"
                          />
                          <Button size="icon" variant="outline" className="size-7"
                            onClick={() => setCart(c => c.map((x, j) => j === i ? { ...x, quantity: x.quantity + 1 } : x))}>
                            <Plus className="size-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-7 ml-1 text-muted-foreground hover:text-rose-500"
                            onClick={() => setCart(c => c.filter((_, j) => j !== i))}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-display font-bold tabular-nums">
                          {fmt(it.unit_price * it.quantity)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Totals + finalize */}
            <div className="border-t bg-gradient-to-b from-muted/20 to-card p-4 space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{fmt(subtotal)}</span>
                </div>
                {discountNum > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Desconto</span>
                    <span className="tabular-nums">−{fmt(discountNum)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-baseline justify-between border-t pt-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total</span>
                <span className="text-3xl font-display font-bold tabular-nums">{fmt(total)}</span>
              </div>

              <Button
                size="lg"
                className="w-full h-12 text-base font-semibold"
                disabled={cart.length === 0}
                onClick={() => setCheckoutOpen(true)}
              >
                Finalizar venda
                <kbd className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-primary-foreground/15 font-mono">F4</kbd>
              </Button>
            </div>
          </div>
        </div>

        {/* CHECKOUT DIALOG */}
        <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Receber pagamento</DialogTitle>
            </DialogHeader>

            <div className="rounded-xl border bg-muted/30 p-4 text-center">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">A receber</div>
              <div className="text-4xl font-display font-bold tabular-nums mt-1">{fmt(total)}</div>
              <div className="text-xs text-muted-foreground mt-1">{itemCount} {itemCount === 1 ? "item" : "itens"} · subtotal {fmt(subtotal)}</div>
            </div>

            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Forma de pagamento
              </Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {PAYMENT_METHODS.slice(0, 4).map(m => {
                  const Icon = PAYMENT_ICONS[m.id] ?? Wallet;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition",
                        paymentMethod === m.id
                          ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/30"
                          : "bg-card hover:border-primary/40 text-muted-foreground"
                      )}
                    >
                      <Icon className="size-5" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-2 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  <Percent className="size-3" /> Desconto
                </Label>
                <Input type="number" step="0.01" value={discount}
                  onChange={e => setDiscount(e.target.value)} className="h-10 mt-1.5 tabular-nums" />
              </div>
              {paymentMethod === "cash" && (
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                    <Banknote className="size-3" /> Recebido
                  </Label>
                  <Input type="number" step="0.01" value={paid}
                    onChange={e => setPaid(e.target.value)} placeholder={fmt(total)} className="h-10 mt-1.5 tabular-nums" />
                </div>
              )}
            </div>

            {paymentMethod === "cash" && Number(paid) > 0 && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Troco</span>
                <span className="text-xl font-display font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{fmt(change)}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button 
                variant="outline" 
                disabled={finalize.isPending}
                onClick={() => finalize.mutate({ action: "none" })} 
                className="flex-1"
              >
                Apenas Salvar
              </Button>
              <div className="flex flex-1 gap-2">
                <Button 
                  disabled={finalize.isPending}
                  onClick={() => finalize.mutate({ action: "print" })} 
                  className="flex-1 gap-1.5"
                >
                  <Receipt className="size-4" /> Imprimir
                </Button>
                <Button 
                  variant="secondary"
                  disabled={finalize.isPending}
                  onClick={() => finalize.mutate({ action: "download" })} 
                  className="px-3"
                  title="Baixar PDF"
                >
                  <FileText className="size-4" />
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SHORTCUTS DIALOG */}
        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle className="font-display">Atalhos do PDV</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              {[
                ["F2", "Focar busca / leitor de código de barras"],
                ["Enter", "Adicionar item exato ao carrinho"],
                ["F4", "Abrir tela de pagamento"],
                ["ESC", "Limpar busca"],
                ["Shift + ?", "Mostrar esta ajuda"],
              ].map(([k, d]) => (
                <div key={k} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                  <span className="text-muted-foreground">{d}</span>
                  <kbd className="px-2 py-0.5 rounded border bg-muted text-xs font-mono">{k}</kbd>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
