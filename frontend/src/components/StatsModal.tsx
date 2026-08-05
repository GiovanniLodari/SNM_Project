import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Grid,
  Card,
  Chip,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import FunctionsIcon from "@mui/icons-material/Functions";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PublicIcon from "@mui/icons-material/Public";
import confetti from "canvas-confetti";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { DescriptiveStats } from "../api/client.ts";

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  stats?: DescriptiveStats;
}

export default function StatsModal({ open, onClose, stats }: StatsModalProps) {
  useEffect(() => {
    if (open) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.3 },
      });
    }
  }, [open]);

  if (!stats) return null;


  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "28px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          color: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3.5,
          pb: 2,
          display: "flex",
          justify: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 1.2,
              borderRadius: "16px",
              background: "linear-gradient(135deg, #ff7759 0%, #d94a2b 100%)",
              boxShadow: "0 0 20px rgba(255, 119, 89, 0.5)",
              display: "flex",
            }}
          >
            <AutoAwesomeIcon sx={{ color: "#ffffff", fontSize: 28 }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  fontFamily: "Space Grotesk, sans-serif",
                  background: "linear-gradient(90deg, #ffffff 0%, #a5b4fc 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: { xs: "22px", md: "28px" },
                }}
              >
                STATISTICHE DESCRITTIVE AVANZATE
              </Typography>
              <Chip
                label="LIVE SPECTRUM"
                size="small"
                sx={{
                  backgroundColor: "rgba(255, 119, 89, 0.2)",
                  color: "#ff7759",
                  border: "1px solid rgba(255, 119, 89, 0.4)",
                  fontWeight: 700,
                  fontSize: "10px",
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.3 }}>
              Analisi quantitativa su <strong>{stats.total_analyzed.toLocaleString()}</strong> post Fast-DetectGPT
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          sx={{
            color: "#94a3b8",
            "&:hover": { color: "#ffffff", backgroundColor: "rgba(255,255,255,0.1)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 4, pt: 3 }}>
        {/* KPI Cards Row */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {/* Card 1: Probabilità Media */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                p: 2.5,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1 }}>
                  PROBABILITÀ MEDIA
                </Typography>
                <FunctionsIcon sx={{ color: "#ff7759", fontSize: 20 }} />
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 700,
                  color: "#ff7759",
                  fontSize: "36px",
                }}
              >
                {stats.probability.mean}%
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", mt: 0.5, display: "block" }}>
                Mediana: {stats.probability.median}% &bull; Dev.Std: &plusmn;{stats.probability.std}%
              </Typography>
            </Card>
          </Grid>

          {/* Card 2: Lunghezza Post Medio */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                p: 2.5,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1 }}>
                  LUNGHEZZA MEDICE (CHARS)
                </Typography>
                <FormatQuoteIcon sx={{ color: "#38bdf8", fontSize: 20 }} />
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 700,
                  color: "#38bdf8",
                  fontSize: "36px",
                }}
              >
                {stats.text_length.avg_chars}
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", mt: 0.5, display: "block" }}>
                Mediana: {stats.text_length.median_chars} caratteri &bull; ~{stats.text_length.avg_tokens} token
              </Typography>
            </Card>
          </Grid>

          {/* Card 3: % Bot Account */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                p: 2.5,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1 }}>
                  % BOT AUTOMATIZZATI
                </Typography>
                <SmartToyIcon sx={{ color: "#a855f7", fontSize: 20 }} />
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 700,
                  color: "#a855f7",
                  fontSize: "36px",
                }}
              >
                {stats.bot_breakdown.bot_percentage}%
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", mt: 0.5, display: "block" }}>
                {stats.bot_breakdown.bots.toLocaleString()} bot vs {stats.bot_breakdown.humans.toLocaleString()} umani
              </Typography>
            </Card>
          </Grid>

          {/* Card 4: Log Likelihood Criterion */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                p: 2.5,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1 }}>
                  CRITERIO LIKELIHOOD
                </Typography>
                <EqualizerIcon sx={{ color: "#4ade80", fontSize: 20 }} />
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 700,
                  color: "#4ade80",
                  fontSize: "36px",
                }}
              >
                {stats.criteria ? stats.criteria.mean : "N/A"}
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", mt: 0.5, display: "block" }}>
                Min: {stats.criteria?.min ?? "N/A"} &bull; Max: {stats.criteria?.max ?? "N/A"}
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3}>
          {/* Chart 1: Curva di Distribuzione Continuata */}
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                p: 3,
                borderRadius: "24px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "16px", color: "#f8fafc" }}>
                  Curva di Distribuzione Probabilità AI (KDE Spectrum)
                </Typography>
                <Chip label="10 Decili Fine-Grained" size="small" sx={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#cbd5e1", fontSize: "11px" }} />
              </Box>

              <Box sx={{ height: 260, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.distribution_curve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff7759" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ff7759" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="bucket" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => [`${Number(val || 0).toLocaleString()} post`, "Frequenza"]}
                    />

                    <Area type="monotone" dataKey="count" stroke="#ff7759" strokeWidth={3} fillOpacity={1} fill="url(#probGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Grid>

          {/* Chart 2: Top Domini Fediverso */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 3,
                borderRadius: "24px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <PublicIcon sx={{ color: "#38bdf8", fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "16px", color: "#f8fafc" }}>
                  Top Instanze Fediverso
                </Typography>
              </Box>

              <Box sx={{ height: 220, width: "100%", flexGrow: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.top_domains} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="domain" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {stats.top_domains.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#ff7759" : index === 1 ? "#38bdf8" : "#818cf8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Footer info */}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="caption" sx={{ color: "#64748b" }}>
            Generato automaticamente dal motore analitico SNM Intelligence &bull; Fast-DetectGPT Log-Likelihood
          </Typography>
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              borderRadius: "20px",
              px: 4,
              py: 1,
              fontWeight: 700,
              background: "linear-gradient(135deg, #ff7759 0%, #d94a2b 100%)",
              color: "#ffffff",
              "&:hover": { background: "linear-gradient(135deg, #e66043 0%, #b8391d 100%)" },
            }}
          >
            Chiudi Report
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
