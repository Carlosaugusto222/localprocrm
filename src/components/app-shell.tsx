import { type ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OrgSwitcher } from "@/components/org-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { NotificationsBell } from "@/components/notifications-bell";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b bg-background/80 backdrop-blur px-3 sticky top-0 z-30">
            <SidebarTrigger />
            <OrgSwitcher />
            <div className="flex-1" />
            <NotificationsBell />
            <ThemeToggle />
            <UserMenu />
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
