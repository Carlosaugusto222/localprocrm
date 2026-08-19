import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 animate-in-slide-up">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">{children}</div>;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px] bg-muted/20 rounded-2xl border border-dashed">
          <AlertCircle className="size-10 text-destructive mb-4" />
          <h2 className="text-lg font-bold mb-2">Ops! Algo deu errado.</h2>
          <p className="text-sm text-muted-foreground mb-4">Não conseguimos carregar esta parte do sistema agora.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4 mr-2" /> Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
