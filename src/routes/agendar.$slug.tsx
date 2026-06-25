import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, Check, MapPin, Phone, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/agendar/$slug")({
  head: ({ params }) => ({ meta: [{ title: `Agendar online — ${params.slug}` }] }),
  component: PublicBooking,
});

function PublicBooking() {
  const { slug } = Route.useParams();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [contact, setContact] = useState({ name: "", phone: "", notes: "" });
  const [done, setDone] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ["public-org", slug],
    queryFn: async () => (await supabase.from("organizations")
      .select("id,name,slug,phone,address,city,state,logo_url,primary_color,public_booking_enabled")
      .eq("slug", slug).eq("public_booking_enabled", true).maybeSingle()).data,
  });

  const { data: services = [] } = useQuery({
    enabled: !!org?.id,
    queryKey: ["public-services", org?.id],
    queryFn: async () => (await supabase.from("products")
      .select("id,name,description,price,duration_minutes,kind")
      .eq("organization_id", org!.id).eq("active", true)).data ?? [],
  });

  const book = useMutation({
    mutationFn: async () => {
      if (!org || !selected) return;
      const start = new Date(`${date}T${time}:00`);
      const end = new Date(start.getTime() + (selected.duration_minutes ?? 60) * 60000);
      const { data: customer } = await supabase.from("customers").insert({
        organization_id: org.id, name: contact.name, phone: contact.phone, source: "public_booking",
      }).select().single();
      await supabase.from("appointments").insert({
        organization_id: org.id, customer_id: customer?.id,
        title: selected.name, product_id: selected.id,
        starts_at: start.toISOString(), ends_at: end.toISOString(),
        duration_minutes: selected.duration_minutes ?? 60,
        status: "scheduled", notes: contact.notes, source: "public_booking",
      });
      await supabase.from("notifications").insert({
        organization_id: org.id, type: "new_booking",
        title: "Novo agendamento online", body: `${contact.name} agendou ${selected.name}`, link: "/agenda",
      });
    },
    onSuccess: () => { setDone(true); toast.success("Agendamento solicitado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  if (!org) return <div className="min-h-screen grid place-items-center text-center p-6">
    <div>
      <h1 className="text-2xl font-display font-bold mb-2">Página indisponível</h1>
      <p className="text-muted-foreground">Esta empresa não está aceitando agendamentos online.</p>
    </div>
  </div>;

  if (done) return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-primary/5 via-background to-background">
      <Card className="max-w-md w-full"><CardContent className="p-8 text-center">
        <div className="size-16 mx-auto rounded-full bg-emerald-500/10 grid place-items-center mb-4">
          <Check className="size-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">Pronto, {contact.name}!</h1>
        <p className="text-muted-foreground mb-6">Recebemos sua solicitação. Em breve {org.name} confirma seu horário.</p>
        <div className="text-sm bg-muted/40 rounded-lg p-3 text-left">
          <div><strong>{selected?.name}</strong></div>
          <div className="text-muted-foreground">{new Date(`${date}T${time}`).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}</div>
        </div>
      </CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <header className="text-center mb-6">
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="size-16 mx-auto rounded-2xl object-cover shadow-lg mb-3" />
          ) : (
            <div className="size-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-chart-4 grid place-items-center text-primary-foreground shadow-lg mb-3">
              <Sparkles className="size-7" />
            </div>
          )}
          <h1 className="text-3xl font-display font-bold">{org.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Agende seu horário online</p>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
            {org.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{org.phone}</span>}
            {(org.city || org.address) && <span className="flex items-center gap-1"><MapPin className="size-3" />{[org.address, org.city].filter(Boolean).join(", ")}</span>}
          </div>
        </header>

        <div className="flex items-center justify-center gap-2 mb-4">
          {[0,1,2].map(i => <div key={i} className={`h-1 w-12 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}
        </div>

        <Card><CardContent className="p-5 space-y-4">
          {step === 0 && (
            <>
              <h2 className="font-display font-bold text-lg">Escolha o serviço</h2>
              <div className="grid gap-2">
                {services.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Sem serviços disponíveis no momento.</p>}
                {services.map((s: any) => (
                  <button key={s.id} onClick={() => { setSelected(s); setStep(1); }}
                    className="text-left p-3 rounded-lg border-2 border-border hover:border-primary transition-all flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{s.name}</div>
                      {s.description && <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>}
                      <div className="text-xs text-muted-foreground mt-1">{s.duration_minutes ?? 60} min</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold">{Number(s.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && selected && (
            <>
              <h2 className="font-display font-bold text-lg">Quando?</h2>
              <p className="text-sm text-muted-foreground"><strong>{selected.name}</strong> · {selected.duration_minutes ?? 60} min</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Data</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} /></div>
                <div className="space-y-1.5"><Label>Horário</Label>
                  <Input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>Voltar</Button>
                <Button className="flex-1" onClick={() => setStep(2)} disabled={!date}>Continuar</Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display font-bold text-lg">Seus dados</h2>
              <div className="space-y-1.5"><Label>Nome *</Label>
                <Input value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>WhatsApp *</Label>
                <Input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} placeholder="(11) 91234-5678" required /></div>
              <div className="space-y-1.5"><Label>Observação</Label>
                <Textarea rows={2} value={contact.notes} onChange={e => setContact({ ...contact, notes: e.target.value })} /></div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <Button className="flex-1" onClick={() => book.mutate()} disabled={!contact.name || !contact.phone || book.isPending}>
                  <Calendar className="size-4 mr-2" />{book.isPending ? "Enviando..." : "Confirmar"}
                </Button>
              </div>
            </>
          )}
        </CardContent></Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <span className="font-semibold">LocalPro CRM</span>
        </p>
      </div>
    </div>
  );
}
