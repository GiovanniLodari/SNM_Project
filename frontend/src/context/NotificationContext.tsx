import React, { createContext, useContext, useState, ReactNode } from "react";
import { Snackbar, Alert, AlertColor, Typography, Box } from "@mui/material";
import { tokens } from "../theme.ts";

interface NotificationContextType {
  notify: (message: string, severity?: AlertColor) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

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
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          sx={{
            backgroundColor: tokens.color.nearBlack,
            color: tokens.color.canvas,
            borderRadius: tokens.radius.md,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
            fontFamily: tokens.font.body,
            fontSize: "14px",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color: severity === "error" ? tokens.color.coral : severity === "success" ? tokens.color.success : tokens.color.actionBlue,
            },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.textFaint, fontSize: "11px", textTransform: "uppercase" }}>
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

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
