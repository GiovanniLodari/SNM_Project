import { useEffect, useState, useRef } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  TextField,
  LinearProgress,
  Chip,
  Grid,
} from "@mui/material";
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Terminal as ConsoleIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { api, JobRow } from "../api/client.ts";
import { usePipelinesQuery } from "../api/queries.ts";
import { useNotification } from "../context/useNotification.ts";
import { tokens } from "../theme.ts";
import { LoadingState, ErrorState } from "../components/States.tsx";

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
        borderRadius: tokens.radius.xl,
        border: tokens.border.subtle,
        backgroundColor: tokens.color.nearBlack, // Near-Black Agent Console style
        color: tokens.color.canvas,
        p: 4,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ color: tokens.color.canvas, fontWeight: 600 }}>
            {job.label}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.color.textFaint, fontFamily: "CohereMono, monospace" }}>
            AGENT ID: {job.name}
          </Typography>
        </Box>
        <Chip
          label={job.running ? "ACTIVE LOGGING" : "IDLE / STOPPED"}
          sx={{
            borderRadius: tokens.radius.lg,
            backgroundColor: job.running ? tokens.color.deepGreen : "rgba(255, 255, 255, 0.1)",
            color: job.running ? tokens.color.canvas : tokens.color.textFaint,
            fontFamily: tokens.font.mono,
            fontSize: "10px",
            fontWeight: 600,
          }}
          size="small"
        />
      </Box>

      <Typography variant="body2" sx={{ color: tokens.color.textFaint, mb: 3, flexGrow: 1 }}>
        {job.description || "No description specified."}
      </Typography>

      {job.running && job.progress_pct !== null && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: tokens.color.canvas }}>
              Progress
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.color.coral, fontWeight: 600 }}>
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
              "& .MuiLinearProgress-bar": { backgroundColor: tokens.color.coral },
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
              borderRadius: tokens.radius.md,
              "& .MuiInputLabel-root": { color: tokens.color.textFaint },
              "& .MuiOutlinedInput-root": {
                color: tokens.color.canvas,
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                "&:hover fieldset": { borderColor: tokens.color.canvas },
              },
            }}
          />
        </Box>
      )}

      {/* Console Log Accordion */}
      {job.log_lines && job.log_lines.length > 0 && (
        <Accordion
          elevation={0}
          sx={{
            backgroundColor: tokens.color.black,
            color: tokens.color.accentCyan,
            borderRadius: "12px !important",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            mb: 3,
            "&::before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: tokens.color.accentCyan }} />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ConsoleIcon sx={{ fontSize: 16, color: tokens.color.accentCyan }} />
              <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.canvas, fontWeight: 600 }}>
                Log Console & Dettagli Tecnici ({job.log_lines.length} righe)
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Box
              sx={{
                p: 1.5,
                backgroundColor: "#050811",
                color: tokens.color.accentCyan,
                fontFamily: tokens.font.mono,
                fontSize: "11px",
                maxHeight: 200,
                overflowY: "auto",
                borderRadius: tokens.radius.sm,
              }}
            >
              {job.log_lines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
              <div ref={logEndRef} />
            </Box>
          </AccordionDetails>
        </Accordion>
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
              backgroundColor: tokens.color.danger, // Error Red
              color: tokens.color.canvas,
              borderRadius: tokens.radius.pill,
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
              backgroundColor: tokens.color.canvas,
              color: tokens.color.nearBlack,
              borderRadius: tokens.radius.pill,
              "&:hover": { backgroundColor: tokens.color.softStone },
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
  // usePipelinesQuery porta gia' refetchInterval a 3s per i log live: il
  // setInterval scritto a mano qui lo duplicava.
  const { data, isLoading: loading, isError, refetch } = usePipelinesQuery();
  const error = isError ? "Impossibile caricare lo stato delle pipeline." : null;
  const fetchPipelines = () => { refetch(); };

  if (loading && !data) {
    return (
      <LoadingState />
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
            Pipeline Command System
          </Typography>
          <Typography variant="body1" sx={{ color: tokens.color.textMuted }}>
            Orchestrate background crawlers, relationship density generators, Fast-DetectGPT, and LLM fact checkers.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => fetchPipelines()}
          variant="outlined"
          sx={{ borderRadius: tokens.radius.pill }}
        >
          Refresh State
        </Button>
      </Box>

      <ErrorState message={error} />

      {data && (
        <Grid container spacing={4}>
          {data.jobs.map((job) => (
            <Grid item xs={12} md={6} key={job.name}>
              <PipelineCard job={job} onRefresh={() => fetchPipelines()} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
