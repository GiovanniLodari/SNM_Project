import { createContext } from "react";
import type { AlertColor } from "@mui/material";

/**
 * Contesto delle notifiche globali, separato dal Provider che lo popola.
 *
 * La divisione serve a Fast Refresh: un modulo che esporta un componente
 * insieme ad altro perde il ricaricamento selettivo, e ogni modifica finiva
 * per rimontare l'intera pagina.
 */
export interface NotificationContextType {
  notify: (message: string, severity?: AlertColor) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
