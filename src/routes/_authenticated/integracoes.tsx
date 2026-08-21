import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PageContainer } from '@/components/page-header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Globe, Key, RefreshCcw, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/use-current-org';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/integracoes' as any)({
  component: IntegracoesPage,
});

const PLATFORMS = [
  { id: 'shopify', name: 'Shopify', icon: ShoppingBag, color: 'text-[#96bf48]' },
  { id: 'woocommerce', name: 'WooCommerce', icon: Globe, color: 'text-[#96588a]' },
  { id: 'nuvemshop', name: 'Nuvemshop', icon: ShoppingBag, color: 'text-[#00b1ea]' },
  { id: 'mercado_livre', name: 'Mercado Livre', icon: ShoppingBag, color: 'text-[#fff159]' },
];

function IntegracoesPage() {
  const { org } = useCurrentOrg();
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['ecommerce_integrations', org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_integrations' as any)
        .select('*')
        .eq('organization_id', org?.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!org?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase
        .from('ecommerce_integrations' as any)
        .upsert({
          organization_id: org?.id,
          platform: values.platform,
          api_key: values.api_key,
          api_secret: values.api_secret,
          shop_url: values.shop_url,
          is_active: values.is_active,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id, platform' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce_integrations'] });
      toast.success('Integração salva com sucesso!');
      setSelectedPlatform(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar integração: ' + error.message);
    },
  });

  const getIntegration = (platformId: string) => 
    integrations?.find(i => i.platform === platformId);

  return (
    <PageContainer>
      <PageHeader 
        title="Integrações E-commerce" 
        description="Conecte sua loja virtual para sincronizar produtos, estoque e pedidos automaticamente."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {PLATFORMS.map((platform) => {
          const integration = getIntegration(platform.id);
          const isActive = integration?.is_active;

          return (
            <Card key={platform.id} className="relative overflow-hidden group hover:border-primary/50 transition-all shadow-elegant">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${platform.color}`}>
                    <platform.icon className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <CardDescription>Loja Virtual</CardDescription>
                  </div>
                </div>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Ativo" : "Desconectado"}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Sincronize automaticamente seu estoque do LocalPro com sua loja {platform.name}.
                </p>
                {isActive && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <RefreshCcw className="size-3" />
                    Última sincronização: {integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleString() : 'Nunca'}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant={isActive ? "outline" : "default"} 
                  className="w-full"
                  onClick={() => setSelectedPlatform(platform.id)}
                >
                  {isActive ? "Configurar" : "Conectar"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {selectedPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in-fade">
          <Card className="w-full max-w-lg mx-4 shadow-glow ring-1 ring-primary/20">
            <CardHeader>
              <CardTitle>Configurar {PLATFORMS.find(p => p.id === selectedPlatform)?.name}</CardTitle>
              <CardDescription>Insira as credenciais da sua loja para ativar a sincronização.</CardDescription>
            </CardHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              upsertMutation.mutate({
                platform: selectedPlatform,
                shop_url: formData.get('shop_url'),
                api_key: formData.get('api_key'),
                api_secret: formData.get('api_secret'),
                is_active: true,
              });
            }}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shop_url">URL da Loja</Label>
                  <Input 
                    id="shop_url" 
                    name="shop_url" 
                    placeholder="https://minhaloja.com" 
                    defaultValue={getIntegration(selectedPlatform)?.shop_url || ''} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_key">Chave da API (API Key)</Label>
                  <Input 
                    id="api_key" 
                    name="api_key" 
                    type="password"
                    defaultValue={getIntegration(selectedPlatform)?.api_key || ''}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_secret">Segredo da API (API Secret / Token)</Label>
                  <Input 
                    id="api_secret" 
                    name="api_secret" 
                    type="password"
                    defaultValue={getIntegration(selectedPlatform)?.api_secret || ''}
                    required 
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between gap-3">
                <Button type="button" variant="ghost" onClick={() => setSelectedPlatform(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "Salvando..." : "Salvar e Ativar"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
