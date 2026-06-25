import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Zap, Mail, Lock, User, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — LocalPro CRM" },
      { name: "description", content: "Entre na sua conta LocalPro CRM." },
    ],
  }),
  component: AuthPage,
});

const SEGMENTS = [
  { v: "generic", l: "Outro / Genérico" },
  { v: "barbershop", l: "Barbearia" },
  { v: "salon", l: "Salão de Beleza" },
  { v: "clinic", l: "Clínica" },
  { v: "office", l: "Consultório" },
  { v: "auto", l: "Oficina Mecânica" },
  { v: "restaurant", l: "Restaurante" },
  { v: "hotel", l: "Hotel / Pousada" },
  { v: "realestate", l: "Imobiliária" },
  { v: "law", l: "Advocacia" },
  { v: "solar", l: "Energia Solar" },
  { v: "gym", l: "Academia" },
  { v: "services", l: "Prestador de Serviços" },
];

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [segment, setSegment] = useState("generic");
  const [tab, setTab] = useState<"signin" | "signup" | "recover">("signin");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, organization_name: orgName, segment },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Você já pode entrar.");
    setTab("signin");
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um link de recuperação para o seu email.");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Não foi possível entrar com o Google.");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary via-chart-4 to-chart-1 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
        <Link to="/" className="flex items-center gap-2 relative">
          <div className="size-9 rounded-lg bg-white/15 backdrop-blur grid place-items-center">
            <Zap className="size-5" />
          </div>
          <span className="font-display font-bold text-xl">LocalPro CRM</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-display font-bold leading-tight">Gestão completa para o seu negócio local.</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-md">CRM, agenda, financeiro, vendas e IA. Tudo modular, tudo personalizável.</p>
        </div>
        <div className="text-xs text-primary-foreground/60 relative">© {new Date().getFullYear()} LocalPro CRM</div>
      </div>

      {/* Right form */}
      <div className="flex flex-col justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm mx-auto">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 grid place-items-center text-primary-foreground">
              <Zap className="size-4" />
            </div>
            <span className="font-display font-bold">LocalPro CRM</span>
          </Link>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
              <TabsTrigger value="recover">Recuperar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <h1 className="text-2xl font-display font-bold mt-6">Bem-vindo de volta</h1>
              <p className="text-sm text-muted-foreground mt-1">Acesse sua conta para continuar.</p>
              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} required />
                <Field icon={Lock} label="Senha" type="password" value={password} onChange={setPassword} required />
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"} <ArrowRight className="size-4 ml-1" /></Button>
              </form>
              <Divider />
              <Button variant="outline" onClick={handleGoogle} className="w-full" type="button">
                Entrar com Google
              </Button>
            </TabsContent>

            <TabsContent value="signup">
              <h1 className="text-2xl font-display font-bold mt-6">Crie sua conta</h1>
              <p className="text-sm text-muted-foreground mt-1">Comece grátis em menos de 1 minuto.</p>
              <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                <Field icon={User} label="Seu nome" value={fullName} onChange={setFullName} required />
                <Field icon={Building2} label="Nome da empresa" value={orgName} onChange={setOrgName} required />
                <div className="space-y-1.5">
                  <Label>Segmento</Label>
                  <Select value={segment} onValueChange={setSegment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEGMENTS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} required />
                <Field icon={Lock} label="Senha (mín. 6 caracteres)" type="password" value={password} onChange={setPassword} required />
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="recover">
              <h1 className="text-2xl font-display font-bold mt-6">Recuperar senha</h1>
              <p className="text-sm text-muted-foreground mt-1">Enviaremos um link para o seu email.</p>
              <form onSubmit={handleRecover} className="mt-6 space-y-4">
                <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} required />
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar link"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, type = "text", required }: { icon: React.ComponentType<{className?: string}>; label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Icon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
    </div>
  );
}
