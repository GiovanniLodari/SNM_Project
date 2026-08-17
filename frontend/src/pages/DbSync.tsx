import { useState } from "react";
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Paper,
  Divider,
  Alert,
  Grid,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  CloudUpload as SelectIcon,
  Refresh as RefreshIcon,
  Terminal as ConsoleIcon,
} from "@mui/icons-material";
import { api } from "../api/client.ts";
import { useDbSyncQuery } from "../api/queries.ts";
import { tokens } from "../theme.ts";
import { LoadingState } from "../components/States.tsx";

export default function DbSync() {
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // useDbSyncQuery porta gia' il polling a 3s: il setInterval fatto a mano qui
  // lo duplicava. L'Alert inline `message` e' l'unico canale di riscontro: in
  // precedenza ogni ramo scriveva sia in `message` sia nel toast globale,
  // dicendo due volte la stessa cosa.
  const { data: status, isLoading: loading, isError, refetch } = useDbSyncQuery();

  const handleStartExport = () => {
    setActionLoading(true);
    setMessage({ type: "info", text: "Avvio dell'esportazione del database in corso..." });
    api.pipelineStart("db_export", "")
      .then((res) => {
        setMessage({ type: "success", text: res.message });
        refetch();
      })
      .catch((err) => {
        setMessage({
          type: "error",
          text: err instanceof Error
            ? `Errore durante l'avvio dell'esportazione: ${err.message}`
            : "Errore durante l'avvio dell'esportazione.",
        });
      })
      .finally(() => setActionLoading(false));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!selectedFile) return;
    setActionLoading(true);
    setMessage({ type: "info", text: "Importazione del file ZIP e fusione dei dati in corso. Attendere..." });

    api.dbImport(selectedFile)
      .then((res) => {
        if (res.ok) {
          setMessage({ type: "success", text: `Importazione completata con successo: ${res.message}` });
          setSelectedFile(null);
        } else {
          setMessage({ type: "error", text: res.message });
        }
        refetch();
      })
      .catch((err) => {
        setMessage({
          type: "error",
          text: err instanceof Error
            ? `Importazione fallita: ${err.message}`
            : "Importazione fallita o timeout della connessione.",
        });
      })
      .finally(() => setActionLoading(false));
  };

  const handleDownload = () => {
    window.open("/api/db-sync/download", "_blank");
  };

  if (loading && !status) {
    return (
      <LoadingState />
    );
  }

  if (isError && !status) {
    return (
      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Alert severity="error" sx={{ display: "inline-flex" }}>
          Impossibile leggere lo stato di sincronizzazione. Verificare che il backend sia in esecuzione.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
        <Box>

          <Typography
            variant="h2"
            sx={{
              fontFamily: tokens.font.display,
              fontWeight: 400,
              fontSize: { xs: "32px", md: "48px" },
              color: tokens.color.nearBlack,
              mb: 1,
            }}
          >
            Database Synchronization
          </Typography>
          <Typography variant="body1" sx={{ color: tokens.color.textMuted }}>
            Export local records to a portable JSONL archive or merge external ZIP database backups into your node.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          variant="outlined"
          sx={{ borderRadius: tokens.radius.pill }}
        >
          Refresh State
        </Button>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 4, borderRadius: tokens.radius.lg }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {status && (
        <Grid container spacing={4}>
          {/* Sezione Export */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 4,
                borderRadius: tokens.radius.xl,
                border: tokens.border.subtle,
                backgroundColor: tokens.color.canvas,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: tokens.color.nearBlack, mb: 2 }}>
                Export Database Dump
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 4, flexGrow: 1 }}>
                Generates a ZIP archive containing all statuses, accounts, instances, and follow network tables serialized as JSONL. Private credentials and cursors are omitted.
              </Typography>

              {status.export_log_lines && status.export_log_lines.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 4,
                    backgroundColor: tokens.color.nearBlack,
                    color: tokens.color.accentCyan,
                    fontFamily: tokens.font.mono,
                    fontSize: "12px",
                    maxHeight: 180,
                    overflowY: "auto",
                    borderRadius: tokens.radius.md,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, color: tokens.color.textOnDark }}>
                    <ConsoleIcon style={{ fontSize: 14 }} />
                    <Typography variant="caption" sx={{ color: tokens.color.textOnDark }}>EXPORT CONSOLE LOG</Typography>
                  </Box>
                  {status.export_log_lines.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </Paper>
              )}

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleStartExport}
                  disabled={status.export_running || actionLoading}
                  startIcon={status.export_running ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ borderRadius: tokens.radius.pill, flexGrow: 1 }}
                >
                  {status.export_running ? "Exporting..." : "Generate Archive"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleDownload}
                  disabled={!status.export_zip_ready || status.export_running || actionLoading}
                  startIcon={<DownloadIcon />}
                  sx={{ borderRadius: tokens.radius.pill, flexGrow: 1 }}
                >
                  Download ZIP
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Sezione Import */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 4,
                borderRadius: tokens.radius.xl,
                border: tokens.border.subtle,
                backgroundColor: tokens.color.canvas,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold", color: tokens.color.nearBlack, mb: 2 }}>
                Import & Incremental Merge
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 4, flexGrow: 1 }}>
                Upload a ZIP database archive received from another node. The system performs an idempotent merge: new records are added while existing local records are preserved without overwriting.
              </Typography>

              <Divider sx={{ my: 3, borderColor: tokens.color.border }} />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mb: 4 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<SelectIcon />}
                  sx={{
                    py: 3,
                    borderStyle: "dashed",
                    borderRadius: tokens.radius.lg,
                    borderColor: tokens.color.borderStrong,
                    color: tokens.color.textPrimary,
                    "&:hover": { borderStyle: "dashed", backgroundColor: tokens.color.surfaceBlue, borderColor: tokens.color.actionBlue },
                  }}
                >
                  {selectedFile ? `Selected: ${selectedFile.name}` : "Select ZIP Backup Package (.zip)"}
                  <input type="file" accept=".zip" hidden onChange={handleFileChange} />
                </Button>
              </Box>

              <Button
                variant="contained"
                onClick={handleImport}
                disabled={!selectedFile || actionLoading}
                startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
                sx={{
                  backgroundColor: tokens.color.coral, // Coral CTA Button
                  color: tokens.color.nearBlack,
                  borderRadius: tokens.radius.pill,
                  "&:hover": { backgroundColor: tokens.color.coralDark },
                  mt: "auto",
                }}
              >
                {actionLoading ? "Merging..." : "Import & Merge Records"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
