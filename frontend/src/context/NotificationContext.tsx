import React, { useState, ReactNode } from "react";
import { Snackbar, Alert, AlertColor, Typography, Box } from "@mui/material";
import { tokens } from "../theme.ts";
import { NotificationContext } from "./notification-context.ts";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertColor>("info");

  const notify = (msg: string, sev: AlertColor = "info") => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  };

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        open={open}
        // Un errore resta finche' non lo si chiude. Quattro secondi bastavano a
        // farlo sparire prima che venisse letto - da chi usa uno screen reader,
        // da chi stava guardando altrove, da chi legge piu' lentamente della
        // media - e un errore mancato e' peggio di un errore ingombrante.
        // Conferme e informazioni continuano a togliersi di mezzo da sole.
        autoHideDuration={severity === "error" ? null : 5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          sx={{
            // L'errore cambia superficie, non solo icona. Prima l'icona era
            // coral - la tinta che in tutto il resto dell'applicazione significa
            // "account bot" - scelta perche' `danger` su fondo quasi nero da'
            // 2.5:1 ed e' illeggibile. Il rosso scuro come fondo risolve
            // entrambe le cose: nessun rosso leggibile su nero e' distinguibile
            // dal coral, quindi il rosso smette di essere un dettaglio e diventa
            // la superficie. Bianco su rosso scuro: 11:1.
            backgroundColor: severity === "error" ? tokens.color.dangerDark : tokens.color.nearBlack,
            color: tokens.color.canvas,
            borderRadius: tokens.radius.md,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
            fontFamily: tokens.font.body,
            fontSize: "14px",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color:
                severity === "error"
                  ? tokens.color.canvas
                  : severity === "success"
                    ? tokens.color.success
                    : tokens.color.actionBlue,
            },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {/* Bianco trasparente e non `textOnDark`: la superficie cambia con
                la gravita', e il grigio delle superfici scure su rosso scuro
                scende a 3.6:1. La trasparenza segue il fondo qualunque sia. */}
            <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: "rgba(255,255,255,0.72)", fontSize: "11px", textTransform: "uppercase" }}>
              SNM System Notification
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: tokens.color.canvas, mt: 0.2 }}>
              {message}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}
