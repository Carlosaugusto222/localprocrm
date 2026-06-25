import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Phone, Mail as MailIcon, Tag, Trash2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({ meta: [{ title: "Clientes — LocalPro CRM" }] }),
  component: CRM,
});

type Customer = {
  id: string; name: string; phone: string | null; email: string | null;
  whatsapp: string | null; document: string | null; address: string | null;
  notes: string | null; tags: string[]; status: "lead" | "active" | "inactive";
  pipeline_stage: string;
};

const STATUS_LABEL = { lead: "Lead", active: "Ativo", inactive: "Inativo" };
const STATUS_COLOR: Record<string, "default" | "secondary" | "outline"> = { lead: "outline", active: "default", inactive: "secondary" };

function CRM() {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    enabled: !!org,
    queryKey: ["customers", org?.id, search, statusFilter],
    queryFn: async () => {
      let q = supabase.from("customers").select("*").eq("organization_id", org!.id).order("created_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as Customer["status"]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast.success("Cliente removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader title="Clientes" description="Gerencie sua base de clientes e leads."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-1"><Plus className="size-4" /> Novo cliente</Button></DialogTrigger>
            <CustomerDialog orgId={org?.id} onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
       customers.length === 0 ? <EmptyState onAdd={() => setOpen(true)} /> : (
        <div className="grid gap-3">
          {customers.map(c => (
            <Card key={c.id} className="p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-full bg-accent grid place-items-center font-semibold text-accent-foreground">
                  {c.name.slice(0,1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to="/crm/$id" params={{ id: c.id }} className="font-semibold hover:underline">{c.name}</Link>
                    <Badge variant={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                    {c.tags.map(t => <Badge key={t} variant="outline" className="gap-1"><Tag className="size-3" />{t}</Badge>)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 flex gap-4 flex-wrap">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><MailIcon className="size-3" />{c.email}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover cliente?")) del.mutate(c.id); }}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 border-2 border-dashed rounded-2xl">
      <h3 className="font-display font-semibold text-lg">Nenhum cliente ainda</h3>
      <p className="text-sm text-muted-foreground mt-1">Comece cadastrando seu primeiro cliente.</p>
      <Button className="mt-4 gap-1" onClick={onAdd}><Plus className="size-4" /> Novo cliente</Button>
    </div>
  );
}

function CustomerDialog({ orgId, onClose }: { orgId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", phone: "", whatsapp: "", email: "", document: "",
    address: "", notes: "", tags: "", status: "lead" as Customer["status"],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sem empresa");
      const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
      const { error } = await supabase.from("customers").insert({
        organization_id: orgId,
        name: form.name, phone: form.phone || null, whatsapp: form.whatsapp || null,
        email: form.email || null, document: form.document || null,
        address: form.address || null, notes: form.notes || null,
        tags, status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast.success("Cliente criado"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as Customer["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Telefone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <Field label="WhatsApp" value={form.whatsapp} onChange={v => setForm({ ...form, whatsapp: v })} />
          <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
          <Field label="CPF/CNPJ" value={form.document} onChange={v => setForm({ ...form, document: v })} />
        </div>
        <Field label="Endereço" value={form.address} onChange={v => setForm({ ...form, address: v })} />
        <Field label="Tags (separadas por vírgula)" value={form.tags} onChange={v => setForm({ ...form, tags: v })} />
        <div className="space-y-1.5"><Label>Observações</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
