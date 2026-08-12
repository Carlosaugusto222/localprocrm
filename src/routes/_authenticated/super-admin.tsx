import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, TrendingUp, Crown, ShieldAlert, Trash2, Edit2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => ({ meta: [{ title: "Super Admin — LocalPro CRM" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: SuperAdmin,
});

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  segment: string | null;
  created_at: string;
  owner_id: string;
};

const PLAN_TONE: Record<string, "default" | "secondary" | "outline"> = {
  basic: "outline",
  pro: "secondary",
  premium: "default",
};

function SuperAdmin() {
  const qc = useQueryClient();
  const { data: orgs = [], isLoading: lo } = useQuery({
    queryKey: ["sa-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name,slug,plan,segment,created_at,owner_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrgRow[];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const { error } = await supabase
        .from("organizations")
        .update({ plan: plan as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-orgs"] });
      toast.success("Plano atualizado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteOrg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organizations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-orgs"] });
      toast.success("Empresa excluída permanentemente");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: counts } = useQuery({
    queryKey: ["sa-counts"],
    queryFn: async () => {
      const [members, customers, txs] = await Promise.all([
        supabase.from("organization_members").select("user_id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("transactions").select("amount,kind").eq("kind", "income"),
      ]);
      const revenue = (txs.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      return {
        users: members.count ?? 0,
        customers: customers.count ?? 0,
        revenue,
      };
    },
  });

  const planBreakdown = orgs.reduce<Record<string, number>>((acc, o) => {
    acc[o.plan] = (acc[o.plan] ?? 0) + 1;
    return acc;
  }, {});

  const brl = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <PageContainer>
      <PageHeader
        title="Super Admin"
        description="Métricas globais de todas as empresas na plataforma."
        actions={
          <Badge className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" variant="outline">
            <ShieldAlert className="size-3" /> Acesso restrito
          </Badge>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Building2} label="Empresas" value={orgs.length.toString()} />
        <StatCard icon={Users} label="Usuários" value={String(counts?.users ?? 0)} />
        <StatCard icon={TrendingUp} label="Clientes (total)" value={String(counts?.customers ?? 0)} />
        <StatCard icon={Crown} label="Receita agregada" value={brl(counts?.revenue ?? 0)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {(["basic", "pro", "premium"] as const).map(plan => (
          <Card key={plan}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground capitalize">Plano {plan}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">{planBreakdown[plan] ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">empresas ativas</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empresas cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lo && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell>
                  </TableRow>
                )}
                {!lo && orgs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma empresa.</TableCell>
                  </TableRow>
                )}
                {orgs.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{o.slug}</TableCell>
                    <TableCell>{o.segment ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={PLAN_TONE[o.plan] ?? "outline"} className="capitalize">{o.plan}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(o.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-display font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
