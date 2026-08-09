import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Chip,
  Button,
} from "@mui/material";
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
import { api, DescriptiveStats } from "../api/client.ts";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import StatsModal from "./StatsModal.tsx";


export default function DescriptiveStatsBlock() {
  const [stats, setStats] = useState<DescriptiveStats | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carica i dati delle statistiche descrittive da /api/ai-detection
    api.aiDetection([], 1)
      .then((res) => {
        if (res.stats) {
          setStats(res.stats);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore durante il caricamento delle statistiche descrittive:", err);
        setLoading(false);
      });
  }, []);

  if (loading || !stats) {
    return null;
  }

  return (
    <Box sx={{ mb: 6 }}>
      {/* Intestazione Sezione conforme a DESIGN.md */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 3 }}>
        <Box>
          <Chip
            label="Statistiche Corpus"
            sx={{
              fontFamily: "CohereMono, ui-monospace, monospace",
              fontSize: "11px",
              color: "#ff7759",
              backgroundColor: "#fff0ec",
              border: "1px solid #ffad9b",
              fontWeight: 600,
              mb: 1.5,
              px: 1,
            }}
          />
          <Typography
            variant="h4"
            sx={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 400,
              fontSize: { xs: "28px", md: "36px" },
              color: "#17171c",
              letterSpacing: "-0.48px",
            }}
          >
            Statistiche Descrittive del Corpus
          </Typography>
          <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5 }}>
            Metriche di sintesi e curve di distribuzione per il rilevamento del testo sintetico.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<AnalyticsIcon sx={{ color: "#1863dc" }} />}
          onClick={() => setModalOpen(true)}
          sx={{
            borderRadius: "32px",
            px: 3,
            py: 1,
            fontWeight: 600,
            fontSize: "13px",
            textTransform: "none",
            borderColor: "#d9d9dd",
            color: "#17171c",
            "&:hover": {
              borderColor: "#1863dc",
              backgroundColor: "#f1f5ff",
            },
          }}
        >
          Apri Report Interattivo
        </Button>
      </Box>

      {/* Grid di Card KPI traslucide su sfondo Soft Stone (#eeece7) */}
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: "22px",
          backgroundColor: "#eeece7", // Soft Stone Surface da DESIGN.md
          border: "1px solid #d9d9dd",
        }}
      >
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Card 1: Probabilità Media */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: "16px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 600, display: "block", mb: 1, letterSpacing: "0.28px" }}>
                PROBABILITÀ MEDIA AI
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 400,
                  fontSize: "38px",
                  color: "#ff7759", // Coral Accent
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {stats.probability.mean}%
              </Typography>
              <Typography variant="caption" sx={{ color: "#75758a" }}>
                Mediana: <strong>{stats.probability.median}%</strong> &bull; &plusmn;{stats.probability.std}% std
              </Typography>
            </Box>
          </Grid>

          {/* Card 2: Lunghezza Post Medio */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: "16px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 600, display: "block", mb: 1, letterSpacing: "0.28px" }}>
                LUNGHEZZA MEDIA POST
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 400,
                  fontSize: "38px",
                  color: "#1863dc", // Action Blue
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {stats.text_length.avg_chars}
              </Typography>
              <Typography variant="caption" sx={{ color: "#75758a" }}>
                Caratteri medi &bull; Mediana: <strong>{stats.text_length.median_chars}</strong>
              </Typography>
            </Box>
          </Grid>

          {/* Card 3: Bot Account */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: "16px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 600, display: "block", mb: 1, letterSpacing: "0.28px" }}>
                ACCOUNT AUTOMATIZZATI
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 400,
                  fontSize: "38px",
                  color: "#17171c",
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {stats.bot_breakdown.bot_percentage}%
              </Typography>
              <Typography variant="caption" sx={{ color: "#75758a" }}>
                {stats.bot_breakdown.bots.toLocaleString()} bot vs {stats.bot_breakdown.humans.toLocaleString()} umani
              </Typography>
            </Box>
          </Grid>

          {/* Card 4: Tokens Analizzati */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: "16px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 600, display: "block", mb: 1, letterSpacing: "0.28px" }}>
                TOKEN MEDI PER POST
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 400,
                  fontSize: "38px",
                  color: "#003c33", // Deep Enterprise Green
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {stats.text_length.avg_tokens}
              </Typography>
              <Typography variant="caption" sx={{ color: "#75758a" }}>
                Valutati da Fast-DetectGPT
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Grafico Curva di Distribuzione su Fondo Bianco Editorial */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                p: 3.5,
                borderRadius: "16px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "16px", color: "#17171c" }}>
                  Spettro Continuo di Probabilità IA (KDE)
                </Typography>
                <Chip label="10 Bucket Fine-Grained" size="small" sx={{ backgroundColor: "#eeece7", color: "#75758a", fontSize: "11px" }} />
              </Box>

              <Box sx={{ height: 220, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.distribution_curve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardProbGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff7759" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ff7759" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="bucket" stroke="#75758a" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#75758a" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#17171c",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => [`${Number(val || 0).toLocaleString()} status`, "Frequenza"]}
                    />
                    <Area type="monotone" dataKey="count" stroke="#ff7759" strokeWidth={2.5} fillOpacity={1} fill="url(#dashboardProbGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Grid>

          {/* Grafico Top Domini */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 3.5,
                borderRadius: "16px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "16px", color: "#17171c", mb: 2 }}>
                Top Istanze Fediverso
              </Typography>
              <Box sx={{ height: 180, width: "100%", flexGrow: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.top_domains} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" stroke="#75758a" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="domain" type="category" stroke="#17171c" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#17171c",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stats.top_domains.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#ff7759" : index === 1 ? "#1863dc" : "#003c33"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Modale report completo */}
      <StatsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        stats={stats}
      />
    </Box>
  );
}
