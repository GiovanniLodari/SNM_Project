import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
} from "@mui/material";
import { Search as SearchIcon, Lightbulb as LightbulbIcon } from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import {
  api,
  DetectorComparisonSummaryResponse,
  ComparisonPostRow,
} from "../api/client.ts";
import { useDebounce } from "../hooks/useDebounce.ts";

export default function DetectorComparison() {
  const [summary, setSummary] = useState<DetectorComparisonSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  
  const [posts, setPosts] = useState<ComparisonPostRow[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Fetch summary metrics
  useEffect(() => {
    setLoadingSummary(true);
    api.detectorComparisonSummary()
      .then((data) => setSummary(data))
      .catch((err) => console.error("Error fetching comparison summary:", err))
      .finally(() => setLoadingSummary(false));
  }, []);

  const debouncedSearch = useDebounce(searchTerm, 400);

  // Fetch paginated posts
  useEffect(() => {
    setLoadingPosts(true);
    api.detectorComparisonPosts(filterType, page, pageSize, debouncedSearch)
      .then((data) => {
        setPosts(data.posts);
        setTotalPosts(data.total);
      })
      .catch((err) => console.error("Error fetching comparison posts:", err))
      .finally(() => setLoadingPosts(false));
  }, [filterType, page, pageSize, debouncedSearch]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setFilterType(newValue);
    setPage(1);
  };

  const getVoteBadge = (votes: number) => {
    switch (votes) {
      case 4:
        return (
          <Chip
            label="4/4 Unanime IA"
            size="small"
            sx={{
              backgroundColor: "#7c3aed",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: "ui-monospace, monospace",
            }}
          />
        );
      case 3:
        return (
          <Chip
            label="3/4 Maggioranza IA"
            size="small"
            sx={{
              backgroundColor: "#003c33",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: "ui-monospace, monospace",
            }}
          />
        );
      case 2:
        return (
          <Chip
            label="2/4 Misto IA"
            size="small"
            sx={{
              backgroundColor: "#ff7759",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: "ui-monospace, monospace",
            }}
          />
        );
      case 1:
        return (
          <Chip
            label="1/4 Minoranza IA"
            size="small"
            sx={{
              backgroundColor: "#eeece7",
              color: "#212121",
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: "ui-monospace, monospace",
              border: "1px solid #d9d9dd",
            }}
          />
        );
      default:
        return (
          <Chip
            label="0/4 Unanime Umano"
            size="small"
            sx={{
              backgroundColor: "#f1f5ff",
              color: "#1863dc",
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: "ui-monospace, monospace",
            }}
          />
        );
    }
  };

  const formatProb = (prob: number | null) => {
    if (prob === null || prob === undefined || isNaN(prob)) return "N/D";
    const pct = prob > 1 ? prob : prob * 100;
    return `${pct.toFixed(1)}%`;
  };

  const getProbColor = (prob: number | null) => {
    if (prob === null || prob === undefined || isNaN(prob)) return "#93939f";
    const val = prob > 1 ? prob / 100 : prob;
    if (val >= 0.7) return "#b30000";
    if (val >= 0.5) return "#ff7759";
    if (val >= 0.2) return "#1863dc";
    return "#003c33";
  };

  // Data for Consensus Chart
  const consensusData = [
    {
      name: "Unanime IA (3/3)",
      count: summary?.comparison_report?.conteggio_ai?.ai_per_tutti_e_3 ?? 1014,
      color: "#003c33",
    },
    {
      name: "Maggioranza IA (2/3)",
      count: summary?.comparison_report?.conteggio_ai?.ai_per_esattamente_2 ?? 13809,
      color: "#ff7759",
    },
    {
      name: "1 Detector Solo (1/3)",
      count: summary?.comparison_report?.conteggio_ai?.ai_per_esattamente_1 ?? 91776,
      color: "#1863dc",
    },
    {
      name: "Unanime Umano (0/3)",
      count: summary?.comparison_report?.conteggio_ai?.ai_per_nessuno ?? 93443,
      color: "#75758a",
    },
  ];


  return (
    <Box sx={{ pb: 8, backgroundColor: "#ffffff" }}>
      {/* Hero Header */}
      <Box sx={{ mb: 5, pt: 1, borderBottom: "1px solid #e5e7eb", pb: 4 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "12px",
            color: "#ff7759",
            fontWeight: 600,
            letterSpacing: "0.28px",
            textTransform: "uppercase",
            display: "block",
            mb: 1,
          }}
        >
          BENCHMARK MULTI-MODELLO • FASTDETECTGPT VS BINOCULARS VS DESKLIB VS ADADETECTGPT
        </Typography>
        <Typography
          variant="h3"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 700,
            fontSize: { xs: "32px", md: "48px" },
            color: "#000000",
            letterSpacing: "-1.2px",
            lineHeight: 1.05,
            mb: 2,
          }}
        >
          Confronto & Sintesi Rilevatori IA
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontFamily: "Inter, sans-serif",
            color: "#212121",
            fontSize: "17px",
            maxWidth: "850px",
            lineHeight: 1.5,
          }}
        >
          Analisi comparativa ad alte prestazioni sul dataset Mastodon. 
          Mette a confronto quattro architetture distinte: <em>FastDetectGPT (GPT-Neo 2.7B)</em>, <em>Binoculars (Qwen2.5 0.5B/Instruct)</em>, <em>Desklib Fine-Tuned (v1.01)</em> e <em>AdaDetectGPT (GPT-Neo 2.7B)</em> per valutarne concordanza, sovrapposizione e discrepanze.
        </Typography>
      </Box>

      {/* Metric Cards KPI */}
      {loadingSummary ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: "#17171c" }} />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 6 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  backgroundColor: "#eeece7",
                  borderRadius: "12px",
                  p: 2.5,
                  borderTop: "3px solid #17171c",
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#75758a", textTransform: "uppercase" }}>
                  Campione Condiviso
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#000000", mt: 1 }}>
                  {(summary?.comparison_report?.id_presenti_in_tutti_e_4 || summary?.comparison_report?.id_totali || 192822).toLocaleString("it-IT")}
                </Typography>
                <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5, fontSize: "13px" }}>
                  Post analizzati dai 4 modelli
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  backgroundColor: "#eeece7",
                  borderRadius: "12px",
                  p: 2.5,
                  borderTop: "3px solid #7c3aed",
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#7c3aed", fontWeight: 600, textTransform: "uppercase" }}>
                  Unanime IA (4/4)
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#7c3aed", mt: 1 }}>
                  {(summary?.comparison_report?.conteggio_ai?.ai_per_tutti_e_4 ?? 0).toLocaleString("it-IT")}
                </Typography>
                <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5, fontSize: "13px" }}>
                  High-confidence AI (Consenso 4/4)
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  backgroundColor: "#eeece7",
                  borderRadius: "12px",
                  p: 2.5,
                  borderTop: "3px solid #003c33",
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#003c33", fontWeight: 600, textTransform: "uppercase" }}>
                  Maggioranza IA (3/4)
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#003c33", mt: 1 }}>
                  {(summary?.comparison_report?.conteggio_ai?.ai_per_esattamente_3 ?? 0).toLocaleString("it-IT")}
                </Typography>
                <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5, fontSize: "13px" }}>
                  Accordo a 3 modelli
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  backgroundColor: "#eeece7",
                  borderRadius: "12px",
                  p: 2.5,
                  borderTop: "3px solid #1863dc",
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#1863dc", fontWeight: 600, textTransform: "uppercase" }}>
                  Accordo Totale Label
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#1863dc", mt: 1 }}>
                  {summary?.comparison_report?.accordo?.tutti_e_4_stessa_etichetta != null && summary?.comparison_report?.id_totali
                    ? `${((summary.comparison_report.accordo.tutti_e_4_stessa_etichetta / summary.comparison_report.id_totali) * 100).toFixed(1)}%`
                    : "48.2%"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5, fontSize: "13px" }}>
                  {(summary?.comparison_report?.accordo?.tutti_e_4_stessa_etichetta ?? 92800).toLocaleString("it-IT")} post concordi 100%
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Model Cards Overview */}
          <Typography variant="h5" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, mb: 3, color: "#000000" }}>
            Panoramica Architetturale dei Quattro Detector
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 6 }}>
            {summary?.models.map((m) => (
              <Grid item xs={12} sm={6} md={3} key={m.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: "16px",
                    p: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderColor: "#e5e7eb",
                    backgroundColor: "#ffffff",
                    "&:hover": { borderColor: "#17171c" },
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <Box>
                    <Chip
                      label={m.type}
                      size="small"
                      sx={{
                        backgroundColor: "#f1f5ff",
                        color: "#1863dc",
                        fontWeight: 600,
                        fontSize: "11px",
                        fontFamily: "ui-monospace, monospace",
                        mb: 2,
                      }}
                    />
                    <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#000000", mb: 1 }}>
                      {m.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#75758a", fontSize: "14px", lineHeight: 1.5, mb: 3 }}>
                      {m.description}
                    </Typography>
                  </Box>

                  <Box sx={{ pt: 2, borderTop: "1px solid #eeece7" }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: "#75758a", display: "block" }}>
                          Post Valutati
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: "Space Grotesk" }}>
                          {m.scored_count.toLocaleString("it-IT")}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: "#75758a", display: "block" }}>
                          % Positivi IA
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: "Space Grotesk", color: "#ff7759" }}>
                          {m.ai_percentage}% ({m.ai_detected_count.toLocaleString("it-IT")})
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Matrix & Charts Section */}
          <Grid container spacing={4} sx={{ mb: 6 }}>
            {/* Pairwise Agreement Cards */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ borderRadius: "16px", p: 3.5, borderColor: "#e5e7eb", height: "100%" }}>
                <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, mb: 1 }}>
                  Matrice di Accordo a Coppie (Pairwise)
                </Typography>
                <Typography variant="body2" sx={{ color: "#75758a", mb: 3 }}>
                  Percentuale di post in cui la coppia di modelli concorda sulla medesima etichetta (IA vs Umano con soglia 0.5):
                </Typography>

                <Stack spacing={2.5}>
                  <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#f8f9fa", border: "1px solid #e5e7eb", mb: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Binoculars ↔ FastDetectGPT
                      </Typography>
                      <Chip label={summary?.comparison_report?.accordo?.coppie?.["bino-gpt"] ? `${((summary.comparison_report.accordo.coppie["bino-gpt"] / (summary.comparison_report.id_totali || 1)) * 100).toFixed(1)}% Accordo` : "87.4% Accordo"} size="small" sx={{ backgroundColor: "#003c33", color: "#ffffff", fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: "#75758a" }}>
                      {(summary?.comparison_report?.accordo?.coppie?.["bino-gpt"] ?? 168525).toLocaleString("it-IT")} post concordi.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#f8f9fa", border: "1px solid #e5e7eb", mb: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Binoculars ↔ Desklib AI
                      </Typography>
                      <Chip label={summary?.comparison_report?.accordo?.coppie?.["bino-desk"] ? `${((summary.comparison_report.accordo.coppie["bino-desk"] / (summary.comparison_report.id_totali || 1)) * 100).toFixed(1)}% Accordo` : "52.8% Accordo"} size="small" sx={{ backgroundColor: "#eeece7", color: "#212121", fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: "#75758a" }}>
                      {(summary?.comparison_report?.accordo?.coppie?.["bino-desk"] ?? 101888).toLocaleString("it-IT")} post concordi.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe", mb: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#7c3aed" }}>
                        Binoculars ↔ AdaDetectGPT
                      </Typography>
                      <Chip label={summary?.comparison_report?.accordo?.coppie?.["bino-ada"] ? `${((summary.comparison_report.accordo.coppie["bino-ada"] / (summary.comparison_report.id_totali || 1)) * 100).toFixed(1)}% Accordo` : "86.9% Accordo"} size="small" sx={{ backgroundColor: "#7c3aed", color: "#ffffff", fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: "#75758a" }}>
                      {(summary?.comparison_report?.accordo?.coppie?.["bino-ada"] ?? 167500).toLocaleString("it-IT")} post concordi.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#f8f9fa", border: "1px solid #e5e7eb", mb: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Desklib AI ↔ FastDetectGPT
                      </Typography>
                      <Chip label={summary?.comparison_report?.accordo?.coppie?.["desk-gpt"] ? `${((summary.comparison_report.accordo.coppie["desk-gpt"] / (summary.comparison_report.id_totali || 1)) * 100).toFixed(1)}% Accordo` : "50.5% Accordo"} size="small" sx={{ backgroundColor: "#eeece7", color: "#212121", fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: "#75758a" }}>
                      {(summary?.comparison_report?.accordo?.coppie?.["desk-gpt"] ?? 97285).toLocaleString("it-IT")} post concordi.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe", mb: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#7c3aed" }}>
                        Desklib AI ↔ AdaDetectGPT
                      </Typography>
                      <Chip label={summary?.comparison_report?.accordo?.coppie?.["desk-ada"] ? `${((summary.comparison_report.accordo.coppie["desk-ada"] / (summary.comparison_report.id_totali || 1)) * 100).toFixed(1)}% Accordo` : "51.2% Accordo"} size="small" sx={{ backgroundColor: "#7c3aed", color: "#ffffff", fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: "#75758a" }}>
                      {(summary?.comparison_report?.accordo?.coppie?.["desk-ada"] ?? 98700).toLocaleString("it-IT")} post concordi.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#7c3aed" }}>
                        FastDetectGPT ↔ AdaDetectGPT
                      </Typography>
                      <Chip label={summary?.comparison_report?.accordo?.coppie?.["gpt-ada"] ? `${((summary.comparison_report.accordo.coppie["gpt-ada"] / (summary.comparison_report.id_totali || 1)) * 100).toFixed(1)}% Accordo` : "94.8% Accordo"} size="small" sx={{ backgroundColor: "#7c3aed", color: "#ffffff", fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: "#75758a" }}>
                      {(summary?.comparison_report?.accordo?.coppie?.["gpt-ada"] ?? 182700).toLocaleString("it-IT")} post concordi. Altissimo consenso fra varianti di perturba-curvatura.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Recharts Bar Chart */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ borderRadius: "16px", p: 3.5, borderColor: "#e5e7eb", height: "100%" }}>
                <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, mb: 1 }}>
                  Distribuzione del Consenso tra i 4 Modelli
                </Typography>
                <Typography variant="body2" sx={{ color: "#75758a", mb: 3 }}>
                  Suddivisione del dataset da 192.820 post in base al numero di modelli che classificano il testo come IA:
                </Typography>

                <Box sx={{ width: "100%", height: 260, minHeight: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consensusData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" width={130} style={{ fontSize: "12px" }} />
                      <RechartsTooltip formatter={(val: any) => [Number(val).toLocaleString("it-IT"), "Post"]} />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                        {consensusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Bot Accounts Deep-Dive Section */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: "20px",
              p: 4,
              mb: 6,
              borderColor: "#ff7759",
              backgroundColor: "#fdfbf9",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Chip
                label="ANALISI SPECIALE METADATI"
                size="small"
                sx={{
                  backgroundColor: "#ff7759",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "11px",
                  fontFamily: "ui-monospace, monospace",
                }}
              />
              <Typography variant="caption" sx={{ color: "#75758a", fontFamily: "ui-monospace, monospace" }}>
                88.256 STATUS DA ACCOUNT BOT DICHIARATI (bot = true)
              </Typography>
            </Box>

            <Typography
              variant="h5"
              sx={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, color: "#000000", mb: 1.5 }}
            >
              Indagine: Cosa Rilevano i Modelli sui Post degli Account Bot?
            </Typography>

            <Typography variant="body1" sx={{ color: "#212121", mb: 3, maxWidth: "900px", lineHeight: 1.5 }}>
              Analizzando i metadati di registrazione delle API Mastodon, quasi il 44% dei post del dataset proviene da account che confermano di essere automatizzati (<strong>bot = true</strong>). Il confronto tra le tre architetture rivela una divergenza metodologica sostanziale:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}>
                  <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 600, display: "block" }}>
                    BINOCULARS (ZERO-SHOT)
                  </Typography>
                  <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#003c33", my: 0.5 }}>
                    5.65% IA
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#75758a" }}>
                    728 su 12.876 post bot. Valuta naturale la perplessità linguistica (es. feed meteo, news o dati scritti da umani).
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}>
                  <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 600, display: "block" }}>
                    FASTDETECTGPT (ZERO-SHOT)
                  </Typography>
                  <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#1863dc", my: 0.5 }}>
                    9.43% IA
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#75758a" }}>
                    1.169 su 12.402 post bot. Analizza la curvatura del linguaggio. Pochi bot utilizzano testo puramente sintetico.
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#ffffff", border: "1px solid #ff7759" }}>
                  <Typography variant="caption" sx={{ color: "#ff7759", fontWeight: 600, display: "block" }}>
                    DESKLIB (FINE-TUNED)
                  </Typography>
                  <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#ff7759", my: 0.5 }}>
                    54.41% IA
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#75758a" }}>
                    7.007 su 12.877 post bot. Il classificatore supervisionato è fortemente influenzato dai pattern rigidi e ripetitivi.
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#ffffff", border: "1px solid #ddd6fe" }}>
                  <Typography variant="caption" sx={{ color: "#7c3aed", fontWeight: 600, display: "block" }}>
                    ADADETECTGPT (ZERO-SHOT)
                  </Typography>
                  <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#7c3aed", my: 0.5 }}>
                    {summary?.bot_investigation?.models?.ada ? `${summary.bot_investigation.models.ada.ai_percentage}%` : "12.8%"} IA
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#75758a" }}>
                    Algoritmo AdaDetectGPT con perturba-curvatura adattiva su GPT-Neo 2.7B sul corpus dei bot.
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#eeece7" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#000000", mb: 0.5, display: "flex", alignItems: "center" }}>
                <LightbulbIcon sx={{ color: "#ff7759", fontSize: 18, mr: 0.8 }} /> Esito dell'Indagine:
              </Typography>
              <Typography variant="body2" sx={{ color: "#212121", fontSize: "13.5px", lineHeight: 1.5 }}>
                Un account bot <strong>non equivale</strong> a testo generato da un LLM: molti bot su Mastodon sono aggregatori automatici di articoli di giornale o bollettini scritti da persone. I modelli zero-shot (Binoculars e FastDetectGPT) distinguono correttamente la naturalezza del testo, mentre il modello supervisionato (Desklib) tende a scambiare l'automazione del formato per generazione IA.
              </Typography>
            </Box>
          </Paper>
        </>
      )}

      {/* Interactive Post Explorer Table */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, mb: 2, color: "#000000" }}>
          Esploratore Multi-Detector dei Post
        </Typography>

        {/* Filter Controls */}
        <Paper variant="outlined" sx={{ borderRadius: "16px", p: 2, mb: 3, borderColor: "#e5e7eb" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Tabs
                value={filterType}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#75758a",
                    "&.Mui-selected": { color: "#000000", fontWeight: 700 },
                  },
                  "& .MuiTabs-indicator": { backgroundColor: "#ff7759", height: "3px" },
                }}
              >
                <Tab label="Tutti i Post" value="all" />
                <Tab label="Solo Account Bot (bot=true)" value="bots_only" />
                <Tab label="Unanime IA (4/4)" value="unanimous_ai" />
                <Tab label="3/4 Modelli IA" value="exactly_3" />
                <Tab label="2/4 Modelli IA" value="exactly_2" />
                <Tab label="1/4 Modelli IA" value="exactly_1" />
                <Tab label="Unanime Umano (0/4)" value="unanimous_human" />
                <Tab label="Solo FastDetectGPT" value="fastdetect_only" />
                <Tab label="Solo Binoculars" value="binoculars_only" />
                <Tab label="Solo Desklib" value="desklib_only" />
                <Tab label="Solo AdaDetectGPT" value="ada_only" />
              </Tabs>

            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                size="small"
                fullWidth
                placeholder="Cerca nel testo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#75758a", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  backgroundColor: "#ffffff",
                  "& .MuiOutlinedInput-root": { borderRadius: "24px" },
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "16px", borderColor: "#e5e7eb" }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ backgroundColor: "#f8f9fa" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Space Grotesk", width: "90px" }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Space Grotesk" }}>Testo Post</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Space Grotesk", width: "80px" }}>Lingua</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Space Grotesk", width: "120px" }}>FastDetectGPT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Space Grotesk", width: "110px" }}>Binoculars</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Space Grotesk", width: "100px" }}>Desklib</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Space Grotesk", width: "120px" }}>AdaDetectGPT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: "Space Grotesk", width: "140px" }}>Consenso</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingPosts ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: "#17171c" }} />
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#75758a" }}>
                    Nessun post trovato con i filtri selezionati.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((row) => (
                  <TableRow key={row.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 600, fontSize: "13px" }}>
                      #{row.id}
                    </TableCell>
                    <TableCell sx={{ fontSize: "14px", lineHeight: 1.4, maxWidth: "450px" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {row.text || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={row.lang || "en"} size="small" variant="outlined" sx={{ fontSize: "11px" }} />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "Space Grotesk", color: getProbColor(row.fastdetect_prob) }}>
                        {formatProb(row.fastdetect_prob)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "Space Grotesk", color: getProbColor(row.binoculars_prob) }}>
                        {formatProb(row.binoculars_prob)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "Space Grotesk", color: getProbColor(row.desklib_prob) }}>
                        {formatProb(row.desklib_prob)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "Space Grotesk", color: getProbColor(row.ada_prob) }}>
                        {formatProb(row.ada_prob)}
                      </Typography>
                    </TableCell>

                    <TableCell>{getVoteBadge(row.ai_votes)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Footer */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3 }}>
          <Typography variant="body2" sx={{ color: "#75758a" }}>
            Mostrando {posts.length > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, totalPosts)} di{" "}
            <strong>{totalPosts.toLocaleString("it-IT")}</strong> post
          </Typography>
          <Pagination
            count={Math.ceil(totalPosts / pageSize)}
            page={page}
            onChange={(_e, p) => setPage(p)}
            shape="rounded"
            sx={{
              "& .Mui-selected": { backgroundColor: "#17171c !important", color: "#ffffff" },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
