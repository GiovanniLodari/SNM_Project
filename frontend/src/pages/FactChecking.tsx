import { useEffect, useState } from "react";
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
import { api, FactCheckResponse } from "../api/client.ts";
import { useDebounce } from "../hooks/useDebounce.ts";

export default function FactChecking() {
  const [data, setData] = useState<FactCheckResponse | null>(null);
  const [selectedVerdicts, setSelectedVerdicts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFactCheckData = (verdicts: string[], pg: number, search: string) => {
    setLoading(true);
    api.factCheck(verdicts, pg, search)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossibile caricare i dati di fact-checking.");
        setLoading(false);
      });
  };

  const debouncedSearch = useDebounce(searchTerm, 400);

  useEffect(() => {
    fetchFactCheckData(selectedVerdicts, page, debouncedSearch);
  }, [page, selectedVerdicts, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerdictToggle = (verdict: string) => {
    const nextVerdicts = selectedVerdicts.includes(verdict)
      ? selectedVerdicts.filter((v) => v !== verdict)
      : [...selectedVerdicts, verdict];
    setSelectedVerdicts(nextVerdicts);
    setPage(1);
  };

  const getVerdictBgColor = (verdict: string) => {
    const v = (verdict || "").toLowerCase();
    if (v.includes("falso")) return "#b30000"; // Red
    if (v.includes("vero")) return "#003c33"; // Green
    if (v.includes("misto")) return "#ff7759"; // Coral
    return "#75758a"; // Slate
  };

  // Prepare chart data
  const chartData = data?.verdicts
    ? Object.entries(data.verdicts).map(([verdictName, count]) => ({
        name: verdictName,
        count: count,
        color: getVerdictBgColor(verdictName),
      }))
    : [];

  const totalAudited = data?.done || 35767;
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
          CLAIM VERIFICATION ARCHIVE • 35.767 AUDITED POSTS
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
          LLM Truth Verification Index
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
          Verifica automatizzata dei claim e delle affermazioni fattuali eseguita mediante una pipeline LLM (<em>gpt-oss:20b</em>) combinata con ricerca di evidenze web in tempo reale su DuckDuckGo e Wikipedia.
        </Typography>
      </Box>

      {error && (
        <Paper variant="outlined" sx={{ p: 3, mb: 4, borderColor: "#b30000", backgroundColor: "#fdf2f2" }}>
          <Typography variant="body2" sx={{ color: "#b30000", fontWeight: 600 }}>
            {error}
          </Typography>
        </Paper>
      )}

      {/* KPI Cards Row */}

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
              Totale Post Auditati
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#000000", mt: 1 }}>
              {totalAudited.toLocaleString("it-IT")}
            </Typography>
            <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5, fontSize: "13px" }}>
              Identificati come Checkworthy
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
              Verificati Veritieri (Vero)
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#003c33", mt: 1 }}>
              {trueCount.toLocaleString("it-IT")}
            </Typography>
            <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5, fontSize: "13px" }}>
              {((trueCount / totalAudited) * 100).toFixed(1)}% confermati da fonti ufficiali
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
              borderTop: "3px solid #b30000",
            }}
          >
            <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#b30000", fontWeight: 600, textTransform: "uppercase" }}>
              Falsi / Disinformazione
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#b30000", mt: 1 }}>
              {falseCount.toLocaleString("it-IT")}
            </Typography>
            <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5, fontSize: "13px" }}>
              {((falseCount / totalAudited) * 100).toFixed(1)}% bufale / affermazioni smentite
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
              borderTop: "3px solid #75758a",
            }}
          >
            <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#75758a", fontWeight: 600, textTransform: "uppercase" }}>
              Non Verificabili / Opinioni
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#75758a", mt: 1 }}>
              {unverifiableCount.toLocaleString("it-IT")}
            </Typography>
            <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5, fontSize: "13px" }}>
              {((unverifiableCount / totalAudited) * 100).toFixed(1)}% opinioni o assenza fonti
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Chart Section */}
      <Paper variant="outlined" sx={{ borderRadius: "16px", p: 3.5, mb: 6, borderColor: "#e5e7eb" }}>
        <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, mb: 1 }}>
          Ripartizione dei Verdetti di Fact-Checking
        </Typography>
        <Typography variant="body2" sx={{ color: "#75758a", mb: 3 }}>
          Distribuzione dei 35.767 post auditati in base all'esito dell'analisi delle fonti web e al ragionamento sintetico del modello:
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
      <Paper variant="outlined" sx={{ borderRadius: "16px", p: 3, mb: 4, borderColor: "#e5e7eb" }}>
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
                      backgroundColor: isSelected ? getVerdictBgColor(v) : "#f8f9fa",
                      color: isSelected ? "#ffffff" : "#212121",
                      fontWeight: 600,
                      border: "1px solid #e5e7eb",
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

      {/* List of Audited Posts */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: "#17171c" }} />
        </Box>
      ) : !data || data.page_rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: "center", borderRadius: "16px", borderColor: "#e5e7eb" }}>
          <Typography variant="body1" sx={{ color: "#75758a" }}>
            Nessun post di fact-checking trovato per i filtri selezionati.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {data.page_rows.map(({ post, row }) => {
            const evidenceLinks = parseEvidenceUrls(row.evidence_urls);
            const confPct = row.confidence ? Math.round(row.confidence * 100) : null;

            return (
              <Paper
                key={row.id}
                variant="outlined"
                sx={{
                  borderRadius: "16px",
                  p: 3.5,
                  borderColor: "#e5e7eb",
                  "&:hover": { borderColor: "#17171c" },
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
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "11px",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    />
                    <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#75758a" }}>
                      STATUS #{row.id} • {post.language || "en"}
                    </Typography>
                  </Box>

                  {confPct !== null && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 160 }}>
                      <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 600 }}>
                        Confidenza: {confPct}%
                      </Typography>
                      <Box sx={{ flexGrow: 1, minWidth: 60 }}>
                        <LinearProgress
                          variant="determinate"
                          value={confPct}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: "#eeece7",
                            "& .MuiLinearProgress-bar": { backgroundColor: getVerdictBgColor(row.verdict) },
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Content Text */}
                <Typography variant="body1" sx={{ color: "#212121", fontWeight: 500, fontSize: "15px", lineHeight: 1.5, mb: 2.5 }}>
                  "{post.content}"
                </Typography>

                {/* LLM Reasoning Box */}
                {row.reasoning && (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: "12px",
                      backgroundColor: "#f8f9fa",
                      borderLeft: `4px solid ${getVerdictBgColor(row.verdict)}`,
                      mb: 2,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 700, textTransform: "uppercase", display: "block", mb: 0.5 }}>
                      MOTIVAZIONE & RAGIONAMENTO LLM ({row.model || "gpt-oss:20b"}):
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#212121", fontSize: "14px", lineHeight: 1.5 }}>
                      {row.reasoning}
                    </Typography>
                  </Box>
                )}

                {/* Evidence URLs */}
                {evidenceLinks.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 600, display: "block", mb: 1 }}>
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
                          sx={{ fontSize: "11px", color: "#1863dc", borderColor: "#1863dc" }}
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
              sx={{ borderRadius: "20px", textTransform: "none", color: "#17171c", borderColor: "#e5e7eb" }}
            >
              Pagina Precedente
            </Button>
            <Typography variant="body2" sx={{ color: "#75758a" }}>
              Pagina <strong>{page}</strong>
            </Typography>
            <Button
              variant="outlined"
              disabled={!data?.has_next}
              onClick={() => setPage((p) => p + 1)}
              endIcon={<NextIcon />}
              sx={{ borderRadius: "20px", textTransform: "none", color: "#17171c", borderColor: "#e5e7eb" }}
            >
              Pagina Successiva
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
