import React from "react";
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
import { DetectorSankeyChart } from "../components/DetectorSankeyChart.tsx";
import { useDebounce } from "../hooks/useDebounce.ts";
import {
  useDetectorComparisonSummaryQuery,
  useDetectorComparisonPostsQuery,
} from "../api/queries.ts";
import { tokens } from "../theme.ts";
import { formatNumber } from "../utils/format.ts";
import { useUrlNumber, useUrlString } from "../hooks/useUrlState.ts";

export default function DetectorComparison() {
  const [page, setPage] = useUrlNumber("page", 1);
  const pageSize = 15;
  const [filterType, setFilterType] = useUrlString("filter", "all");
  const [searchTerm, setSearchTerm] = useUrlString("q");

  const debouncedSearch = useDebounce(searchTerm, 400);

  // TanStack Query invece di fetch a mano dentro useEffect: la chiave di query
  // include filtro, pagina e ricerca, quindi una risposta lenta non puo' piu'
  // sovrascriverne una piu' recente (prima non c'era alcun ordinamento), e gli
  // errori diventano uno stato osservabile invece di una sola console.error.
  const {
    data: summary,
    isLoading: loadingSummary,
    isError: errorSummary,
  } = useDetectorComparisonSummaryQuery();

  const {
    data: postsData,
    isLoading: loadingPosts,
    isError: errorPosts,
  } = useDetectorComparisonPostsQuery(filterType, page, pageSize, debouncedSearch);

  const posts = postsData?.posts ?? [];
  const totalPosts = postsData?.total ?? 0;

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
              backgroundColor: tokens.color.purple,
              color: tokens.color.canvas,
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: tokens.font.mono,
            }}
          />
        );
      case 3:
        return (
          <Chip
            label="3/4 Maggioranza IA"
            size="small"
            sx={{
              backgroundColor: tokens.color.deepGreen,
              color: tokens.color.canvas,
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: tokens.font.mono,
            }}
          />
        );
      case 2:
        return (
          <Chip
            label="2/4 Misto IA"
            size="small"
            sx={{
              backgroundColor: tokens.color.coral,
              color: tokens.color.canvas,
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: tokens.font.mono,
            }}
          />
        );
      case 1:
        return (
          <Chip
            label="1/4 Minoranza IA"
            size="small"
            sx={{
              backgroundColor: tokens.color.softStone,
              color: tokens.color.textPrimary,
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: tokens.font.mono,
              border: tokens.border.strong,
            }}
          />
        );
      default:
        return (
          <Chip
            label="0/4 Unanime Umano"
            size="small"
            sx={{
              backgroundColor: tokens.color.surfaceBlue,
              color: tokens.color.actionBlue,
              fontWeight: 600,
              fontSize: "11px",
              fontFamily: tokens.font.mono,
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
    if (prob === null || prob === undefined || isNaN(prob)) return tokens.color.textFaint;
    const val = prob > 1 ? prob / 100 : prob;
    if (val >= 0.7) return tokens.color.danger;
    if (val >= 0.5) return tokens.color.coral;
    if (val >= 0.2) return tokens.color.actionBlue;
    return tokens.color.deepGreen;
  };

  // Consenso fra i 4 detector. Nessun valore di ripiego: se il report non e'
  // stato generato la voce vale null e il grafico non viene disegnato, invece
  // di mostrare conteggi inventati indistinguibili da quelli misurati.
  const conteggioAi = summary?.comparison_report?.conteggio_ai;
  const consensusData = [
    { name: "Unanime IA (4/4)", count: conteggioAi?.ai_per_tutti_e_4, color: tokens.color.deepGreen },
    { name: "Maggioranza IA (3/4)", count: conteggioAi?.ai_per_esattamente_3, color: tokens.color.purple },
    { name: "Misto IA (2/4)", count: conteggioAi?.ai_per_esattamente_2, color: tokens.color.coral },
    { name: "1 Detector Solo (1/4)", count: conteggioAi?.ai_per_esattamente_1, color: tokens.color.actionBlue },
    { name: "Unanime Umano (0/4)", count: conteggioAi?.ai_per_nessuno, color: tokens.color.textMuted },
  ].filter((d): d is { name: string; count: number; color: string } =>
    typeof d.count === "number"
  );
  const hasConsensusData = consensusData.length > 0;

  // Le sei coppie di detector. Erano sei blocchi JSX identici da 22 righe,
  // ciascuno con conteggio e percentuale di ripiego inventati.
  const PAIRWISE: ReadonlyArray<{
    key: "bino-gpt" | "bino-desk" | "bino-ada" | "desk-gpt" | "desk-ada" | "gpt-ada";
    label: string;
    chipBg: string;
    chipColor: string;
    surface: string;
    borderColor: string;
    labelColor: string;
    nota?: string;
  }> = [
    { key: "bino-gpt", label: "Binoculars ↔ FastDetectGPT", chipBg: tokens.color.deepGreen, chipColor: tokens.color.canvas, surface: tokens.color.surfaceSubtle, borderColor: tokens.color.border, labelColor: tokens.color.textPrimary },
    { key: "bino-desk", label: "Binoculars ↔ Desklib AI", chipBg: tokens.color.softStone, chipColor: tokens.color.textPrimary, surface: tokens.color.surfaceSubtle, borderColor: tokens.color.border, labelColor: tokens.color.textPrimary },
    { key: "bino-ada", label: "Binoculars ↔ AdaDetectGPT", chipBg: tokens.color.purple, chipColor: tokens.color.canvas, surface: tokens.color.surfacePurple, borderColor: tokens.color.borderPurple, labelColor: tokens.color.purple },
    { key: "desk-gpt", label: "Desklib AI ↔ FastDetectGPT", chipBg: tokens.color.softStone, chipColor: tokens.color.textPrimary, surface: tokens.color.surfaceSubtle, borderColor: tokens.color.border, labelColor: tokens.color.textPrimary },
    { key: "desk-ada", label: "Desklib AI ↔ AdaDetectGPT", chipBg: tokens.color.purple, chipColor: tokens.color.canvas, surface: tokens.color.surfacePurple, borderColor: tokens.color.borderPurple, labelColor: tokens.color.purple },
    { key: "gpt-ada", label: "FastDetectGPT ↔ AdaDetectGPT", chipBg: tokens.color.purple, chipColor: tokens.color.canvas, surface: tokens.color.surfacePurple, borderColor: tokens.color.borderPurple, labelColor: tokens.color.purple, nota: "Alta affinità fra varianti di perturba-curvatura." },
  ];

  const coppie = summary?.comparison_report?.accordo?.coppie;
  const idTotali = summary?.comparison_report?.id_totali;

  // Le quattro card dell'indagine sui bot. Conteggi e percentuali arrivano da
  // summary.bot_investigation: prima solo la card Ada leggeva l'API, le altre
  // tre stampavano numeri fissi nel JSX. Qui resta solo la parte editoriale.
  const BOT_DETECTOR_CARDS = [
    { id: "binoculars", label: "BINOCULARS (ZERO-SHOT)", accent: tokens.color.deepGreen, borderColor: tokens.color.border, labelColor: tokens.color.textMuted, nota: "Valuta la naturalezza della perplessità linguistica (es. feed meteo, news o dati scritti da umani)." },
    { id: "fastdetectgpt", label: "FASTDETECTGPT (ZERO-SHOT)", accent: tokens.color.actionBlue, borderColor: tokens.color.border, labelColor: tokens.color.textMuted, nota: "Analizza la curvatura del linguaggio." },
    { id: "desklib", label: "DESKLIB (FINE-TUNED)", accent: tokens.color.coral, borderColor: tokens.color.coral, labelColor: tokens.color.coral, nota: "Classificatore supervisionato, sensibile ai pattern rigidi e ripetitivi." },
    { id: "ada", label: "ADADETECTGPT (ZERO-SHOT)", accent: tokens.color.purple, borderColor: tokens.color.borderPurple, labelColor: tokens.color.purple, nota: "Perturba-curvatura adattiva su GPT-Neo 2.7B." },
  ] as const;


  return (
    <Box sx={{ pb: 8, backgroundColor: tokens.color.canvas }}>
      {/* Hero Header */}
      <Box sx={{ mb: 5, pt: 1, borderBottom: tokens.border.subtle, pb: 4 }}>

        <Typography
          variant="h3"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 700,
            fontSize: { xs: "32px", md: "48px" },
            color: tokens.color.black,
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
            fontFamily: tokens.font.body,
            color: tokens.color.textPrimary,
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
          <CircularProgress sx={{ color: tokens.color.nearBlack }} />
        </Box>
      ) : errorSummary ? (
        <Paper variant="outlined" sx={{ p: 4, mb: 6, borderRadius: tokens.radius.lg, borderColor: tokens.color.danger, backgroundColor: "#fdf2f2" }}>
          <Typography variant="body2" sx={{ color: tokens.color.danger, fontWeight: 600 }}>
            Impossibile caricare il confronto fra detector. Verificare che il backend sia in esecuzione.
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 6 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  backgroundColor: tokens.color.softStone,
                  borderRadius: tokens.radius.md,
                  p: 2.5,
                  borderTop: `3px solid ${tokens.color.nearBlack}`,
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.textMuted, textTransform: "uppercase" }}>
                  Campione Condiviso
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.black, mt: 1 }}>
                  {formatNumber(summary?.comparison_report?.id_presenti_in_tutti_e_4 ?? summary?.comparison_report?.id_totali)}
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, fontSize: "13px" }}>
                  Post analizzati dai 4 modelli
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  backgroundColor: tokens.color.softStone,
                  borderRadius: tokens.radius.md,
                  p: 2.5,
                  borderTop: `3px solid ${tokens.color.purple}`,
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.purple, fontWeight: 600, textTransform: "uppercase" }}>
                  Unanime IA (4/4)
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.purple, mt: 1 }}>
                  {formatNumber((summary?.comparison_report?.conteggio_ai?.ai_per_tutti_e_4 ?? 0))}
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, fontSize: "13px" }}>
                  High-confidence AI (Consenso 4/4)
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  backgroundColor: tokens.color.softStone,
                  borderRadius: tokens.radius.md,
                  p: 2.5,
                  borderTop: `3px solid ${tokens.color.deepGreen}`,
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.deepGreen, fontWeight: 600, textTransform: "uppercase" }}>
                  Maggioranza IA (3/4)
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.deepGreen, mt: 1 }}>
                  {formatNumber((summary?.comparison_report?.conteggio_ai?.ai_per_esattamente_3 ?? 0))}
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, fontSize: "13px" }}>
                  Accordo a 3 modelli
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  backgroundColor: tokens.color.softStone,
                  borderRadius: tokens.radius.md,
                  p: 2.5,
                  borderTop: `3px solid ${tokens.color.actionBlue}`,
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.actionBlue, fontWeight: 600, textTransform: "uppercase" }}>
                  Accordo Totale Label
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.actionBlue, mt: 1 }}>
                  {summary?.comparison_report?.accordo?.tutti_e_4_stessa_etichetta != null && summary?.comparison_report?.id_totali
                    ? `${((summary.comparison_report.accordo.tutti_e_4_stessa_etichetta / summary.comparison_report.id_totali) * 100).toFixed(1)}%`
                    : "n/d"}
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, fontSize: "13px" }}>
                  {summary?.comparison_report?.accordo?.tutti_e_4_stessa_etichetta != null
                    ? `${formatNumber(summary.comparison_report.accordo.tutti_e_4_stessa_etichetta)} post concordi 100%`
                    : "Report di confronto non generato"}
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Model Cards Overview */}
          <Typography variant="h5" sx={{ fontFamily: tokens.font.display, fontWeight: 700, mb: 3, color: tokens.color.black }}>
            Panoramica Architetturale dei Quattro Detector
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 6 }}>
            {summary?.models.map((m) => (
              <Grid item xs={12} sm={6} md={3} key={m.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: tokens.radius.lg,
                    p: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderColor: tokens.color.border,
                    backgroundColor: tokens.color.canvas,
                    "&:hover": { borderColor: tokens.color.nearBlack },
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <Box>
                    <Chip
                      label={m.type}
                      size="small"
                      sx={{
                        backgroundColor: tokens.color.surfaceBlue,
                        color: tokens.color.actionBlue,
                        fontWeight: 600,
                        fontSize: "11px",
                        fontFamily: tokens.font.mono,
                        mb: 2,
                      }}
                    />
                    <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.black, mb: 1 }}>
                      {m.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontSize: "14px", lineHeight: 1.5, mb: 3 }}>
                      {m.description}
                    </Typography>
                  </Box>

                  <Box sx={{ pt: 2, borderTop: `1px solid ${tokens.color.softStone}` }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: tokens.color.textMuted, display: "block" }}>
                          Post Valutati
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: tokens.font.display }}>
                          {formatNumber(m.scored_count)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: tokens.color.textMuted, display: "block" }}>
                          % Positivi IA
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: tokens.font.display, color: tokens.color.coral }}>
                          {m.ai_percentage}% ({formatNumber(m.ai_detected_count)})
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
            {/* Nivo Sankey Diagram Flow (Sprint 5) */}
            <Grid item xs={12}>
              <DetectorSankeyChart flussi={summary?.comparison_report?.flussi_consenso} />
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ borderRadius: tokens.radius.lg, p: 3.5, borderColor: tokens.color.border, height: "100%" }}>
                <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 700, mb: 1 }}>
                  Matrice di Accordo a Coppie (Pairwise)
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 3 }}>
                  Percentuale di post in cui la coppia di modelli concorda sulla medesima etichetta (IA vs Umano con soglia 0.5):
                </Typography>

                <Stack spacing={2.5}>
                  {PAIRWISE.map((pair) => {
                    const concordi = coppie?.[pair.key];
                    const percentuale =
                      typeof concordi === "number" && idTotali
                        ? `${((concordi / idTotali) * 100).toFixed(1)}% Accordo`
                        : null;

                    return (
                      <Box
                        key={pair.key}
                        sx={{
                          p: 2,
                          borderRadius: tokens.radius.md,
                          backgroundColor: pair.surface,
                          border: `1px solid ${pair.borderColor}`,
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: pair.labelColor }}>
                            {pair.label}
                          </Typography>
                          <Chip
                            label={percentuale ?? "n/d"}
                            size="small"
                            sx={{
                              backgroundColor: percentuale ? pair.chipBg : tokens.color.softStone,
                              color: percentuale ? pair.chipColor : tokens.color.textMuted,
                              fontWeight: 700,
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                          {typeof concordi === "number"
                            ? `${formatNumber(concordi)} post concordi.${pair.nota ? ` ${pair.nota}` : ""}`
                            : "Dato non disponibile: report di confronto non generato."}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Grid>

            {/* Recharts Bar Chart */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ borderRadius: tokens.radius.lg, p: 3.5, borderColor: tokens.color.border, height: "100%" }}>
                <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 700, mb: 1 }}>
                  Distribuzione del Consenso tra i 4 Modelli
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 3 }}>
                  {idTotali
                    ? `Suddivisione del dataset da ${formatNumber(idTotali)} post in base al numero di modelli (su 4) che classificano il testo come IA:`
                    : "Suddivisione del dataset in base al numero di modelli (su 4) che classificano il testo come IA:"}
                </Typography>

                <Box sx={{ width: "100%", height: 320, minHeight: 320 }}>
                  {hasConsensusData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={consensusData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" width={130} style={{ fontSize: "12px" }} />
                        <RechartsTooltip formatter={(val) => [formatNumber(Number(val)), "Post"]} />
                        <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                          {consensusData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", px: 3 }}>
                      <Typography variant="body2" sx={{ color: tokens.color.textMuted, textAlign: "center" }}>
                        Consenso non disponibile: il report di confronto fra detector non e' stato generato.
                      </Typography>
                    </Box>
                  )}
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
              borderColor: tokens.color.coral,
              backgroundColor: "#fdfbf9",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Chip
                label="ANALISI SPECIALE METADATI"
                size="small"
                sx={{
                  backgroundColor: tokens.color.coral,
                  color: tokens.color.canvas,
                  fontWeight: 700,
                  fontSize: "11px",
                  fontFamily: tokens.font.mono,
                }}
              />
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontFamily: tokens.font.mono }}>
                {summary?.bot_investigation
                  ? `${formatNumber(summary.bot_investigation.total_bot_statuses)} STATUS DA ACCOUNT BOT DICHIARATI (bot = true)`
                  : "CONTEGGIO STATUS BOT NON DISPONIBILE"}
              </Typography>
            </Box>

            <Typography
              variant="h5"
              sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.black, mb: 1.5 }}
            >
              Indagine: Cosa Rilevano i Modelli sui Post degli Account Bot?
            </Typography>

            <Typography variant="body1" sx={{ color: tokens.color.textPrimary, mb: 3, maxWidth: "900px", lineHeight: 1.5 }}>
              {(() => {
                const bi = summary?.bot_investigation;
                if (!bi) {
                  return "Confronto fra le quattro architetture sui post provenienti da account che si dichiarano automatizzati (bot = true).";
                }
                const totale = bi.total_bot_statuses + bi.total_human_statuses;
                const quota = totale > 0 ? ((bi.total_bot_statuses / totale) * 100).toFixed(1) : null;
                return (
                  <>
                    Analizzando i metadati di registrazione delle API Mastodon,
                    {quota ? ` il ${quota}% ` : " una parte "}
                    dei post del dataset proviene da account che confermano di essere automatizzati (<strong>bot = true</strong>). Il confronto tra le quattro architetture rivela una divergenza metodologica sostanziale:
                  </>
                );
              })()}
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {BOT_DETECTOR_CARDS.map((card) => {
                const stats = summary?.bot_investigation?.models?.[card.id];
                return (
                  <Grid item xs={12} md={3} key={card.id}>
                    <Box sx={{ p: 2, borderRadius: tokens.radius.md, backgroundColor: tokens.color.canvas, border: `1px solid ${card.borderColor}` }}>
                      <Typography variant="caption" sx={{ color: card.labelColor, fontWeight: 600, display: "block" }}>
                        {card.label}
                      </Typography>
                      <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: card.accent, my: 0.5 }}>
                        {stats?.ai_percentage != null ? `${stats.ai_percentage}% IA` : "n/d"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                        {stats && stats.scored > 0
                          ? `${formatNumber(stats.ai_count)} su ${formatNumber(stats.scored)} post bot. ${card.nota}`
                          : "Nessun post di account bot valutato da questo detector."}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            <Box sx={{ p: 2, borderRadius: tokens.radius.md, backgroundColor: tokens.color.softStone }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.color.black, mb: 0.5, display: "flex", alignItems: "center" }}>
                <LightbulbIcon sx={{ color: tokens.color.coral, fontSize: 18, mr: 0.8 }} /> Esito dell'Indagine:
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.textPrimary, fontSize: "13.5px", lineHeight: 1.5 }}>
                Un account bot <strong>non equivale</strong> a testo generato da un LLM: molti bot su Mastodon sono aggregatori automatici di articoli di giornale o bollettini scritti da persone. I modelli zero-shot (Binoculars e FastDetectGPT) distinguono correttamente la naturalezza del testo, mentre il modello supervisionato (Desklib) tende a scambiare l'automazione del formato per generazione IA.
              </Typography>
            </Box>
          </Paper>
        </>
      )}

      {/* Interactive Post Explorer Table */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" sx={{ fontFamily: tokens.font.display, fontWeight: 700, mb: 2, color: tokens.color.black }}>
          Esploratore Multi-Detector dei Post
        </Typography>

        {/* Filter Controls */}
        <Paper variant="outlined" sx={{ borderRadius: tokens.radius.lg, p: 2, mb: 3, borderColor: tokens.color.border }}>
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
                    color: tokens.color.textMuted,
                    "&.Mui-selected": { color: tokens.color.black, fontWeight: 700 },
                  },
                  "& .MuiTabs-indicator": { backgroundColor: tokens.color.coral, height: "3px" },
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
                      <SearchIcon sx={{ color: tokens.color.textMuted, fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  backgroundColor: tokens.color.canvas,
                  "& .MuiOutlinedInput-root": { borderRadius: "24px" },
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: tokens.radius.lg, borderColor: tokens.color.border }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ backgroundColor: tokens.color.surfaceSubtle }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontFamily: tokens.font.display, width: "90px" }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: tokens.font.display }}>Testo Post</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: tokens.font.display, width: "80px" }}>Lingua</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: tokens.font.display, width: "120px" }}>FastDetectGPT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: tokens.font.display, width: "110px" }}>Binoculars</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: tokens.font.display, width: "100px" }}>Desklib</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: tokens.font.display, width: "120px" }}>AdaDetectGPT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontFamily: tokens.font.display, width: "140px" }}>Consenso</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingPosts ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: tokens.color.nearBlack }} />
                  </TableCell>
                </TableRow>
              ) : errorPosts ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: tokens.color.danger, fontWeight: 600 }}>
                    Impossibile caricare i post. Verificare che il backend sia in esecuzione.
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: tokens.color.textMuted }}>
                    Nessun post trovato con i filtri selezionati.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((row) => (
                  <TableRow key={row.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell sx={{ fontFamily: tokens.font.mono, fontWeight: 600, fontSize: "13px" }}>
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
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: tokens.font.display, color: getProbColor(row.fastdetect_prob) }}>
                        {formatProb(row.fastdetect_prob)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: tokens.font.display, color: getProbColor(row.binoculars_prob) }}>
                        {formatProb(row.binoculars_prob)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: tokens.font.display, color: getProbColor(row.desklib_prob) }}>
                        {formatProb(row.desklib_prob)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: tokens.font.display, color: getProbColor(row.ada_prob) }}>
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
          <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
            Mostrando {posts.length > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, totalPosts)} di{" "}
            <strong>{formatNumber(totalPosts)}</strong> post
          </Typography>
          <Pagination
            count={Math.ceil(totalPosts / pageSize)}
            page={page}
            onChange={(_e, p) => setPage(p)}
            shape="rounded"
            sx={{
              "& .Mui-selected": { backgroundColor: `${tokens.color.nearBlack} !important`, color: tokens.color.canvas },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
