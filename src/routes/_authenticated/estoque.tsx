import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, Plus, Search, AlertTriangle, ArrowUpRight, ArrowDownRight, History, Edit, Trash2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
import { useAuth } from "@/hooks/use-auth";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Estoque — LocalPro CRM" }] }),
  component: EstoquePage,
});

function EstoquePage() {
  const { org } = useCurrentOrg();
  const orgId = org?.id;
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: products = [], isLoading } = useQuery({
    enabled: !!orgId,
    queryKey: ["estoque-products", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("products")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("kind", "product")
        .order("name");
      return data ?? [];
    },
  });

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  const lowStock = products.filter(p => p.track_stock && Number(p.stock_qty) <= Number(p.stock_min));

  const adjustStock = useMutation({
    mutationFn: async ({ productId, quantity, type, reason }: { productId: string, quantity: number, type: 'in' | 'out' | 'set', reason: string }) => {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error("Produto não encontrado");

      let newQty = Number(product.stock_qty);
      if (type === 'in') newQty += quantity;
      else if (type === 'out') newQty -= quantity;
      else if (type === 'set') newQty = quantity;

      const { error } = await supabase.from("products").update({
        stock_qty: newQty
      }).eq("id", productId);

      if (error) throw error;

      await logAudit({
        orgId: orgId!,
        userId: user!.id,
        action: "adjust_stock",
        entity: "products",
        entityId: productId,
        payload: { type, quantity, oldQty: product.stock_qty, newQty, reason }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estoque-products"] });
      toast.success("Estoque ajustado com sucesso");
      setAdjustmentOpen(false);
    },
    onError: (e: any) => toast.error(e.message)
  });

  return (
    <PageContainer>
      <PageHeader 
        title="Estoque de Produtos" 
        description="Gerencie as quantidades, entradas e saídas de mercadorias."
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Alerta de Reposição</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStock.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Itens abaixo do mínimo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Valor em Estoque</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {brl(products.reduce((acc, p) => acc + (Number(p.stock_qty) * Number(p.cost || 0)), 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Baseado no preço de custo</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar produto por nome ou SKU..." 
            className="pl-9" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2" onClick={() => toast.info("Funcionalidade de Relatório em breve")}>
          <History className="size-4" /> Histórico
        </Button>
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando estoque...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            Nenhum produto encontrado.
          </div>
        ) : (
          filtered.map(p => (
            <Card key={p.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="size-12 rounded-lg bg-accent grid place-items-center shrink-0">
                <Package className="size-6 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  {p.track_stock && Number(p.stock_qty) <= Number(p.stock_min) && (
                    <Badge variant="destructive" className="h-5 text-[10px] uppercase gap-1">
                      <AlertTriangle className="size-3" /> Estoque Baixo
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.sku && <span className="mr-2">SKU: {p.sku}</span>}
                  {p.category && <span>Cat: {p.category}</span>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:flex items-center gap-6">
                <div className="text-center md:text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-tight">Qtd. Atual</div>
                  <div className="font-display font-bold text-xl tabular-nums">
                    {p.stock_qty}
                    <span className="text-xs font-normal text-muted-foreground ml-1">un</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Dialog open={adjustmentOpen && selectedProduct?.id === p.id} onOpenChange={(o) => {
                    setAdjustmentOpen(o);
                    if (o) setSelectedProduct(p);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm" className="gap-1">
                        Ajustar
                      </Button>
                    </DialogTrigger>
                    {selectedProduct && (
                      <StockAdjustmentDialog 
                        product={selectedProduct} 
                        onAdjust={(data) => adjustStock.mutate({ ...data, productId: selectedProduct.id })}
                        isPending={adjustStock.isPending}
                      />
                    )}
                  </Dialog>
                  
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`/vendas?tab=products&edit=${p.id}`}>
                      <Edit className="size-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}

function StockAdjustmentDialog({ product, onAdjust, isPending }: { product: any, onAdjust: (d: any) => void, isPending: boolean }) {
  const [type, setType] = useState<'in' | 'out' | 'set'>('in');
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Ajustar Estoque: {product.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant={type === 'in' ? 'default' : 'outline'} 
            onClick={() => setType('in')}
            className="gap-1"
          >
            <ArrowUpRight className="size-4" /> Entrada
          </Button>
          <Button 
            variant={type === 'out' ? 'default' : 'outline'} 
            onClick={() => setType('out')}
            className="gap-1"
          >
            <ArrowDownRight className="size-4" /> Saída
          </Button>
          <Button 
            variant={type === 'set' ? 'default' : 'outline'} 
            onClick={() => setType('set')}
          >
            Definir
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Quantidade</Label>
          <Input 
            type="number" 
            step="0.001" 
            value={quantity} 
            onChange={e => setQuantity(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Motivo / Observação</Label>
          <Input 
            placeholder="Ex: Compra, Perda, Inventário..." 
            value={reason} 
            onChange={e => setReason(e.target.value)}
          />
        </div>

        <div className="p-3 rounded-lg bg-muted text-sm flex justify-between items-center">
          <span>Nova quantidade prevista:</span>
          <span className="font-bold">
            {type === 'in' ? Number(product.stock_qty) + Number(quantity) : 
             type === 'out' ? Number(product.stock_qty) - Number(quantity) : 
             Number(quantity)}
          </span>
        </div>
      </div>
      <DialogFooter>
        <Button 
          onClick={() => onAdjust({ type, quantity: Number(quantity), reason })}
          disabled={isPending || !quantity || Number(quantity) < 0}
        >
          Confirmar Ajuste
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
