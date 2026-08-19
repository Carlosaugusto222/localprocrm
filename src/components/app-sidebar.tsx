import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Calendar, Wallet, ShoppingBag,
  MessageCircle, Sparkles, BarChart3, Settings, Zap, Kanban, ShieldCheck, BookOpen, Sun,
  Wrench, Banknote, UserCog, ScanLine, Home, CalendarDays, Bot, KeyRound,
  Package,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useEnabledModules } from "@/hooks/use-current-org";
import { useIsSuperAdmin } from "@/hooks/use-is-super-admin";

type Item = { title: string; url: string; icon: typeof Sun; module?: string };

const diaADia: Item[] = [
  { title: "Início", url: "/inicio", icon: Home },
  { title: "Planejamento", url: "/planejamento", icon: CalendarDays },
  { title: "Hoje", url: "/hoje", icon: Sun },
  { title: "Agenda", url: "/agenda", icon: Calendar, module: "appointments" },
  { title: "PDV — Balcão", url: "/pdv", icon: ScanLine, module: "sales" },
  { title: "Vendas", url: "/vendas", icon: ShoppingBag, module: "sales" },
  { title: "Ordens de Serviço", url: "/os", icon: Wrench, module: "service_orders" },
  { title: "Caixa", url: "/caixa", icon: Banknote, module: "cash" },
  { title: "Estoque", url: "/estoque", icon: Package, module: "sales" },
  { title: "Clientes", url: "/crm", icon: Users, module: "crm" },
  { title: "Funil", url: "/funil", icon: Kanban, module: "crm" },
  { title: "WhatsApp AI", url: "/whatsapp", icon: Bot, module: "whatsapp" },
];

const gestao: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, module: "finance" },
  { title: "Equipe", url: "/equipe", icon: UserCog, module: "team" },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, module: "reports" },
  { title: "Assistente IA", url: "/ia", icon: Sparkles, module: "ai" },
  
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: r => r.location.pathname });
  const isEnabled = useEnabledModules();
  const isSuperAdmin = useIsSuperAdmin();

  const renderItems = (list: Item[]) =>
    list
      .filter(i => !i.module || isEnabled(i.module))
      .map(item => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={pathname === item.url || pathname.startsWith(item.url + "/")}>
            <Link to={item.url} className="flex items-center gap-2">
              <item.icon className="size-4" aria-hidden="true" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/inicio" className="flex items-center gap-2 px-2 py-1.5">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 grid place-items-center text-primary-foreground shadow-sm">
            <Zap className="size-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-sm">LocalPro</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">CRM</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dia a dia</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{renderItems(diaADia)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{renderItems(gestao)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/guia")}>
                  <Link to="/guia" className="flex items-center gap-2">
                    <BookOpen className="size-4" /><span>Guia de Uso</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/configuracoes")}>
                  <Link to="/configuracoes" className="flex items-center gap-2">
                    <Settings className="size-4" /><span>Configurações</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/super-admin")}>
                    <Link to="/super-admin" className="flex items-center gap-2">
                      <ShieldCheck className="size-4" /><span>Super Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
