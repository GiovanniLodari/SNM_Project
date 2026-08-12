import { useState } from "react";
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Paper,
  Card,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  LinearProgress,
  Stack,
} from "@mui/material";
import {
  Search as SearchIcon,
  ArrowBack as PrevIcon,
  ArrowForward as NextIcon,
  OpenInNew as LinkIcon,
} from "@mui/icons-material";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import { useFactCheckQuery } from "../api/queries.ts";
import { useDebounce } from "../hooks/useDebounce.ts";
import { tokens } from "../theme.ts";
import { EmptyState, ErrorState } from "../components/States.tsx";

export default function FactChecking() {
  const [selectedVerdicts, setSelectedVerdicts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchTerm, 400);

  const { data, isLoading: loading, isError } = useFactCheckQuery(
    selectedVerdicts, page, debouncedSearch,
  );
  const error = isError ? "Impossibile caricare i dati di fact-checking." : null;

  const handleVerdictToggle = (verdict: string) => {
    const nextVerdicts = selectedVerdicts.includes(verdict)
      ? selectedVerdicts.filter((v) => v !== verdict)
      : [...selectedVerdicts, verdict];
    setSelectedVerdicts(nextVerdicts);
    setPage(1);
  };

  const getVerdictBgColor = (verdict: string) => {
    const v = (verdict || "").toLowerCase();
    if (v.includes("falso")) return tokens.color.danger; // Red
    if (v.includes("vero")) return tokens.color.deepGreen; // Green
    if (v.includes("misto")) return tokens.color.coral; // Coral
    return tokens.color.textMuted; // Slate
  };

  // Prepare chart data
  const chartData = data?.verdicts
    ? Object.entries(data.verdicts).map(([verdictName, count]) => ({
        name: verdictName,
        count: count,
        color: getVerdictBgColor(verdictName),
      }))
    : [];

  // Nessun ripiego: se l'API non risponde il conteggio resta assente e la
  // pagina lo dichiara, invece di stampare il totale di una vecchia esecuzione.
  const totalAudited = data?.done ?? null;

  /** Quota percentuale sul totale auditato, o null se il totale non e' noto. */
  const quota = (parte: number): string | null =>
    totalAudited ? `${((parte / totalAudited) * 100).toFixed(1)}` : null;
  const trueCount = (data?.verdicts?.["vero"] || 0) + (data?.verdicts?.["perlopiù vero"] || 0);
  const falseCount = (data?.verdicts?.["falso"] || 0) + (data?.verdicts?.["perlopiù falso"] || 0);
  const unverifiableCount = data?.verdicts?.["non verificabile"] || 0;

  const parseEvidenceUrls = (rawUrls?: string): string[] => {
    if (!rawUrls) return [];
    return rawUrls
      .split(";")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));
  };


  return (
    <Box sx={{ pb: 8, backgroundColor: tokens.color.canvas }}>
      {/* Hero Header */}
      <Box sx={{ mb: 5, pt: 1, borderBottom: tokens.border.subtle, pb: 4 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: tokens.font.mono,
            fontSize: "12px",
            color: tokens.color.coral,
            fontWeight: 600,
            letterSpacing: "0.28px",
            textTransform: "uppercase",
            display: "block",
            mb: 1,
          }}
        >
          CLAIM VERIFICATION ARCHIVE
          {totalAudited !== null && ` • ${totalAudited.toLocaleString("it-IT")} AUDITED POSTS`}
        </Typography>
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
          LLM Truth Verification Index
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
          Verifica automatizzata dei claim e delle affermazioni fattuali eseguita mediante una pipeline LLM (<em>gpt-oss:20b</em>) combinata con ricerca di evidenze web in tempo reale su DuckDuckGo e Wikipedia.
        </Typography>
      </Box>

      <ErrorState message={error} />

      {/* KPI Cards Row */}

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
              Totale Post Auditati
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.black, mt: 1 }}>
              {totalAudited !== null ? totalAudited.toLocaleString("it-IT") : "n/d"}
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, fontSize: "13px" }}>
              Identificati come Checkworthy
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
              Verificati Veritieri (Vero)
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.deepGreen, mt: 1 }}>
              {trueCount.toLocaleString("it-IT")}
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, fontSize: "13px" }}>
              {quota(trueCount) ? `${quota(trueCount)}% confermati da fonti ufficiali` : "Totale non disponibile"}
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
              borderTop: `3px solid ${tokens.color.danger}`,
            }}
          >
            <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.danger, fontWeight: 600, textTransform: "uppercase" }}>
              Falsi / Disinformazione
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.danger, mt: 1 }}>
              {falseCount.toLocaleString("it-IT")}
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, fontSize: "13px" }}>
              {quota(falseCount) ? `${quota(falseCount)}% bufale / affermazioni smentite` : "Totale non disponibile"}
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
              borderTop: `3px solid ${tokens.color.textMuted}`,
            }}
          >
            <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.textMuted, fontWeight: 600, textTransform: "uppercase" }}>
              Non Verificabili / Opinioni
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.textMuted, mt: 1 }}>
              {unverifiableCount.toLocaleString("it-IT")}
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, fontSize: "13px" }}>
              {quota(unverifiableCount) ? `${quota(unverifiableCount)}% opinioni o assenza fonti` : "Totale non disponibile"}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Chart Section */}
      <Paper variant="outlined" sx={{ borderRadius: tokens.radius.lg, p: 3.5, mb: 6, borderColor: tokens.color.border }}>
        <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 700, mb: 1 }}>
          Ripartizione dei Verdetti di Fact-Checking
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 3 }}>
          {totalAudited !== null
            ? `Distribuzione dei ${totalAudited.toLocaleString("it-IT")} post auditati in base all'esito dell'analisi delle fonti web e al ragionamento sintetico del modello:`
            : "Distribuzione dei post auditati in base all'esito dell'analisi delle fonti web e al ragionamento sintetico del modello:"}
        </Typography>

        <Box sx={{ width: "100%", height: 260, minHeight: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <XAxis dataKey="name" style={{ fontSize: "12px", fontWeight: 600 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip formatter={(val: any) => [Number(val).toLocaleString("it-IT"), "Post"]} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Search and Filters */}
      <Paper variant="outlined" sx={{ borderRadius: tokens.radius.lg, p: 3, mb: 4, borderColor: tokens.color.border }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Filtra per Verdetto:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {["vero", "perlopiù vero", "misto", "perlopiù falso", "falso", "non verificabile"].map((v) => {
                const isSelected = selectedVerdicts.includes(v);
                return (
                  <Chip
                    key={v}
                    label={v}
                    onClick={() => handleVerdictToggle(v)}
                    sx={{
                      backgroundColor: isSelected ? getVerdictBgColor(v) : tokens.color.surfaceSubtle,
                      color: isSelected ? tokens.color.canvas : tokens.color.textPrimary,
                      fontWeight: 600,
                      border: tokens.border.subtle,
                      "&:hover": { opacity: 0.9 },
                    }}
                  />
                );
              })}
            </Stack>
          </Grid>

          <Grid item xs={12} md={5}>
            <TextField
              size="small"
              fullWidth
              placeholder="Cerca per parola chiave o motivazione..."
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

      {/* List of Audited Posts */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: tokens.color.nearBlack }} />
        </Box>
      ) : !data || data.page_rows.length === 0 ? (
        <EmptyState message="Nessun post di fact-checking trovato per i filtri selezionati." />
      ) : (
        <Stack spacing={3}>
          <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
            {data.total_count.toLocaleString("it-IT")}{" "}
            {data.total_count === 1 ? "risultato" : "risultati"}
            {(searchTerm || selectedVerdicts.length > 0) && " per i filtri attivi"}
            {" · pagina "}
            {data.page} di {Math.max(1, Math.ceil(data.total_count / data.page_size))}
          </Typography>

          {data.page_rows.map(({ post, row }) => {
            const evidenceLinks = parseEvidenceUrls(row.evidence_urls);
            const confPct = row.confidence ? Math.round(row.confidence * 100) : null;

            return (
              <Paper
                key={row.id}
                variant="outlined"
                sx={{
                  borderRadius: tokens.radius.lg,
                  p: 3.5,
                  borderColor: tokens.color.border,
                  "&:hover": { borderColor: tokens.color.nearBlack },
                  transition: "border-color 0.2s ease",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, flexWrap: "wrap", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Chip
                      label={row.verdict.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: getVerdictBgColor(row.verdict),
                        color: tokens.color.canvas,
                        fontWeight: 700,
                        fontSize: "11px",
                        fontFamily: tokens.font.mono,
                      }}
                    />
                    <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.textMuted }}>
                      STATUS #{row.id} • {post.language || "en"}
                    </Typography>
                  </Box>

                  {confPct !== null && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 160 }}>
                      <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontWeight: 600 }}>
                        Confidenza: {confPct}%
                      </Typography>
                      <Box sx={{ flexGrow: 1, minWidth: 60 }}>
                        <LinearProgress
                          variant="determinate"
                          value={confPct}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: tokens.color.softStone,
                            "& .MuiLinearProgress-bar": { backgroundColor: getVerdictBgColor(row.verdict) },
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Content Text */}
                <Typography variant="body1" sx={{ color: tokens.color.textPrimary, fontWeight: 500, fontSize: "15px", lineHeight: 1.5, mb: 2.5 }}>
                  "{post.content}"
                </Typography>

                {/* LLM Reasoning Box */}
                {row.reasoning && (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: tokens.radius.md,
                      backgroundColor: tokens.color.surfaceSubtle,
                      borderLeft: `4px solid ${getVerdictBgColor(row.verdict)}`,
                      mb: 2,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontWeight: 700, textTransform: "uppercase", display: "block", mb: 0.5 }}>
                      MOTIVAZIONE & RAGIONAMENTO LLM ({row.model || "gpt-oss:20b"}):
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.color.textPrimary, fontSize: "14px", lineHeight: 1.5 }}>
                      {row.reasoning}
                    </Typography>
                  </Box>
                )}

                {/* Evidence URLs */}
                {evidenceLinks.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontWeight: 600, display: "block", mb: 1 }}>
                      FONTI ED EVIDENZE WEB CONSULTATE:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {evidenceLinks.slice(0, 4).map((url, idx) => (
                        <Chip
                          key={idx}
                          icon={<LinkIcon sx={{ fontSize: "14px !important" }} />}
                          label={new URL(url).hostname}
                          component="a"
                          href={url}
                          target="_blank"
                          clickable
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "11px", color: tokens.color.actionBlue, borderColor: tokens.color.actionBlue }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Paper>
            );
          })}

          {/* Pagination Controls */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 4 }}>
            <Button
              variant="outlined"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              startIcon={<PrevIcon />}
              sx={{ borderRadius: "20px", textTransform: "none", color: tokens.color.nearBlack, borderColor: tokens.color.border }}
            >
              Pagina Precedente
            </Button>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
              Pagina <strong>{page}</strong>
            </Typography>
            <Button
              variant="outlined"
              disabled={!data?.has_next}
              onClick={() => setPage((p) => p + 1)}
              endIcon={<NextIcon />}
              sx={{ borderRadius: "20px", textTransform: "none", color: tokens.color.nearBlack, borderColor: tokens.color.border }}
            >
              Pagina Successiva
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
