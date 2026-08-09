import {
  Box,
  Grid,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  LinearProgress,
} from "@mui/material";
import {
  EmojiEvents as TrophyIcon,
  Insights as InsightsIcon,
  CheckCircle as CheckIcon,
  Functions as MathIcon,
  Hub as GraphIcon,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { InfluenceComparisonResponse } from "../api/client.ts";

interface Props {
  data: InfluenceComparisonResponse;
}

/**
 * Componente per il confronto degli algoritmi di Influence Maximization (IM)
 * in perfetto accordo con le linee guida visive ed architetturali di DESIGN.md.
 * 
 * Token cromatici & stilistici da DESIGN.md:
 * - Near-Black Primary: #17171c (Card scure, CTA principali)
 * - Deep Enterprise Green: #003c33 (Sezioni prodotto ad alte prestazioni)
 * - Action Blue: #1863dc (Link e metriche secondarie)
 * - Coral: #ff7759 (Chip di tassonomia e accenti caldi)
 * - Soft Stone: #eeece7 (Superfici neutre calde)
 * - Border Light: #e5e7eb (Bordi sottili di contenimento)
 * - Tipografia: Space Grotesk (Display) + ui-monospace (Etichette tecniche)
 * - Raggi di curvatura: 16px (Card medie) / 22px (Card hero e contenitori media) / 32px (Pill CTAs)
 */
export default function InfluenceAlgorithmComparison({ data }: Props) {
  const { subgraph, eval_runs, algorithms, seed_overlap_jaccard, winner_by_mc_spread } = data;

  // Formattazione dati per il grafico degli Spread Monte Carlo
  const spreadChartData = Object.entries(algorithms).map(([name, info]) => ({
    name,
    mc_spread: info.mc_spread,
    est_spread: info.est_spread || 0,
    time_s: info.time_s,
    n_seeds: info.n_seeds,
    percentage: ((info.mc_spread / subgraph.nodes) * 100).toFixed(2),
    isWinner: name === winner_by_mc_spread,
  }));
  spreadChartData.sort((a, b) => b.mc_spread - a.mc_spread);

  // Formattazione dati per il grafico dei Tempi di Calcolo
  const timeChartData = Object.entries(algorithms).map(([name, info]) => ({
    name,
    time_s: info.time_s,
    display_time: info.time_s < 1 ? "< 1s" : `${info.time_s.toFixed(1)}s`,
    isWinner: name === winner_by_mc_spread,
  }));
  timeChartData.sort((a, b) => b.time_s - a.time_s);

  // Tabella comparativa ordinata
  const tableRows = Object.entries(algorithms).map(([name, info]) => {
    const coveragePct = ((info.mc_spread / subgraph.nodes) * 100).toFixed(2);
    const speedRatio = info.time_s > 0 ? (info.mc_spread / info.time_s).toFixed(1) : "N/D (Istante)";
    return {
      name,
      ...info,
      coveragePct,
      speedRatio,
      isWinner: name === winner_by_mc_spread,
    };
  });
  tableRows.sort((a, b) => b.mc_spread - a.mc_spread);

  // Matrice di sovrapposizione Jaccard
  const algoList = Object.keys(algorithms);
  const getJaccardScore = (a: string, b: string): number => {
    if (a === b) return 1.0;
    const pair1 = `${a}|${b}`;
    const pair2 = `${b}|${a}`;
    if (seed_overlap_jaccard[pair1] !== undefined) return seed_overlap_jaccard[pair1];
    if (seed_overlap_jaccard[pair2] !== undefined) return seed_overlap_jaccard[pair2];
    return 0;
  };

  // Palette cromatica rigorosamente allineata a DESIGN.md
  const getAlgorithmColor = (name: string) => {
    switch (name) {
      case "CELF++":
        return "#7c3aed"; // Deep Purple accent
      case "PMIA":
        return "#003c33"; // Deep Enterprise Green
      case "SKIM":
        return "#ff7759"; // Cohere Coral
      case "degree":
        return "#1863dc"; // Action Blue
      case "pagerank":
        return "#0d9488"; // Teal
      default:
        return "#17171c"; // Near-Black Primary
    }
  };

  return (
    <Box sx={{ pt: 1, pb: 6 }}>
      {/* Hero Banner Dark Band (DESIGN.md: dark product hero band style, 22px radius, tight display type) */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4.5 },
          mb: 4,
          borderRadius: "22px",
          background: "linear-gradient(135deg, #17171c 0%, #003c33 100%)",
          color: "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2.5, flexWrap: "wrap" }}>
              <Chip
                label="BENCHMARK AUDIT • ALGORITHM EVALUATION"
                sx={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#ff7759",
                  backgroundColor: "rgba(255, 119, 89, 0.12)",
                  border: "1px solid rgba(255, 119, 89, 0.3)",
                  px: 0.5,
                  height: "26px",
                }}
              />
              <Chip
                icon={<TrophyIcon sx={{ fontSize: 15, color: "#ffd700 !important" }} />}
                label={`SPREAD VINCITORE: ${winner_by_mc_spread}`}
                sx={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#d8b4fe",
                  backgroundColor: "rgba(124, 58, 237, 0.25)",
                  border: "1px solid rgba(124, 58, 237, 0.4)",
                  height: "26px",
                }}
              />
            </Box>

            <Typography
              variant="h3"
              sx={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 400,
                fontSize: { xs: "28px", md: "38px" },
                color: "#ffffff",
                letterSpacing: "-1.0px",
                lineHeight: 1.1,
                mb: 2,
              }}
            >
              Confronto Algoritmi di Selezione Seed
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: "#93939f",
                fontSize: "16px",
                lineHeight: 1.6,
                maxWidth: 720,
              }}
            >
              Valutazione sperimentale rigorosa sullo <strong style={{ color: "#ffffff" }}>stesso sottografo di 10.000 nodi e 313.221 archi</strong>.
              Tutti gli algoritmi sono valutati tramite <strong style={{ color: "#ff7759" }}>{eval_runs} simulazioni Monte Carlo Independent Cascade</strong> indipendenti.
            </Typography>
          </Grid>

          {/* Key Insight Agent Console Card (DESIGN.md: agent-console-card) */}
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                backgroundColor: "rgba(23, 23, 28, 0.7)",
                backdropFilter: "blur(12px)",
                borderRadius: "16px",
                p: 3,
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "11px",
                  color: "#75758a",
                  textTransform: "uppercase",
                  letterSpacing: "0.28px",
                  display: "block",
                  mb: 1.5,
                }}
              >
                BENCHMARK EXECUTIVE SUMMARY
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ color: "#eeece7" }}>Spread Max (CELF++):</Typography>
                  <Typography variant="subtitle2" sx={{ color: "#a78bfa", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                    2.571 nodi (25,7%)
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ color: "#eeece7" }}>Spread PMIA:</Typography>
                  <Typography variant="subtitle2" sx={{ color: "#6ee7b7", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                    2.567 nodi (99,8%)
                  </Typography>
                </Box>

                <Box sx={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", pt: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ color: "#eeece7" }}>Efficienza Temporale:</Typography>
                  <Chip
                    label="PMIA 4,4s vs CELF++ 4.228s"
                    size="small"
                    sx={{
                      backgroundColor: "rgba(34, 197, 94, 0.15)",
                      color: "#4ade80",
                      fontFamily: "ui-monospace, monospace",
                      fontWeight: 600,
                      fontSize: "11px",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Cards Grid (DESIGN.md: Soft Stone surface, 16px radius, mono uppercase headers) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "16px",
              backgroundColor: "#eeece7",
              border: "1px solid #d9d9dd",
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "11px",
                  color: "#75758a",
                  letterSpacing: "0.28px",
                  textTransform: "uppercase",
                }}
              >
                BENCHMARK GRAPH
              </Typography>
              <GraphIcon sx={{ fontSize: 20, color: "#ff7759" }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 600,
                fontSize: "32px",
                color: "#17171c",
                letterSpacing: "-0.32px",
              }}
            >
              {subgraph.nodes.toLocaleString("it-IT")}
            </Typography>
            <Typography variant="caption" sx={{ color: "#75758a", mt: 0.5, display: "block" }}>
              Nodi • {subgraph.edges.toLocaleString("it-IT")} Archi
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "16px",
              backgroundColor: "#eeece7",
              border: "1px solid #d9d9dd",
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "11px",
                  color: "#75758a",
                  letterSpacing: "0.28px",
                  textTransform: "uppercase",
                }}
              >
                CANDIDATI IA & BUDGET
              </Typography>
              <MathIcon sx={{ fontSize: 20, color: "#1863dc" }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 600,
                fontSize: "32px",
                color: "#17171c",
                letterSpacing: "-0.32px",
              }}
            >
              {subgraph.candidates}
            </Typography>
            <Typography variant="caption" sx={{ color: "#75758a", mt: 0.5, display: "block" }}>
              Account IA Candidati • k = {data.k}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "16px",
              backgroundColor: "#eeece7",
              border: "1px solid #d9d9dd",
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "11px",
                  color: "#75758a",
                  letterSpacing: "0.28px",
                  textTransform: "uppercase",
                }}
              >
                MAX MONTE CARLO SPREAD
              </Typography>
              <TrophyIcon sx={{ fontSize: 20, color: "#7c3aed" }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 600,
                fontSize: "32px",
                color: "#7c3aed",
                letterSpacing: "-0.32px",
              }}
            >
              2.571,5
            </Typography>
            <Typography variant="caption" sx={{ color: "#75758a", mt: 0.5, display: "block" }}>
              Nodi attivati (CELF++)
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "16px",
              backgroundColor: "#eeece7",
              border: "1px solid #d9d9dd",
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "11px",
                  color: "#75758a",
                  letterSpacing: "0.28px",
                  textTransform: "uppercase",
                }}
              >
                VALUTAZIONE COMUNE
              </Typography>
              <InsightsIcon sx={{ fontSize: 20, color: "#003c33" }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 600,
                fontSize: "32px",
                color: "#003c33",
                letterSpacing: "-0.32px",
              }}
            >
              {eval_runs}
            </Typography>
            <Typography variant="caption" sx={{ color: "#75758a", mt: 0.5, display: "block" }}>
              Simulazioni MC per ogni algoritmo
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Charts Section (DESIGN.md: 22px radius cards, clean borders) */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {/* Monte Carlo Spread Comparison Bar Chart */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: "22px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              height: "100%",
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: "20px",
                  color: "#17171c",
                  letterSpacing: "-0.32px",
                }}
              >
                Spread Reale Monte Carlo (Nodi Attivati)
              </Typography>
              <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5 }}>
                Valutazione imparziale della copertura media su {eval_runs} simulazioni Independent Cascade.
              </Typography>
            </Box>

            <Box sx={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spreadChartData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#75758a" tick={{ fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif" }} />
                  <YAxis domain={[0, 3000]} stroke="#75758a" tick={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const row = payload[0].payload;
                        return (
                          <Paper sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: getAlgorithmColor(row.name), fontFamily: "Space Grotesk, sans-serif" }}>
                              {row.name} {row.isWinner && "🏆 (Vincitore Spread)"}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              <strong>Spread Monte Carlo:</strong> {row.mc_spread.toLocaleString("it-IT")} nodi
                            </Typography>
                            <Typography variant="body2">
                              <strong>Copertura Sottografo:</strong> {row.percentage}%
                            </Typography>
                            <Typography variant="body2">
                              <strong>Stima Teorica:</strong> {row.est_spread ? row.est_spread.toLocaleString("it-IT") : "N/D"}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Tempo Calcolo:</strong> {row.time_s}s
                            </Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="mc_spread" name="Spread Reale MC" radius={[8, 8, 0, 0]}>
                    {spreadChartData.map((entry) => (
                      <Cell key={entry.name} fill={getAlgorithmColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Execution Time Comparison Bar Chart */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: "22px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              height: "100%",
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: "20px",
                  color: "#17171c",
                  letterSpacing: "-0.32px",
                }}
              >
                Tempo di Calcolo (Secondi)
              </Typography>
              <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5 }}>
                Scalabilità computazionale dei diversi metodi di selezione.
              </Typography>
            </Box>

            <Box sx={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeChartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#75758a" tick={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }} />
                  <YAxis dataKey="name" type="category" stroke="#75758a" tick={{ fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif" }} width={75} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const row = payload[0].payload;
                        return (
                          <Paper sx={{ p: 1.5, border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{row.name}</Typography>
                            <Typography variant="body2">Tempo: {row.time_s} secondi</Typography>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="time_s" name="Tempo (secondi)" radius={[0, 8, 8, 0]}>
                    {timeChartData.map((entry) => (
                      <Cell key={entry.name} fill={getAlgorithmColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Detailed Benchmark Table (DESIGN.md: research-table style, rule-driven, thin hairline borders) */}
      <Paper elevation={0} sx={{ p: 4, mb: 5, borderRadius: "22px", border: "1px solid #e5e7eb" }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 600,
              fontSize: "22px",
              color: "#17171c",
              letterSpacing: "-0.32px",
            }}
          >
            Tabella Comparativa Dettagliata Algoritmi
          </Typography>
          <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5 }}>
            Metriche numeriche complete, stime teoriche e tempi di esecuzione misurati.
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#fafafa", borderBottom: "2px solid #e5e7eb" }}>
                <TableCell sx={{ fontWeight: 700, color: "#17171c", fontFamily: "Inter, sans-serif" }}>Algoritmo</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: "#17171c", fontFamily: "Inter, sans-serif" }}>Seed Selezionati</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "#17171c", fontFamily: "Inter, sans-serif" }}>Stima Teorica</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "#17171c", fontFamily: "Inter, sans-serif" }}>Spread MC Reale</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "#17171c", fontFamily: "Inter, sans-serif" }}>Copertura Sottografo</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "#17171c", fontFamily: "Inter, sans-serif" }}>Tempo Calcolo</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: "#17171c", fontFamily: "Inter, sans-serif" }}>Stato / Badge</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow
                  key={row.name}
                  sx={{
                    backgroundColor: row.isWinner ? "rgba(124, 58, 237, 0.02)" : "inherit",
                    "&:hover": { backgroundColor: "#f9fafb" },
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: getAlgorithmColor(row.name),
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#17171c", fontFamily: "Space Grotesk, sans-serif" }}>
                        {row.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace" }}>
                      {row.n_seeds} / {subgraph.candidates}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ color: "#75758a", fontFamily: "ui-monospace, monospace" }}>
                      {row.est_spread !== null ? row.est_spread.toLocaleString("it-IT") : "N/D (Baseline)"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: row.isWinner ? "#7c3aed" : "#17171c",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {row.mc_spread.toLocaleString("it-IT")}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "ui-monospace, monospace" }}>
                        {row.coveragePct}%
                      </Typography>
                      <Box sx={{ width: 60 }}>
                        <LinearProgress
                          variant="determinate"
                          value={parseFloat(row.coveragePct)}
                          sx={{
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: "#eeece7",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: getAlgorithmColor(row.name),
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace" }}>
                      {row.time_s < 0.01 ? "0,00 s" : `${row.time_s.toFixed(2)} s`}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {row.isWinner ? (
                      <Chip
                        icon={<TrophyIcon sx={{ fontSize: 13, color: "#ffffff !important" }} />}
                        label="Top Spread"
                        size="small"
                        sx={{
                          backgroundColor: "#7c3aed",
                          color: "#ffffff",
                          fontFamily: "ui-monospace, monospace",
                          fontWeight: 700,
                          fontSize: "11px",
                          borderRadius: "32px",
                        }}
                      />
                    ) : row.name === "PMIA" ? (
                      <Chip
                        icon={<CheckIcon sx={{ fontSize: 13, color: "#ffffff !important" }} />}
                        label="Top Efficienza"
                        size="small"
                        sx={{
                          backgroundColor: "#003c33",
                          color: "#ffffff",
                          fontFamily: "ui-monospace, monospace",
                          fontWeight: 700,
                          fontSize: "11px",
                          borderRadius: "32px",
                        }}
                      />
                    ) : (
                      <Chip
                        label="Standard"
                        size="small"
                        sx={{
                          backgroundColor: "#eeece7",
                          color: "#75758a",
                          fontFamily: "ui-monospace, monospace",
                          fontWeight: 500,
                          fontSize: "11px",
                          borderRadius: "32px",
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Jaccard Seed Overlap Matrix & Topology Analysis */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3.5, borderRadius: "22px", border: "1px solid #e5e7eb", height: "100%", backgroundColor: "#ffffff" }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 600,
                fontSize: "20px",
                color: "#17171c",
                mb: 1,
              }}
            >
              Matrice Sovrapposizione Seed (Indice di Jaccard)
            </Typography>
            <Typography variant="body2" sx={{ color: "#75758a", mb: 3 }}>
              Misura della similarità tra i set di seed scelti dai diversi algoritmi.
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#fafafa" }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px", fontFamily: "Inter, sans-serif" }}>Algoritmo</TableCell>
                    {algoList.map((a) => (
                      <TableCell key={a} align="center" sx={{ fontWeight: 700, fontSize: "12px", px: 1, fontFamily: "Inter, sans-serif" }}>
                        {a}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {algoList.map((rowAlgo) => (
                    <TableRow key={rowAlgo}>
                      <TableCell sx={{ fontWeight: 700, fontSize: "13px", fontFamily: "Space Grotesk, sans-serif" }}>{rowAlgo}</TableCell>
                      {algoList.map((colAlgo) => {
                        const score = getJaccardScore(rowAlgo, colAlgo);
                        const isFull = score >= 0.999;
                        return (
                          <TableCell
                            key={colAlgo}
                            align="center"
                            sx={{
                              px: 1,
                              backgroundColor: isFull
                                ? "rgba(34, 197, 94, 0.12)"
                                : score > 0.4
                                ? "rgba(245, 158, 11, 0.1)"
                                : "transparent",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: isFull ? 700 : 500,
                                color: isFull ? "#15803d" : "#17171c",
                                fontFamily: "ui-monospace, monospace",
                              }}
                            >
                              {(score * 100).toFixed(0)}%
                            </Typography>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3.5, borderRadius: "22px", border: "1px solid #e5e7eb", height: "100%", backgroundColor: "#ffffff" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <InsightsIcon sx={{ color: "#1863dc" }} />
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: "20px",
                  color: "#17171c",
                }}
              >
                Analisi Topologica della Convergenza
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: "#75758a", mb: 2.5, lineHeight: 1.6 }}>
              L'indice di Jaccard pari a <strong style={{ color: "#15803d" }}>1.0 (100%)</strong> tra PMIA, CELF++, Degree e PageRank dimostra che la struttura snowball del grafo sociale concentra la capacità di propagazione sui medesimi account bot IA centrali.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              <Paper sx={{ p: 2.5, backgroundColor: "#eeece7", borderRadius: "16px", border: "1px solid #d9d9dd" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#17171c", mb: 0.5, fontFamily: "Space Grotesk, sans-serif" }}>
                  Convergenza Euristiche vs Monte Carlo
                </Typography>
                <Typography variant="body2" sx={{ color: "#212121", fontSize: "14px", lineHeight: 1.5 }}>
                  Le euristiche basate sugli alberi di influenza locali (PMIA) selezionano esattamente gli stessi seed del costoso algoritmo Monte Carlo Greedy (CELF++), ottenendo il 99,8% di spread in 4,4s.
                </Typography>
              </Paper>

              <Paper sx={{ p: 2.5, backgroundColor: "#eeece7", borderRadius: "16px", border: "1px solid #d9d9dd" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#17171c", mb: 0.5, fontFamily: "Space Grotesk, sans-serif" }}>
                  Comportamento SKIM (RR-Sets)
                </Typography>
                <Typography variant="body2" sx={{ color: "#212121", fontSize: "14px", lineHeight: 1.5 }}>
                  SKIM ha selezionato 405 seed raggiungendo uno spread di 1.996 nodi in 0,81 secondi con un Jaccard del 49.3%, dimostrando l'efficienza dei campionamenti Reverse Reachable Sets.
                </Typography>
              </Paper>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Product Card 3-Column Grid (DESIGN.md: 3-column desktop layout, capability-card style, 16px radius) */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 600,
            fontSize: "22px",
            color: "#17171c",
            mb: 2.5,
            letterSpacing: "-0.32px",
          }}
        >
          Meccanismi ed Algoritmi a Confronto
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
              <CardContent sx={{ p: 3 }}>
                <Chip
                  label="ALBERI DI INFLUENZA"
                  size="small"
                  sx={{
                    backgroundColor: "rgba(0,60,51,0.1)",
                    color: "#003c33",
                    mb: 2,
                    fontWeight: 700,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "11px",
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontFamily: "Space Grotesk, sans-serif" }}>PMIA</Typography>
                <Typography variant="body2" sx={{ color: "#75758a", fontSize: "14px", lineHeight: 1.6 }}>
                  Prefix-Tree Maximum Influence Path. Costruisce alberi locali di influenza definendo percorsi di propagazione massima sopra una soglia &theta;. Offre una velocità vicina ai metodi euristici con la precisione del greedy.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
              <CardContent sx={{ p: 3 }}>
                <Chip
                  label="GREEDY MONTE CARLO"
                  size="small"
                  sx={{
                    backgroundColor: "rgba(124,58,237,0.1)",
                    color: "#7c3aed",
                    mb: 2,
                    fontWeight: 700,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "11px",
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontFamily: "Space Grotesk, sans-serif" }}>CELF++</Typography>
                <Typography variant="body2" sx={{ color: "#75758a", fontSize: "14px", lineHeight: 1.6 }}>
                  Cost-Effective Lazy Forwarding con ottimizzazione a due livelli. Garanzia teorica (1 - 1/e), ma richiede numerose simulazioni Monte Carlo su ogni iterazione, risultando computazionalmente oneroso su grafi estesi.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
              <CardContent sx={{ p: 3 }}>
                <Chip
                  label="REVERSE REACHABLE SETS"
                  size="small"
                  sx={{
                    backgroundColor: "rgba(255,119,89,0.1)",
                    color: "#ff7759",
                    mb: 2,
                    fontWeight: 700,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "11px",
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontFamily: "Space Grotesk, sans-serif" }}>SKIM</Typography>
                <Typography variant="body2" sx={{ color: "#75758a", fontSize: "14px", lineHeight: 1.6 }}>
                  Sketch-Based Influence Maximization. Utilizza campionamenti di Reverse Reachable (RR) Sets per stimare la copertura potenziale in modo scalabile senza dover simulare la cascata diretta.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
