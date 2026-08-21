import { createFileRoute } from '@tanstack/react-router';
import { PageContainer, PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Layout, Globe, Smartphone, Palette, Zap, Check, Sparkles } from 'lucide-react';
import { StoreCatalog } from '@/components/store-catalog';

export const Route = createFileRoute('/_authenticated/loja-propria')({
  component: LojaPropriaPage,
});

function LojaPropriaPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Minha Loja Própria" 
        description="Crie e gerencie sua própria vitrine online integrada ao seu estoque e financeiro."
      />

      <div className="grid gap-6 mt-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-elegant border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Layout className="size-6" />
              </div>
              <div>
                <CardTitle>Status da Loja</CardTitle>
                <CardDescription>Sua loja online está atualmente em modo rascunho.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20 animate-in-fade">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sincronização Completa Ativa</p>
                  <p className="text-xs text-muted-foreground">Nome, descrição, fotos e estoque sincronizados automaticamente com a vitrine.</p>
                </div>
              </div>
              <Badge variant="outline" className="text-success border-success/20 bg-success/5">
                <Check className="size-3 mr-1" /> Sincronizado
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border bg-muted/30 text-center">
                <Globe className="size-5 mx-auto mb-2 text-muted-foreground" />
                <span className="text-xs font-medium block">Domínio</span>
                <span className="text-[10px] text-muted-foreground">Não configurado</span>
              </div>
              <div className="p-4 rounded-xl border bg-muted/30 text-center">
                <Palette className="size-5 mx-auto mb-2 text-muted-foreground" />
                <span className="text-xs font-medium block">Tema</span>
                <span className="text-[10px] text-muted-foreground">Modern Dark</span>
              </div>
              <div className="p-4 rounded-xl border bg-muted/30 text-center">
                <Smartphone className="size-5 mx-auto mb-2 text-muted-foreground" />
                <span className="text-xs font-medium block">Mobile</span>
                <span className="text-[10px] text-success">Otimizado</span>
              </div>
              <div className="p-4 rounded-xl border bg-muted/30 text-center">
                <Zap className="size-5 mx-auto mb-2 text-muted-foreground" />
                <span className="text-xs font-medium block">SEO</span>
                <span className="text-[10px] text-muted-foreground">Pendente</span>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="font-display font-semibold">Configurações Básicas</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shop-name">Nome da Loja</Label>
                  <Input id="shop-name" placeholder="Ex: Minha Boutique Online" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-subdomain">Subdomínio LocalPro</Label>
                  <div className="flex items-center">
                    <Input id="shop-subdomain" placeholder="minha-loja" className="rounded-r-none" />
                    <div className="bg-muted px-3 h-10 border border-l-0 rounded-r-md flex items-center text-xs text-muted-foreground">
                      .localprocrm.com
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 flex justify-end gap-3">
            <Button variant="outline">Visualizar Loja</Button>
            <Button>Publicar Agora</Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg">Recursos Inclusos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Catálogo de produtos automático",
                "Gestão de pedidos centralizada",
                "Cálculo de frete integrado",
                "Pagamentos via Pix, Cartão e Boleto",
                "Carrinho de compras inteligente",
                "Otimização para Google (SEO)",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="size-5 rounded-full bg-success/10 text-success grid place-items-center">
                    <Check className="size-3" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Dica da IA
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Lojas com domínio próprio (.com.br) convertem até 45% mais do que subdomínios gratuitos. Considere registrar o seu hoje!
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
