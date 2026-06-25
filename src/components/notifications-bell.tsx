import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { Link } from "@tanstack/react-router";

export function NotificationsBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm flex items-center gap-2">
            Notificações
            {unread > 0 && <Badge variant="secondary">{unread}</Badge>}
          </div>
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={() => markAllRead.mutate()}>
              Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sem notificações ainda.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const body = (
                  <div className={`p-3 hover:bg-accent ${!n.read_at ? "bg-accent/40" : ""}`}>
                    <div className="font-medium text-sm">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} onClick={() => !n.read_at && markRead.mutate(n.id)}>
                    {n.link ? <Link to={n.link as any}>{body}</Link> : body}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
