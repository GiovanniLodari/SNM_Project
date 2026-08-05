import { Component, ErrorInfo, ReactNode } from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import { Warning as AlertIcon } from "@mui/icons-material";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error in Component Tree:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <Paper
            elevation={0}
            sx={{
              p: 5,
              textAlign: "center",
              borderRadius: "24px",
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              maxWidth: 500,
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 119, 89, 0.12)",
                color: "#ff7759",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
              }}
            >
              <AlertIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h5" sx={{ fontFamily: "Space Grotesk, Inter, sans-serif", fontWeight: 700, mb: 1, color: "#17171c" }}>
              Si è verificato un errore inaspettato
            </Typography>
            <Typography variant="body2" sx={{ color: "#75758a", mb: 3 }}>
              {this.state.error?.message || "Si è verificato un problema di caricamento nell'interfaccia utente."}
            </Typography>
            <Button
              variant="contained"
              disableElevation
              onClick={this.handleReset}
              sx={{
                borderRadius: "32px",
                backgroundColor: "#17171c",
                color: "#ffffff",
                px: 3,
                py: 1.2,
                "&:hover": { backgroundColor: "#000000" },
              }}
            >
              Ricarica Pagina
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
