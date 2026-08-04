import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import { api } from "../api/client";
import { useApi } from "../hooks/useApi";
import { EmptyState, ErrorState, LoadingState, Page } from "../components/States";

export function DbSyncPage() {
  const fetchStatus = useCallback(() => api.dbSync(), []);
  const { data, loading, error, reload } = useApi(fetchStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data?.export_running) return;
    const timer = setTimeout(() => reload(), 5000);
    return () => clearTimeout(timer);
  }, [data, reload]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState>Nessun dato ancora disponibile.</EmptyState>;

  const runAction = async (action: () => Promise<{ ok: boolean; message: string }>) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await action();
      setMessage(res.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      reload();
    }
  };

  const handleImport = async (file: File) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.dbImport(file);
      setMessage(res.message);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      reload();
    }
  };

  return (
    <Page title="Import/Export dati">
      {message && (
        <Box sx={{ mb: 2 }}>
          <EmptyState>{message}</EmptyState>
        </Box>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Esporta
          </Typography>
          <Chip
            label={data.export_running ? "in esecuzione" : "fermo"}
            color={data.export_running ? "success" : "default"}
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Genera uno zip con i dati di raccolta (topics, istanze, account, post, hashtag, menzioni,
          reblog, follow) da condividere con un collega. Esclusi: etichette IA e fact-check (ancora
          in revisione), collection_runs.
        </Typography>

        {data.export_running && <LinearProgress sx={{ mb: 1 }} />}

        <Stack direction="row" spacing={1}>
          {data.export_running ? (
            <Button
              variant="contained"
              color="error"
              onClick={() => runAction(() => api.pipelineStop("db_export"))}
              disabled={busy}
            >
              Ferma
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => runAction(() => api.pipelineStart("db_export", ""))}
                disabled={busy}
              >
                Avvia export
              </Button>
              {data.export_zip_ready && (
                <Button
                  variant="outlined"
                  component="a"
                  href="/api/db-sync/download"
                  startIcon={<DownloadIcon />}
                >
                  Scarica zip pronto
                </Button>
              )}
            </>
          )}
        </Stack>

        {data.export_log_lines.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Button size="small" onClick={() => setShowLog((s) => !s)}>
              Dettagli tecnici
            </Button>
            <Collapse in={showLog}>
              <Box
                component="pre"
                sx={{
                  mt: 1,
                  maxHeight: 192,
                  overflowY: "auto",
                  bgcolor: "grey.100",
                  p: 1,
                  borderRadius: 1,
                  fontSize: "0.75rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {data.export_log_lines.join("\n")}
              </Box>
            </Collapse>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Importa
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Scegli lo zip ricevuto dal collega. I dati già presenti in locale non vengono mai
          sovrascritti, solo integrati.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            disabled={busy}
          >
            Scegli file .zip
            <input
              ref={fileInput}
              type="file"
              accept=".zip"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
              }}
            />
          </Button>
        </Stack>
      </Paper>
    </Page>
  );
}