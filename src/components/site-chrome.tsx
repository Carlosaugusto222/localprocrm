import { Link } from "@tanstack/react-router";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 surface-glass">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 grid place-items-center text-primary-foreground">
            <Zap className="size-4" />
          </div>
          <span className="font-display font-bold text-lg">LocalPro <span className="text-muted-foreground">CRM</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/recursos" className="hover:text-foreground">Recursos</Link>
          <Link to="/segmentos" className="hover:text-foreground">Segmentos</Link>
          <Link to="/precos" className="hover:text-foreground">Planos</Link>
          <Link to="/contato" className="hover:text-foreground">Contato</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
          <Link to="/auth"><Button size="sm" className="gap-1">Criar conta <ArrowRight className="size-3.5" /></Button></Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-display font-bold text-base mb-2">LocalPro CRM</div>
          <p className="text-muted-foreground">Plataforma modular de gestão para negócios locais.</p>
        </div>
        <div>
          <div className="font-semibold mb-2">Produto</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link to="/recursos" className="hover:text-foreground">Recursos</Link></li>
            <li><Link to="/precos" className="hover:text-foreground">Planos</Link></li>
            <li><Link to="/segmentos" className="hover:text-foreground">Segmentos</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Empresa</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link to="/contato" className="hover:text-foreground">Contato</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Conta</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Entrar / Criar conta</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LocalPro CRM. Todos os direitos reservados.
      </div>
    </footer>
  );
}
