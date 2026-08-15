import { useEffect, useState } from "react";

/**
 * Estado de conexão do navegador (offline-first).
 * Sempre inicia como "online" para não causar mismatch de hidratação no SSR.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
