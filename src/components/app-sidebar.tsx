import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Calendar, Wallet, ShoppingBag,
  MessageCircle, Sparkles, BarChart3, Settings, Zap, Kanban, ShieldCheck, BookOpen,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useEnabledModules } from "@/hooks/use-current-org";
import { useIsSuperAdmin } from "@/hooks/use-is-super-admin";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { title: "Clientes (CRM)", url: "/crm", icon: Users, module: "crm" },
  { title: "Funil de Vendas", url: "/funil", icon: Kanban, module: "crm" },
  { title: "Agenda", url: "/agenda", icon: Calendar, module: "appointments" },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, module: "finance" },
  { title: "Vendas", url: "/vendas", icon: ShoppingBag, module: "sales" },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle, module: "whatsapp" },
  { title: "Assistente IA", url: "/ia", icon: Sparkles, module: "ai" },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, module: "reports" },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: r => r.location.pathname });
  const isEnabled = useEnabledModules();
  const isSuperAdmin = useIsSuperAdmin();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
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
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.filter(i => i.module === "dashboard" || isEnabled(i.module)).map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/configuracoes")}>
                  <Link to="/configuracoes" className="flex items-center gap-2">
                    <Settings className="size-4" />
                    <span>Configurações</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/super-admin")}>
                    <Link to="/super-admin" className="flex items-center gap-2">
                      <ShieldCheck className="size-4" />
                      <span>Super Admin</span>
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
