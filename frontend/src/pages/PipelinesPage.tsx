import { useCallback, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { api, JobRow } from "../api/client";
import { useApi } from "../hooks/useApi";
import { EmptyState, ErrorState, LoadingState, Page } from "../components/States";
import { useEffect } from "react";

export function PipelinesPage() {
  const fetchJobs = useCallback(() => api.pipelines(), []);
  const { data, loading, error, reload } = useApi(fetchJobs);
  const [params, setParams] = useState<Record<string, string>>({});

  // Polling ogni 5s mentre c'è almeno un job in esecuzione (come il refresh
  // meta http-equiv={5} delle vecchie template).
  useEffect(() => {
    if (!data?.jobs.some((j) => j.running)) return;
    const timer = setTimeout(() => reload(), 5000);
    return () => clearTimeout(timer);
  }, [data, reload]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState>Nessun dato ancora disponibile.</EmptyState>;

  return (
    <Page title="Pipeline">
      <Stack spacing={2}>
        {data.jobs.map((job) => (
          <JobCard
            key={job.name}
            job={job}
            paramValue={params[job.name] ?? ""}
            onParamChange={(value) => setParams((p) => ({ ...p, [job.name]: value }))}
            onAction={reload}
          />
        ))}
      </Stack>
    </Page>
  );
}

function JobCard({
  job,
  paramValue,
  onParamChange,
  onAction,
}: {
  job: JobRow;
  paramValue: string;
  onParamChange: (value: string) => void;
  onAction: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  const handleStart = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.pipelineStart(job.name, paramValue);
      setMessage(res.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      onAction();
    }
  };

  const handleStop = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.pipelineStop(job.name);
      setMessage(res.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      onAction();
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {job.label}
        </Typography>
        <Chip
          label={job.running ? "in esecuzione" : "fermo"}
          color={job.running ? "success" : "default"}
          size="small"
        />
      </Box>

      {job.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {job.description}
        </Typography>
      )}

      {job.running && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant={job.progress_pct != null ? "determinate" : "indeterminate"}
            value={job.progress_pct ?? 0}
            sx={{ mb: 0.5 }}
          />
          <Typography variant="caption" color="text.secondary">
            {job.progress_pct != null
              ? `${job.progress_done} di ${job.progress_total} completato (${job.progress_pct}%)`
              : "in corso..."}
          </Typography>
        </Box>
      )}

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        {job.running ? (
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={handleStop}
            disabled={busy}
          >
            Ferma
          </Button>
        ) : (
          <>
            {job.takes_param && (
              <TextField
                type={job.param_type === "date" ? "date" : job.param_type}
                label={job.takes_param}
                size="small"
                value={paramValue}
                onChange={(e) => onParamChange(e.target.value)}
                sx={{ width: 180 }}
              />
            )}
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleStart}
              disabled={busy}
            >
              Avvia
            </Button>
          </>
        )}
      </Stack>

      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {message}
        </Typography>
      )}

      {job.log_lines.length > 0 && (
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
              {job.log_lines.join("\n")}
            </Box>
          </Collapse>
        </Box>
      )}
    </Paper>
  );
}