import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — LocalPro CRM" }] }),
  component: Reports,
});

function brl(n: number) { return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Reports() {
  const { org } = useCurrentOrg();
  const orgId = org?.id;

  const { data: txs = [] } = useQuery({ enabled: !!orgId, queryKey: ["rep-tx", orgId], queryFn: async () => (await supabase.from("transactions").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false })).data ?? [] });
  const { data: customers = [] } = useQuery({ enabled: !!orgId, queryKey: ["rep-cust", orgId], queryFn: async () => (await supabase.from("customers").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false })).data ?? [] });
  const { data: appts = [] } = useQuery({ enabled: !!orgId, queryKey: ["rep-appt", orgId], queryFn: async () => (await supabase.from("appointments").select("*").eq("organization_id", orgId!).order("starts_at", { ascending: false })).data ?? [] });
  const { data: sales = [] } = useQuery({ enabled: !!orgId, queryKey: ["rep-sales", orgId], queryFn: async () => (await supabase.from("sales").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false })).data ?? [] });

  return (
    <PageContainer>
      <PageHeader title="Relatórios" description="Análise detalhada do seu negócio." />
      <Tabs defaultValue="finance">
        <TabsList>
          <TabsTrigger value="finance">Financeiro</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="appts">Agenda</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="finance"><ReportTable title="Financeiro" rows={txs} cols={["created_at","kind","description","category","amount"]} format={{ created_at: (v) => format(new Date(v), "dd/MM/yyyy", { locale: ptBR }), amount: brl, kind: (v) => v === "income" ? "Receita" : "Despesa" }} /></TabsContent>
        <TabsContent value="customers"><ReportTable title="Clientes" rows={customers} cols={["name","phone","email","status","created_at"]} format={{ created_at: (v) => format(new Date(v), "dd/MM/yyyy", { locale: ptBR }) }} /></TabsContent>
        <TabsContent value="appts"><ReportTable title="Agendamentos" rows={appts} cols={["title","starts_at","status"]} format={{ starts_at: (v) => format(new Date(v), "dd/MM/yyyy HH:mm", { locale: ptBR }) }} /></TabsContent>
        <TabsContent value="sales"><ReportTable title="Vendas" rows={sales} cols={["status","total","created_at"]} format={{ total: brl, created_at: (v) => format(new Date(v), "dd/MM/yyyy", { locale: ptBR }) }} /></TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function ReportTable({ title, rows, cols, format: fmt }: { title: string; rows: any[]; cols: string[]; format?: Record<string, (v: any) => string> }) {
  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => exportCSV(rows, `${title.toLowerCase()}.csv`)}>
          <Download className="size-4" /> Exportar CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>{cols.map(c => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.id ?? i}>
                  {cols.map(c => <TableCell key={c}>{fmt?.[c] ? fmt[c](r[c]) : String(r[c] ?? "")}</TableCell>)}
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={cols.length} className="text-center text-muted-foreground py-8">Sem dados.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
