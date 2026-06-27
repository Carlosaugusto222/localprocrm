import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, Mail, Copy, Trash2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Equipe — LocalPro CRM" }] }),
  component: Team,
});

function Team() {
  const { org } = useCurrentOrg();
  const orgId = org?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: members = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["members", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("organization_members")
        .select("*, profile:profiles(email,full_name)")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  const { data: invites = [] } = useQuery({
    enabled: !!orgId,
    queryKey: ["invites", orgId],
    queryFn: async () => (await supabase.from("invitations").select("*").eq("organization_id", orgId!).is("accepted_at", null).order("created_at", { ascending: false })).data ?? [],
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, patch }: any) => {
      const { error } = await supabase.from("organization_members").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["members"] }); toast.success("Atualizado"); },
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => { await supabase.from("invitations").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });

  return (
    <PageContainer>
      <PageHeader title="Equipe" description="Convide funcionários, defina papéis e comissões."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-1"><UserPlus className="size-4" />Convidar</Button></DialogTrigger>
            <InviteDialog orgId={orgId} onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <h2 className="text-base font-semibold mb-2">Membros ativos</h2>
      <div className="grid gap-2 mb-6">
        {members.map((m: any) => (
          <Card key={m.id} className="p-3 flex items-center gap-3 flex-wrap">
            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-chart-4 grid place-items-center text-primary-foreground font-bold text-sm">
              {(m.profile?.full_name ?? m.profile?.email ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{m.profile?.full_name ?? m.profile?.email}</div>
              <div className="text-xs text-muted-foreground truncate">{m.profile?.email}</div>
            </div>
            <Badge>{m.role === "owner" ? "Dono" : "Funcionário"}</Badge>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Comissão</Label>
              <Input
                type="number" step="0.5" className="w-20 h-8"
                defaultValue={m.commission_rate ?? 0}
                onBlur={e => {
                  const v = Number(e.target.value);
                  if (v !== Number(m.commission_rate ?? 0)) updateMember.mutate({ id: m.id, patch: { commission_rate: v } });
                }}
              />
              <span className="text-xs">%</span>
            </div>
          </Card>
        ))}
      </div>

      {invites.length > 0 && (
        <>
          <h2 className="text-base font-semibold mb-2">Convites pendentes</h2>
          <p className="text-xs text-muted-foreground mb-2">Por segurança, o link só é exibido no momento da criação. Se precisar reenviar, cancele e crie um novo convite.</p>
          <div className="grid gap-2">
            {invites.map((i: any) => (
              <Card key={i.id} className="p-3 flex items-center gap-3 flex-wrap">
                <Mail className="size-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{i.email}</div>
                  <div className="text-xs text-muted-foreground">Expira em {new Date(i.expires_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => cancelInvite.mutate(i.id)}><Trash2 className="size-4" /></Button>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}

function InviteDialog({ orgId, onClose }: { orgId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sem empresa");
      const { data, error } = await supabase.rpc("create_invitation", {
        _org_id: orgId, _email: email, _role: role,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const token = row?.token as string | undefined;
      if (token && typeof window !== "undefined") {
        const url = `${window.location.origin}/auth?invite=${token}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Link copiado — envie ao funcionário agora. Não será exibido novamente.", { duration: 8000 });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invites"] }); toast.success("Convite criado — copie o link e envie"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Convidar funcionário</DialogTitle></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); create.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Email</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Papel</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Funcionário</SelectItem>
              <SelectItem value="owner">Dono / Gerente</SelectItem>
            </SelectContent>
          </Select></div>
        <p className="text-xs text-muted-foreground">Você receberá um link único pra enviar ao funcionário. Ele aceita criando conta com o mesmo email.</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending}>Criar convite</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
