import { ReactNode } from "react";
import { Box, LinearProgress, Paper, Skeleton, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

/** Título de página + contenedor de contenido con ancho consistente. */
export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export function LoadingState() {
  return (
    <Paper sx={{ p: 2 }}>
      <Skeleton height={60} />
      <Skeleton height={60} />
      <Skeleton height={60} />
      <Skeleton height={60} />
    </Paper>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Paper sx={{ p: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
      <ErrorOutlineIcon color="error" />
      <Typography color="error">{message}</Typography>
    </Paper>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        textAlign: "center",
        color: "text.secondary",
        borderStyle: "dashed",
      }}
    >
      {children}
    </Paper>
  );
}

export function ProgressLine({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return <LinearProgress sx={{ mb: 2 }} />;
}
