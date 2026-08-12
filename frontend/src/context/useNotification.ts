import { useContext } from "react";
import { NotificationContext } from "./notification-context.ts";

/**
 * Accesso al sistema di notifiche globali.
 *
 * Sta in un file suo perche' Fast Refresh di Vite si disattiva su un modulo che
 * esporta sia componenti sia altro: tenendolo insieme al Provider, ogni
 * modifica al contesto ricaricava l'intera pagina invece del solo componente.
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification va usato dentro un NotificationProvider");
  }
  return context;
}
