import { useEffect, useState, useRef } from "react";
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  TextField,
  Paper,
  LinearProgress,
  Chip,
  Grid,
} from "@mui/material";
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Terminal as ConsoleIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { api, JobRow, PipelinesResponse } from "../api/client.ts";
import { useNotification } from "../context/NotificationContext.tsx";

function PipelineCard({ job, onRefresh }: { job: JobRow; onRefresh: () => void }) {
  const { notify } = useNotification();
  const [paramValue, setParamValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (job.running && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [job.log_lines, job.running]);

  const handleStart = () => {
    setActionLoading(true);
    api.pipelineStart(job.name, paramValue)
      .then((res) => {
        notify(res.message, "success");
        setActionLoading(false);
        onRefresh();
      })
      .catch((err) => {
        console.error(err);
        notify("Errore durante l'avvio della pipeline.", "error");
        setActionLoading(false);
      });
  };

  const handleStop = () => {
    setActionLoading(true);
    api.pipelineStop(job.name)
      .then((res) => {
        notify(res.message, "info");
        setActionLoading(false);
        onRefresh();
      })
      .catch((err) => {
        console.error(err);
        notify("Errore durante l'arresto della pipeline.", "error");
        setActionLoading(false);
      });
  };

  return (
    <Box
      sx={{
        borderRadius: "22px",
        border: "1px solid #e5e7eb",
        backgroundColor: "#17171c", // Near-Black Agent Console style
        color: "#ffffff",
        p: 4,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: 600 }}>
            {job.label}
          </Typography>
          <Typography variant="caption" sx={{ color: "#93939f", fontFamily: "CohereMono, monospace" }}>
            AGENT ID: {job.name}
          </Typography>
        </Box>
        <Chip
          label={job.running ? "ACTIVE LOGGING" : "IDLE / STOPPED"}
          sx={{
            borderRadius: "16px",
            backgroundColor: job.running ? "#003c33" : "rgba(255, 255, 255, 0.1)",
            color: job.running ? "#ffffff" : "#93939f",
            fontFamily: "ui-monospace, monospace",
            fontSize: "10px",
            fontWeight: 600,
          }}
          size="small"
        />
      </Box>

      <Typography variant="body2" sx={{ color: "#93939f", mb: 3, flexGrow: 1 }}>
        {job.description || "No description specified."}
      </Typography>

      {job.running && job.progress_pct !== null && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: "#ffffff" }}>
              Progress
            </Typography>
            <Typography variant="caption" sx={{ color: "#ff7759", fontWeight: 600 }}>
              {job.progress_done} / {job.progress_total} ({job.progress_pct}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={job.progress_pct}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              "& .MuiLinearProgress-bar": { backgroundColor: "#ff7759" },
            }}
          />
        </Box>
      )}

      {/* Input Parameters */}
      {!job.running && job.takes_param && (
        <Box sx={{ mb: 3 }}>
          <TextField
            label={job.takes_param}
            type={job.param_type}
            variant="outlined"
            size="small"
            fullWidth
            value={paramValue}
            onChange={(e) => setParamValue(e.target.value)}
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              "& .MuiInputLabel-root": { color: "#93939f" },
              "& .MuiOutlinedInput-root": {
                color: "#ffffff",
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                "&:hover fieldset": { borderColor: "#ffffff" },
              },
            }}
          />
        </Box>
      )}

      {/* Console Log */}
      {job.log_lines && job.log_lines.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: "#000000",
            color: "#00e5ff",
            fontFamily: "ui-monospace, monospace",
            fontSize: "12px",
            maxHeight: 180,
            overflowY: "auto",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1, color: "#93939f" }}>
            <ConsoleIcon style={{ fontSize: 14 }} />
            <Typography variant="caption" sx={{ color: "#93939f" }}>AGENT LOG CONSOLE</Typography>
          </Box>
          {job.log_lines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
          <div ref={logEndRef} />
        </Paper>
      )}

      <Box sx={{ display: "flex", gap: 2, mt: "auto" }}>
        {job.running ? (
          <Button
            variant="contained"
            fullWidth
            startIcon={<StopIcon />}
            onClick={handleStop}
            disabled={actionLoading}
            sx={{
              backgroundColor: "#b30000", // Error Red
              color: "#ffffff",
              borderRadius: "32px",
              "&:hover": { backgroundColor: "#800000" },
            }}
          >
            Halt Agent
          </Button>
        ) : (
          <Button
            variant="contained"
            fullWidth
            startIcon={<StartIcon />}
            onClick={handleStart}
            disabled={actionLoading}
            sx={{
              backgroundColor: "#ffffff",
              color: "#17171c",
              borderRadius: "32px",
              "&:hover": { backgroundColor: "#eeece7" },
            }}
          >
            Launch Pipeline
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default function Pipelines() {
  const [data, setData] = useState<PipelinesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipelines = (silent = false) => {
    if (!silent) setLoading(true);
    api.pipelines()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossibile caricare lo stato delle pipeline.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPipelines();

    // Auto-refresh ogni 3 secondi per tracciare i log live e lo stato di running
    const interval = setInterval(() => {
      fetchPipelines(true);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
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
          <Chip
            label="AGENT & PIPELINE ORCHESTRATION"
            sx={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              color: "#75758a",
              backgroundColor: "#eeece7",
              mb: 2,
              px: 1,
            }}
          />
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
            Pipeline Command System.
          </Typography>
          <Typography variant="body1" sx={{ color: "#75758a" }}>
            Orchestrate background crawlers, relationship density generators, Fast-DetectGPT, and LLM fact checkers.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => fetchPipelines()}
          variant="outlined"
          sx={{ borderRadius: "32px" }}
        >
          Refresh State
        </Button>
      </Box>

      {error && (
        <Box sx={{ mb: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {data && (
        <Grid container spacing={4}>
          {data.jobs.map((job) => (
            <Grid item xs={12} md={6} key={job.name}>
              <PipelineCard job={job} onRefresh={() => fetchPipelines(true)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
