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
import { tokens } from "../theme.ts";

interface Props {
  data: InfluenceComparisonResponse;
}

/**
 * Confronto degli algoritmi di Influence Maximization: spread Monte Carlo,
 * tempi di calcolo e sovrapposizione dei seed selezionati (indice di Jaccard).
 *
 * I valori visivi vengono da `tokens` in theme.ts. Qui c'era un elenco di
 * colori e raggi che dichiarava conformita' a DESIGN.md: ridondante ora che i
 * token sono la sorgente, e all'epoca perfino falso, dato che il file
 * ricopiava quegli stessi esadecimali a mano piu' di cento volte.
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

  // Riferimenti usati dal riquadro riepilogativo. Erano scritti a mano nel JSX
  // ("2.571 nodi (25,7%)", "PMIA 4,4s vs CELF++ 4.228s") mentre il componente
  // riceveva gia' `algorithms` con gli stessi valori.
  const celf = algorithms["CELF++"];
  const pmia = algorithms["PMIA"];
  const skim = algorithms["SKIM"];
  const fmt = (n: number | null | undefined, frazioni = 0) =>
    n == null ? "n/d" : n.toLocaleString("it-IT", { maximumFractionDigits: frazioni });
  /** Spread come quota dei nodi del sottografo. */
  const spreadPct = (info?: { mc_spread: number }) =>
    info && subgraph.nodes ? `${((info.mc_spread / subgraph.nodes) * 100).toFixed(1)}%` : "n/d";
  /** Spread di un algoritmo relativo al migliore in assoluto. */
  const spreadVsBest = (info?: { mc_spread: number }) =>
    info && celf?.mc_spread ? `${((info.mc_spread / celf.mc_spread) * 100).toFixed(1)}%` : "n/d";

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
        return tokens.color.purple; // Deep Purple accent
      case "PMIA":
        return tokens.color.deepGreen; // Deep Enterprise Green
      case "SKIM":
        return tokens.color.coral; // Cohere Coral
      case "degree":
        return tokens.color.actionBlue; // Action Blue
      case "pagerank":
        return "#0d9488"; // Teal
      default:
        return tokens.color.nearBlack; // Near-Black Primary
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
          borderRadius: tokens.radius.xl,
          background: `linear-gradient(135deg, ${tokens.color.nearBlack} 0%, ${tokens.color.deepGreen} 100%)`,
          color: tokens.color.canvas,
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2.5, flexWrap: "wrap" }}>
              <Chip
                label="BENCHMARK AUDIT • ALGORITHM EVALUATION"
                sx={{
                  fontFamily: tokens.font.mono,
                  fontSize: "11px",
                  fontWeight: 600,
                  color: tokens.color.coral,
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
                  fontFamily: tokens.font.mono,
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
                fontFamily: tokens.font.display,
                fontWeight: 400,
                fontSize: { xs: "28px", md: "38px" },
                color: tokens.color.canvas,
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
                color: tokens.color.textFaint,
                fontSize: "16px",
                lineHeight: 1.6,
                maxWidth: 720,
              }}
            >
              Valutazione sperimentale rigorosa sullo <strong style={{ color: tokens.color.canvas }}>stesso sottografo di {fmt(subgraph.nodes)} nodi e {fmt(subgraph.edges)} archi</strong>.
              Tutti gli algoritmi sono valutati tramite <strong style={{ color: tokens.color.coral }}>{eval_runs} simulazioni Monte Carlo Independent Cascade</strong> indipendenti.
            </Typography>
          </Grid>

          {/* Key Insight Agent Console Card (DESIGN.md: agent-console-card) */}
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                backgroundColor: "rgba(23, 23, 28, 0.7)",
                backdropFilter: "blur(12px)",
                borderRadius: tokens.radius.lg,
                p: 3,
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontFamily: tokens.font.mono,
                  fontSize: "11px",
                  color: tokens.color.textMuted,
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
                  <Typography variant="body2" sx={{ color: tokens.color.softStone }}>Spread Max (CELF++):</Typography>
                  <Typography variant="subtitle2" sx={{ color: "#a78bfa", fontFamily: tokens.font.mono, fontWeight: 700 }}>
                    {fmt(celf?.mc_spread, 1)} nodi ({spreadPct(celf)})
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ color: tokens.color.softStone }}>Spread PMIA:</Typography>
                  <Typography variant="subtitle2" sx={{ color: "#6ee7b7", fontFamily: tokens.font.mono, fontWeight: 700 }}>
                    {fmt(pmia?.mc_spread, 1)} nodi ({spreadVsBest(pmia)} di CELF++)
                  </Typography>
                </Box>

                <Box sx={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", pt: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ color: tokens.color.softStone }}>Efficienza Temporale:</Typography>
                  <Chip
                    label={`PMIA ${fmt(pmia?.time_s, 1)}s vs CELF++ ${fmt(celf?.time_s, 1)}s`}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(34, 197, 94, 0.15)",
                      color: "#4ade80",
                      fontFamily: tokens.font.mono,
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
              borderRadius: tokens.radius.lg,
              backgroundColor: tokens.color.softStone,
              border: tokens.border.strong,
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: tokens.font.mono,
                  fontSize: "11px",
                  color: tokens.color.textMuted,
                  letterSpacing: "0.28px",
                  textTransform: "uppercase",
                }}
              >
                BENCHMARK GRAPH
              </Typography>
              <GraphIcon sx={{ fontSize: 20, color: tokens.color.coral }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: tokens.font.display,
                fontWeight: 600,
                fontSize: "32px",
                color: tokens.color.nearBlack,
                letterSpacing: "-0.32px",
              }}
            >
              {subgraph.nodes.toLocaleString("it-IT")}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.color.textMuted, mt: 0.5, display: "block" }}>
              Nodi • {subgraph.edges.toLocaleString("it-IT")} Archi
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: tokens.radius.lg,
              backgroundColor: tokens.color.softStone,
              border: tokens.border.strong,
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: tokens.font.mono,
                  fontSize: "11px",
                  color: tokens.color.textMuted,
                  letterSpacing: "0.28px",
                  textTransform: "uppercase",
                }}
              >
                CANDIDATI IA & BUDGET
              </Typography>
              <MathIcon sx={{ fontSize: 20, color: tokens.color.actionBlue }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: tokens.font.display,
                fontWeight: 600,
                fontSize: "32px",
                color: tokens.color.nearBlack,
                letterSpacing: "-0.32px",
              }}
            >
              {subgraph.candidates}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.color.textMuted, mt: 0.5, display: "block" }}>
              Account IA Candidati • k = {data.k}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: tokens.radius.lg,
              backgroundColor: tokens.color.softStone,
              border: tokens.border.strong,
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: tokens.font.mono,
                  fontSize: "11px",
                  color: tokens.color.textMuted,
                  letterSpacing: "0.28px",
                  textTransform: "uppercase",
                }}
              >
                MAX MONTE CARLO SPREAD
              </Typography>
              <TrophyIcon sx={{ fontSize: 20, color: tokens.color.purple }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: tokens.font.display,
                fontWeight: 600,
                fontSize: "32px",
                color: tokens.color.purple,
                letterSpacing: "-0.32px",
              }}
            >
              {fmt(algorithms[winner_by_mc_spread]?.mc_spread, 1)}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.color.textMuted, mt: 0.5, display: "block" }}>
              Nodi attivati (CELF++)
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: tokens.radius.lg,
              backgroundColor: tokens.color.softStone,
              border: tokens.border.strong,
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: tokens.font.mono,
                  fontSize: "11px",
                  color: tokens.color.textMuted,
                  letterSpacing: "0.28px",
                  textTransform: "uppercase",
                }}
              >
                VALUTAZIONE COMUNE
              </Typography>
              <InsightsIcon sx={{ fontSize: 20, color: tokens.color.deepGreen }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontFamily: tokens.font.display,
                fontWeight: 600,
                fontSize: "32px",
                color: tokens.color.deepGreen,
                letterSpacing: "-0.32px",
              }}
            >
              {eval_runs}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.color.textMuted, mt: 0.5, display: "block" }}>
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
              borderRadius: tokens.radius.xl,
              border: tokens.border.subtle,
              backgroundColor: tokens.color.canvas,
              height: "100%",
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 600,
                  fontSize: "20px",
                  color: tokens.color.nearBlack,
                  letterSpacing: "-0.32px",
                }}
              >
                Spread Reale Monte Carlo (Nodi Attivati)
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5 }}>
                Valutazione imparziale della copertura media su {eval_runs} simulazioni Independent Cascade.
              </Typography>
            </Box>

            <Box sx={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spreadChartData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.color.border} />
                  <XAxis dataKey="name" stroke={tokens.color.textMuted} tick={{ fontSize: 13, fontWeight: 600, fontFamily: tokens.font.body }} />
                  <YAxis domain={[0, 3000]} stroke={tokens.color.textMuted} tick={{ fontSize: 12, fontFamily: tokens.font.mono }} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const row = payload[0].payload;
                        return (
                          <Paper sx={{ p: 2, border: tokens.border.subtle, borderRadius: tokens.radius.md, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: getAlgorithmColor(row.name), fontFamily: tokens.font.display }}>
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
              borderRadius: tokens.radius.xl,
              border: tokens.border.subtle,
              backgroundColor: tokens.color.canvas,
              height: "100%",
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 600,
                  fontSize: "20px",
                  color: tokens.color.nearBlack,
                  letterSpacing: "-0.32px",
                }}
              >
                Tempo di Calcolo (Secondi)
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5 }}>
                Scalabilità computazionale dei diversi metodi di selezione.
              </Typography>
            </Box>

            <Box sx={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeChartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={tokens.color.border} />
                  <XAxis type="number" stroke={tokens.color.textMuted} tick={{ fontSize: 12, fontFamily: tokens.font.mono }} />
                  <YAxis dataKey="name" type="category" stroke={tokens.color.textMuted} tick={{ fontSize: 13, fontWeight: 600, fontFamily: tokens.font.body }} width={75} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const row = payload[0].payload;
                        return (
                          <Paper sx={{ p: 1.5, border: tokens.border.subtle, borderRadius: tokens.radius.sm }}>
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
      <Paper elevation={0} sx={{ p: 4, mb: 5, borderRadius: tokens.radius.xl, border: tokens.border.subtle }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: tokens.font.display,
              fontWeight: 600,
              fontSize: "22px",
              color: tokens.color.nearBlack,
              letterSpacing: "-0.32px",
            }}
          >
            Tabella Comparativa Dettagliata Algoritmi
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5 }}>
            Metriche numeriche complete, stime teoriche e tempi di esecuzione misurati.
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: tokens.color.tableHead, borderBottom: `2px solid ${tokens.color.border}` }}>
                <TableCell sx={{ fontWeight: 700, color: tokens.color.nearBlack, fontFamily: tokens.font.body }}>Algoritmo</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: tokens.color.nearBlack, fontFamily: tokens.font.body }}>Seed Selezionati</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: tokens.color.nearBlack, fontFamily: tokens.font.body }}>Stima Teorica</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: tokens.color.nearBlack, fontFamily: tokens.font.body }}>Spread MC Reale</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: tokens.color.nearBlack, fontFamily: tokens.font.body }}>Copertura Sottografo</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: tokens.color.nearBlack, fontFamily: tokens.font.body }}>Tempo Calcolo</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: tokens.color.nearBlack, fontFamily: tokens.font.body }}>Stato / Badge</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow
                  key={row.name}
                  sx={{
                    backgroundColor: row.isWinner ? "rgba(124, 58, 237, 0.02)" : "inherit",
                    "&:hover": { backgroundColor: "#f9fafb" },
                    borderBottom: tokens.border.subtle,
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
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.color.nearBlack, fontFamily: tokens.font.display }}>
                        {row.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontFamily: tokens.font.mono }}>
                      {row.n_seeds} / {subgraph.candidates}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontFamily: tokens.font.mono }}>
                      {row.est_spread !== null ? row.est_spread.toLocaleString("it-IT") : "N/D (Baseline)"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: row.isWinner ? tokens.color.purple : tokens.color.nearBlack,
                        fontFamily: tokens.font.mono,
                      }}
                    >
                      {row.mc_spread.toLocaleString("it-IT")}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: tokens.font.mono }}>
                        {row.coveragePct}%
                      </Typography>
                      <Box sx={{ width: 60 }}>
                        <LinearProgress
                          variant="determinate"
                          value={parseFloat(row.coveragePct)}
                          sx={{
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: tokens.color.softStone,
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: getAlgorithmColor(row.name),
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: tokens.font.mono }}>
                      {row.time_s < 0.01 ? "0,00 s" : `${row.time_s.toFixed(2)} s`}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {row.isWinner ? (
                      <Chip
                        icon={<TrophyIcon sx={{ fontSize: 13, color: `${tokens.color.canvas} !important` }} />}
                        label="Top Spread"
                        size="small"
                        sx={{
                          backgroundColor: tokens.color.purple,
                          color: tokens.color.canvas,
                          fontFamily: tokens.font.mono,
                          fontWeight: 700,
                          fontSize: "11px",
                          borderRadius: tokens.radius.pill,
                        }}
                      />
                    ) : row.name === "PMIA" ? (
                      <Chip
                        icon={<CheckIcon sx={{ fontSize: 13, color: `${tokens.color.canvas} !important` }} />}
                        label="Top Efficienza"
                        size="small"
                        sx={{
                          backgroundColor: tokens.color.deepGreen,
                          color: tokens.color.canvas,
                          fontFamily: tokens.font.mono,
                          fontWeight: 700,
                          fontSize: "11px",
                          borderRadius: tokens.radius.pill,
                        }}
                      />
                    ) : (
                      <Chip
                        label="Standard"
                        size="small"
                        sx={{
                          backgroundColor: tokens.color.softStone,
                          color: tokens.color.textMuted,
                          fontFamily: tokens.font.mono,
                          fontWeight: 500,
                          fontSize: "11px",
                          borderRadius: tokens.radius.pill,
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
          <Paper elevation={0} sx={{ p: 3.5, borderRadius: tokens.radius.xl, border: tokens.border.subtle, height: "100%", backgroundColor: tokens.color.canvas }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: tokens.font.display,
                fontWeight: 600,
                fontSize: "20px",
                color: tokens.color.nearBlack,
                mb: 1,
              }}
            >
              Matrice Sovrapposizione Seed (Indice di Jaccard)
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 3 }}>
              Misura della similarità tra i set di seed scelti dai diversi algoritmi.
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: tokens.color.tableHead }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px", fontFamily: tokens.font.body }}>Algoritmo</TableCell>
                    {algoList.map((a) => (
                      <TableCell key={a} align="center" sx={{ fontWeight: 700, fontSize: "12px", px: 1, fontFamily: tokens.font.body }}>
                        {a}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {algoList.map((rowAlgo) => (
                    <TableRow key={rowAlgo}>
                      <TableCell sx={{ fontWeight: 700, fontSize: "13px", fontFamily: tokens.font.display }}>{rowAlgo}</TableCell>
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
                                color: isFull ? "#15803d" : tokens.color.nearBlack,
                                fontFamily: tokens.font.mono,
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
          <Paper elevation={0} sx={{ p: 3.5, borderRadius: tokens.radius.xl, border: tokens.border.subtle, height: "100%", backgroundColor: tokens.color.canvas }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <InsightsIcon sx={{ color: tokens.color.actionBlue }} />
              <Typography
                variant="h6"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 600,
                  fontSize: "20px",
                  color: tokens.color.nearBlack,
                }}
              >
                Analisi Topologica della Convergenza
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 2.5, lineHeight: 1.6 }}>
              L'indice di Jaccard pari a <strong style={{ color: "#15803d" }}>{getJaccardScore("PMIA", "CELF++").toFixed(2)} ({(getJaccardScore("PMIA", "CELF++") * 100).toFixed(0)}%)</strong> tra PMIA e CELF++ indica quanto la struttura snowball del grafo sociale concentri la capacità di propagazione sui medesimi account bot IA centrali.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              <Paper sx={{ p: 2.5, backgroundColor: tokens.color.softStone, borderRadius: tokens.radius.lg, border: tokens.border.strong }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.color.nearBlack, mb: 0.5, fontFamily: tokens.font.display }}>
                  Convergenza Euristiche vs Monte Carlo
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textPrimary, fontSize: "14px", lineHeight: 1.5 }}>
                  Le euristiche basate sugli alberi di influenza locali (PMIA) selezionano seed molto simili a quelli del costoso algoritmo Monte Carlo Greedy (CELF++), ottenendo il {spreadVsBest(pmia)} dello spread in {fmt(pmia?.time_s, 1)}s contro {fmt(celf?.time_s, 1)}s.
                </Typography>
              </Paper>

              <Paper sx={{ p: 2.5, backgroundColor: tokens.color.softStone, borderRadius: tokens.radius.lg, border: tokens.border.strong }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.color.nearBlack, mb: 0.5, fontFamily: tokens.font.display }}>
                  Comportamento SKIM (RR-Sets)
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textPrimary, fontSize: "14px", lineHeight: 1.5 }}>
                  SKIM ha selezionato {fmt(skim?.n_seeds)} seed raggiungendo uno spread di {fmt(skim?.mc_spread, 1)} nodi in {fmt(skim?.time_s, 2)} secondi con un Jaccard del {(getJaccardScore("SKIM", "CELF++") * 100).toFixed(1)}% rispetto a CELF++, a mostrare l'efficienza dei campionamenti Reverse Reachable Sets.
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
            fontFamily: tokens.font.display,
            fontWeight: 600,
            fontSize: "22px",
            color: tokens.color.nearBlack,
            mb: 2.5,
            letterSpacing: "-0.32px",
          }}
        >
          Meccanismi ed Algoritmi a Confronto
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas }}>
              <CardContent sx={{ p: 3 }}>
                <Chip
                  label="ALBERI DI INFLUENZA"
                  size="small"
                  sx={{
                    backgroundColor: "rgba(0,60,51,0.1)",
                    color: tokens.color.deepGreen,
                    mb: 2,
                    fontWeight: 700,
                    fontFamily: tokens.font.mono,
                    fontSize: "11px",
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontFamily: tokens.font.display }}>PMIA</Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontSize: "14px", lineHeight: 1.6 }}>
                  Prefix-Tree Maximum Influence Path. Costruisce alberi locali di influenza definendo percorsi di propagazione massima sopra una soglia &theta;. Offre una velocità vicina ai metodi euristici con la precisione del greedy.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas }}>
              <CardContent sx={{ p: 3 }}>
                <Chip
                  label="GREEDY MONTE CARLO"
                  size="small"
                  sx={{
                    backgroundColor: "rgba(124,58,237,0.1)",
                    color: tokens.color.purple,
                    mb: 2,
                    fontWeight: 700,
                    fontFamily: tokens.font.mono,
                    fontSize: "11px",
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontFamily: tokens.font.display }}>CELF++</Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontSize: "14px", lineHeight: 1.6 }}>
                  Cost-Effective Lazy Forwarding con ottimizzazione a due livelli. Garanzia teorica (1 - 1/e), ma richiede numerose simulazioni Monte Carlo su ogni iterazione, risultando computazionalmente oneroso su grafi estesi.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas }}>
              <CardContent sx={{ p: 3 }}>
                <Chip
                  label="REVERSE REACHABLE SETS"
                  size="small"
                  sx={{
                    backgroundColor: "rgba(255,119,89,0.1)",
                    color: tokens.color.coral,
                    mb: 2,
                    fontWeight: 700,
                    fontFamily: tokens.font.mono,
                    fontSize: "11px",
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontFamily: tokens.font.display }}>SKIM</Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontSize: "14px", lineHeight: 1.6 }}>
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
