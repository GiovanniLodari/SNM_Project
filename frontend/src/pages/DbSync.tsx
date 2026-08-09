import { useEffect, useState } from "react";
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
import { api, DbSyncResponse } from "../api/client.ts";
import { useNotification } from "../context/NotificationContext.tsx";

export default function DbSync() {
  const { notify } = useNotification();
  const [status, setStatus] = useState<DbSyncResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const fetchSyncStatus = (silent = false) => {
    if (!silent) setLoading(true);
    api.dbSync()
      .then((res) => {
        setStatus(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSyncStatus();

    // Auto-refresh ogni 3 secondi se l'export è in corso per aggiornare i log
    const interval = setInterval(() => {
      fetchSyncStatus(true);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleStartExport = () => {
    setActionLoading(true);
    setMessage({ type: "info", text: "Avvio dell'esportazione del database in corso..." });
    notify("Esportazione database avviata in background", "info");
    api.pipelineStart("db_export", "")
      .then((res) => {
        setMessage({ type: "success", text: res.message });
        notify("Pipeline di esportazione completata!", "success");
        setActionLoading(false);
        fetchSyncStatus();
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: "error", text: "Errore durante l'avvio dell'esportazione." });
        notify("Errore durante l'esportazione database", "error");
        setActionLoading(false);
      });
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
    notify("Importazione file ZIP in corso...", "info");
    
    api.dbImport(selectedFile)
      .then((res) => {
        if (res.ok) {
          setMessage({ type: "success", text: `Importazione completata con successo: ${res.message}` });
          notify("Importazione database e merge completati!", "success");
          setSelectedFile(null);
        } else {
          setMessage({ type: "error", text: res.message });
          notify(`Errore durante importazione: ${res.message}`, "error");
        }
        setActionLoading(false);
        fetchSyncStatus();
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: "error", text: "Importazione fallita o timeout della connessione." });
        notify("Importazione fallita o timeout di rete", "error");
        setActionLoading(false);
      });
  };

  const handleDownload = () => {
    window.open("/api/db-sync/download", "_blank");
  };

  if (loading && !status) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress color="primary" />
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
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 400,
              fontSize: { xs: "32px", md: "48px" },
              color: "#17171c",
              mb: 1,
            }}
          >
            Database Synchronization
          </Typography>
          <Typography variant="body1" sx={{ color: "#75758a" }}>
            Export local records to a portable JSONL archive or merge external ZIP database backups into your node.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => fetchSyncStatus()}
          variant="outlined"
          sx={{ borderRadius: "32px" }}
        >
          Refresh State
        </Button>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 4, borderRadius: "16px" }} onClose={() => setMessage(null)}>
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
                borderRadius: "22px",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#17171c", mb: 2 }}>
                Export Database Dump
              </Typography>
              <Typography variant="body2" sx={{ color: "#75758a", mb: 4, flexGrow: 1 }}>
                Generates a ZIP archive containing all statuses, accounts, instances, and follow network tables serialized as JSONL. Private credentials and cursors are omitted.
              </Typography>

              {status.export_log_lines && status.export_log_lines.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 4,
                    backgroundColor: "#17171c",
                    color: "#00e5ff",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "12px",
                    maxHeight: 180,
                    overflowY: "auto",
                    borderRadius: "12px",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, color: "#93939f" }}>
                    <ConsoleIcon style={{ fontSize: 14 }} />
                    <Typography variant="caption" sx={{ color: "#93939f" }}>EXPORT CONSOLE LOG</Typography>
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
                  sx={{ borderRadius: "32px", flexGrow: 1 }}
                >
                  {status.export_running ? "Exporting..." : "Generate Archive"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleDownload}
                  disabled={!status.export_zip_ready || status.export_running || actionLoading}
                  startIcon={<DownloadIcon />}
                  sx={{ borderRadius: "32px", flexGrow: 1 }}
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
                borderRadius: "22px",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "#17171c", mb: 2 }}>
                Import & Incremental Merge
              </Typography>
              <Typography variant="body2" sx={{ color: "#75758a", mb: 4, flexGrow: 1 }}>
                Upload a ZIP database archive received from another node. The system performs an idempotent merge: new records are added while existing local records are preserved without overwriting.
              </Typography>

              <Divider sx={{ my: 3, borderColor: "#e5e7eb" }} />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mb: 4 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<SelectIcon />}
                  sx={{
                    py: 3,
                    borderStyle: "dashed",
                    borderRadius: "16px",
                    borderColor: "#d9d9dd",
                    color: "#212121",
                    "&:hover": { borderStyle: "dashed", backgroundColor: "#f1f5ff", borderColor: "#1863dc" },
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
                  backgroundColor: "#ff7759", // Coral CTA Button
                  color: "#ffffff",
                  borderRadius: "32px",
                  "&:hover": { backgroundColor: "#e05c40" },
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
