import { useEffect, useRef } from "react";
import { CloudOff, Wifi } from "lucide-react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * Aviso global e persistente quando o app está sem conexão.
 * Os dados já carregados continuam visíveis (cache offline).
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      toast.success("Conexão restabelecida", {
        description: "Seus dados foram atualizados.",
        icon: <Wifi className="h-4 w-4" />,
      });
    }
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center gap-2 border-t border-amber-500/30 bg-amber-500/95 px-4 py-2 text-center text-sm font-medium text-amber-950 shadow-lg backdrop-blur transition-all duration-300 sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:rounded-full sm:border"
    >
      <CloudOff className="h-4 w-4 shrink-0" />
      <span>Você está offline — exibindo dados salvos. Novas alterações não serão enviadas.</span>
    </div>
  );
}
