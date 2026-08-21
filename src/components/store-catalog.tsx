import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Package, Search, CloudOff, Tag, Wrench } from "lucide-react";

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  kind: string;
  price: number;
  sku: string | null;
  stock_qty: number;
  track_stock: boolean;
  duration_minutes: number | null;
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

export function StoreCatalog() {
  const { org } = useCurrentOrg();
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string>("all");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["store-catalog", org?.id],
    enabled: !!org?.id,
    queryFn: async (): Promise<CatalogItem[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,category,kind,price,sku,stock_qty,track_stock,duration_minutes")
        .eq("organization_id", org!.id)
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogItem[];
    },
  });

  const categories = useMemo(() => {
    const set = new Set((data ?? []).map((i) => i.category).filter(Boolean) as string[]);
    return ["all", ...Array.from(set).sort()];
  }, [data]);

  const items = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (data ?? []).filter((i) => {
      const matchesCat = category === "all" || i.category === category;
      const matchesTerm =
        !t ||
        i.name.toLowerCase().includes(t) ||
        (i.sku ?? "").toLowerCase().includes(t) ||
        (i.description ?? "").toLowerCase().includes(t);
      return matchesCat && matchesTerm;
    });
  }, [data, term, category]);

  const total = data?.length ?? 0;
  const outOfStock = (data ?? []).filter((i) => i.track_stock && i.stock_qty <= 0).length;

  return (
    <Card className="shadow-elegant animate-in-fade">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Package className="size-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Catálogo Automático</CardTitle>
              <CardDescription>
                Gerado a partir dos seus produtos e serviços ativos, com preços atuais.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{total} itens na vitrine</Badge>
            {outOfStock > 0 && (
              <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5">
                {outOfStock} sem estoque
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por nome ou SKU..."
              className="pl-9"
              aria-label="Buscar itens do catálogo"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={category === c ? "default" : "outline"}
                className="h-8 transition-all duration-200"
                onClick={() => setCategory(c)}
              >
                {c === "all" ? "Todos" : c}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        )}

        {isError && (
          <div className="py-10 text-center space-y-3">
            <CloudOff className="size-8 mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar o catálogo. Verifique sua conexão.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="py-10 text-center space-y-2">
            <Package className="size-8 mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? "Cadastre produtos ou serviços no Estoque para que apareçam automaticamente aqui."
                : "Nenhum item encontrado para esse filtro."}
            </p>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => {
              const isService = item.kind === "service";
              const unavailable = item.track_stock && item.stock_qty <= 0;
              return (
                <div
                  key={item.id}
                  className="group rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-elegant hover:-translate-y-0.5 animate-in-slide-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="h-24 bg-gradient-to-br from-primary/15 to-primary/5 grid place-items-center">
                    {isService ? (
                      <Wrench className="size-7 text-primary/70" aria-hidden="true" />
                    ) : (
                      <Package className="size-7 text-primary/70" aria-hidden="true" />
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium leading-tight line-clamp-2">{item.name}</h4>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {isService ? "Serviço" : "Produto"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                      {item.description || "Sem descrição cadastrada."}
                    </p>
                    <div className="flex items-end justify-between pt-1">
                      <span className="font-display text-lg font-semibold">{brl(Number(item.price))}</span>
                      {isService ? (
                        item.duration_minutes ? (
                          <span className="text-[11px] text-muted-foreground">{item.duration_minutes} min</span>
                        ) : null
                      ) : (
                        <span
                          className={`text-[11px] ${unavailable ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {item.track_stock ? `${item.stock_qty} em estoque` : "Disponível"}
                        </span>
                      )}
                    </div>
                    {item.sku && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Tag className="size-3" aria-hidden="true" />
                        {item.sku}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
