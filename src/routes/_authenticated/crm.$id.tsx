import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, MapPin, FileText } from "lucide-react";
import { PageContainer } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/crm/$id")({
  head: () => ({ meta: [{ title: "Cliente — LocalPro CRM" }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = useParams({ from: "/_authenticated/crm/$id" });

  const { data: customer } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["customer-appts", id],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*").eq("customer_id", id).order("starts_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["customer-sales", id],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("*").eq("customer_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!customer) return <PageContainer><p>Carregando...</p></PageContainer>;

  return (
    <PageContainer>
      <Link to="/crm"><Button variant="ghost" size="sm" className="gap-1 mb-4"><ArrowLeft className="size-4" /> Voltar</Button></Link>

      <div className="flex items-start gap-4 mb-6">
        <div className="size-16 rounded-full bg-gradient-to-br from-primary to-chart-4 grid place-items-center text-2xl font-bold text-primary-foreground">
          {customer.name.slice(0,1).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold">{customer.name}</h1>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge>{customer.status}</Badge>
            <Badge variant="outline">Etapa: {customer.pipeline_stage}</Badge>
            {customer.tags?.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {customer.phone && <Info icon={Phone} v={customer.phone} />}
            {customer.email && <Info icon={Mail} v={customer.email} />}
            {customer.address && <Info icon={MapPin} v={customer.address} />}
            {customer.document && <Info icon={FileText} v={customer.document} />}
            {customer.notes && <p className="pt-3 border-t text-muted-foreground">{customer.notes}</p>}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
          <CardContent>
            <h3 className="text-sm font-semibold mb-2">Agendamentos ({appointments.length})</h3>
            {appointments.length === 0 ? <p className="text-sm text-muted-foreground mb-4">Nenhum agendamento.</p> : (
              <ul className="space-y-2 mb-4">
                {appointments.slice(0, 5).map((a: any) => (
                  <li key={a.id} className="text-sm flex justify-between p-2 rounded bg-muted/30">
                    <span>{a.title}</span>
                    <span className="text-muted-foreground">{format(new Date(a.starts_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="text-sm font-semibold mb-2 pt-3 border-t">Vendas ({sales.length})</h3>
            {sales.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma venda.</p> : (
              <ul className="space-y-2">
                {sales.slice(0, 5).map((s: any) => (
                  <li key={s.id} className="text-sm flex justify-between p-2 rounded bg-muted/30">
                    <span>{s.status}</span>
                    <span>{Number(s.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function Info({ icon: Icon, v }: { icon: React.ComponentType<{className?: string}>; v: string }) {
  return <div className="flex items-center gap-2"><Icon className="size-4 text-muted-foreground" /><span>{v}</span></div>;
}
