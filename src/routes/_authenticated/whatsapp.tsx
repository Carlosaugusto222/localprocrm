import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquare, Settings, Search, Send, User, Bot, History, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp AI — LocalPro CRM" }] }),
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const { org } = useCurrentOrg();
  const [activeTab, setActiveTab] = useState("inbox");

  return (
    <PageContainer>
      <PageHeader 
        title="WhatsApp AI" 
        description="Gerencie seu atendimento automatizado com IA e chat oficial."
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="inbox" className="gap-2">
            <MessageSquare className="size-4" /> Caixa de Entrada
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="size-4" /> Configuração
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          <WhatsAppInbox />
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <WhatsAppConfig />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function WhatsAppInbox() {
  const { org } = useCurrentOrg();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [msgInput, setMsgInput] = useState("");

  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    enabled: !!org,
    queryKey: ["wa-conversations", org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_conversations")
        .select(`
          id, 
          status, 
          last_message_at,
          customer:customers(id, name, phone)
        `)
        .eq("organization_id", org!.id)
        .order("last_message_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    enabled: !!selectedConv,
    queryKey: ["wa-messages", selectedConv],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_messages")
        .select("*")
        .eq("conversation_id", selectedConv!)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4 h-[calc(100vh-280px)] min-h-[500px]">
      {/* Sidebar List */}
      <Card className="flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Buscar conversa..." className="pl-9" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv.id)}
                className={`w-full text-left p-3 rounded-xl transition-colors flex gap-3 ${
                  selectedConv === conv.id ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <User className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{conv.customer?.name || "Cliente"}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {conv.last_message_at ? format(new Date(conv.last_message_at), "HH:mm") : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{conv.customer?.phone}</p>
                    <Badge variant={conv.status === 'bot' ? 'secondary' : 'default'} className="text-[9px] h-4 px-1">
                      {conv.status === 'bot' ? 'IA' : 'Humano'}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
            {!loadingConvs && conversations.length === 0 && (
              <div className="text-center py-10 px-4">
                <MessageSquare className="size-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex flex-col overflow-hidden bg-accent/5">
        {selectedConv ? (
          <>
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {conversations.find(c => c.id === selectedConv)?.customer?.name || "Cliente"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="size-1.5 rounded-full bg-success animate-pulse" />
                      Online
                    </span>
                    <span>•</span>
                    <span>{conversations.find(c => c.id === selectedConv)?.customer?.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Bot className="size-4" /> Assumir IA
                </Button>
              </div>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.direction === 'in' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                    msg.direction === 'in' 
                      ? 'bg-card rounded-tl-none' 
                      : 'bg-primary text-primary-foreground rounded-tr-none'
                  }`}>
                    {msg.direction === 'out' && msg.ai_used && (
                      <div className="flex items-center gap-1 text-[10px] opacity-70 mb-1">
                        <Bot className="size-3" /> Resposta IA
                      </div>
                    )}
                    <p className="text-sm">{msg.text}</p>
                    <div className={`text-[10px] mt-1 opacity-50 flex items-center ${msg.direction === 'in' ? 'justify-start' : 'justify-end'}`}>
                      {format(new Date(msg.created_at), "HH:mm")}
                    </div>
                  </div>
                </div>
              ))}
              {loadingMsgs && <div className="text-center text-xs text-muted-foreground">Carregando mensagens...</div>}
            </div>

            <div className="p-4 bg-card border-t">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.info("Funcionalidade de envio manual em implementação");
                }}
                className="flex gap-2"
              >
                <Input 
                  placeholder="Digite sua mensagem..." 
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <div className="size-16 rounded-full bg-accent flex items-center justify-center mb-4">
              <MessageSquare className="size-8" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Sua Caixa de Entrada</h3>
            <p className="max-w-xs mt-2 text-sm">
              Selecione uma conversa ao lado para visualizar o histórico e interagir com o cliente.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function WhatsAppConfig() {
  const { org } = useCurrentOrg();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const { data: channel, refetch } = useQuery({
    enabled: !!org,
    queryKey: ["wa-channel", org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_channels")
        .select("*")
        .eq("organization_id", org!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  const saveConfig = useMutation({
    mutationFn: async (values: any) => {
      setLoading(true);
      const { error } = await supabase
        .from("wa_channels")
        .upsert({
          organization_id: org!.id,
          ...values,
          updated_at: new Date().toISOString(),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      refetch();
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
    onSettled: () => setLoading(false)
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const values = Object.fromEntries(formData.entries());
    saveConfig.mutate(values);
  };

  const webhookUrl = `https://localprocrm.lovable.app/api/public/wa/webhook`;
  const verifyToken = channel?.verify_token || "lp_" + Math.random().toString(36).substring(7);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Settings className="size-5 text-primary" /> Credenciais da Meta API
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number ID</label>
                <Input name="phone_number_id" defaultValue={channel?.phone_number_id || ""} placeholder="Ex: 105672839485" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp Business Account ID</label>
                <Input name="waba_id" defaultValue={channel?.waba_id || ""} placeholder="Ex: 928374650192" required />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Access Token Permanente (System User)</label>
              <Input name="access_token" type="password" defaultValue={channel?.access_token || ""} placeholder="EAABw..." required />
              <p className="text-[10px] text-muted-foreground italic">Use um token de longa duração gerado no painel do desenvolvedor Meta.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">App Secret</label>
              <Input name="app_secret" type="password" defaultValue={channel?.app_secret || ""} placeholder="Chave secreta do app" required />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" name="enabled" defaultChecked={channel?.enabled} className="size-4" />
                <label className="text-sm font-medium">Canal Ativado</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="auto_reply" defaultChecked={channel?.auto_reply} className="size-4" />
                <label className="text-sm font-medium">Auto-resposta IA</label>
              </div>
            </div>

            <input type="hidden" name="verify_token" value={verifyToken} />

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <History className="size-5 text-primary" /> Webhook para Meta
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Callback URL</label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="bg-muted" />
                <Button variant="outline" size="icon" onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success("URL copiada!");
                }}>
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Verify Token</label>
              <div className="flex gap-2">
                <Input readOnly value={verifyToken} className="bg-muted" />
                <Button variant="outline" size="icon" onClick={() => {
                  navigator.clipboard.writeText(verifyToken);
                  toast.success("Token copiado!");
                }}>
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 text-blue-700 dark:text-blue-400">
              <AlertCircle className="size-5 shrink-0" />
              <div className="text-xs space-y-2">
                <p className="font-semibold">Como configurar no Meta Developers:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>No seu app Meta, vá em <strong>WhatsApp &gt; Configuration</strong>.</li>
                  <li>Clique em <strong>Edit</strong> no Webhook.</li>
                  <li>Cole a <strong>Callback URL</strong> e o <strong>Verify Token</strong> acima.</li>
                  <li>Após salvar, em "Webhook fields", clique em <strong>Manage</strong> e assine o campo <strong>messages</strong>.</li>
                </ol>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Status da Conexão</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
              <span className="text-sm">Webhook</span>
              <Badge variant="outline" className="text-success border-success/30 bg-success/5 gap-1">
                <CheckCircle2 className="size-3" /> Ativo
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
              <span className="text-sm">Meta API</span>
              <Badge variant="outline" className={channel?.phone_number_id ? "text-success border-success/30 bg-success/5" : "text-muted-foreground"}>
                {channel?.phone_number_id ? "Configurado" : "Pendente"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
              <span className="text-sm">Auto-resposta</span>
              <Badge variant={channel?.auto_reply ? "default" : "secondary"}>
                {channel?.auto_reply ? "Ligado" : "Desligado"}
              </Badge>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-6" onClick={() => toast.info("Em breve: Testar conexão")}>
            Testar Conexão
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Dicas de Uso</h3>
          <ul className="text-xs text-muted-foreground space-y-3 list-disc pl-4">
            <li>O bot responde automaticamente usando Gemini AI baseado no contexto do seu negócio.</li>
            <li>Quando você responde manualmente, a IA é pausada por 24h para aquela conversa.</li>
            <li>Você pode "Devolver para IA" a qualquer momento no chat.</li>
            <li>Mantenha seu <strong>Access Token</strong> atualizado para evitar interrupções.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
