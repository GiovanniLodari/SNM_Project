import { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Chip,
  LinearProgress,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Link } from "react-router-dom";
import { api, AiDetectionResponse } from "../api/client.ts";
import {
  ArrowBack as PrevIcon,
  ArrowForward as NextIcon,
  SmartToy as BotIcon,
  ArrowUpward as TopIcon,
  ArrowDownward as BottomIcon,
  FormatListNumbered as IdIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";
import StatsModal from "../components/StatsModal.tsx";

export default function AiDetectionBinoculars() {
  const [data, setData] = useState<AiDetectionResponse | null>(null);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("id");
  const [page, setPage] = useState(1);
  const [bucketPages, setBucketPages] = useState<Record<string, number>>({});
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ITEMS_PER_BUCKET_PAGE = 5;

  const fetchAiData = (buckets: string[], pg: number, sort: string) => {
    setLoading(true);
    api.aiDetection(buckets, pg, sort, "binoculars")
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossibile caricare le analisi di rilevamento IA Binoculars.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAiData(selectedBuckets, page, sortBy);
  }, [page, selectedBuckets, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBucketChange = (bucket: string) => {
    const nextBuckets = selectedBuckets.includes(bucket)
      ? selectedBuckets.filter((b) => b !== bucket)
      : [...selectedBuckets, bucket];
    setSelectedBuckets(nextBuckets);
    setPage(1);
    // fetchAiData verrà chiamato dall'useEffect al cambio di selectedBuckets
  };

  const handleSortChange = (_: any, newSort: string | null) => {
    if (!newSort) return;
    setSortBy(newSort);
    setPage(1);
    // fetchAiData verrà chiamato dall'useEffect al cambio di sortBy
  };

  const getBucketPage = (bName: string) => bucketPages[bName] || 1;

  const setBucketPage = (bName: string, newPg: number) => {
    setBucketPages((prev) => ({ ...prev, [bName]: newPg }));
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress sx={{ color: "#17171c" }} />
      </Box>
    );
  }

  const maxHistVal = data ? Math.max(...Object.values(data.histogram), 1) : 1;

  return (
    <Box>
      <Box sx={{ mb: 6 }}>
        <Chip
          label="DETECTOR 2/3 • QWEN2.5 CROSS-PERPLEXITY RATIO (ICML 2024)"
          sx={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            color: "#003c33",
            backgroundColor: "#edfce9",
            mb: 2,
            px: 1,
            fontWeight: 600,
          }}
        />
        <Typography
          variant="h2"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 400,
            fontSize: { xs: "32px", md: "48px" },
            color: "#17171c",
            letterSpacing: "-0.48px",
            lineHeight: 1.2,
            mb: 1,
          }}
        >
          Rilevamento IA (Binoculars)
        </Typography>
        <Typography variant="body1" sx={{ color: "#75758a" }}>
          Rilevamento di testo sintetico tramite il metodo <strong>Binoculars (Hans et al., ICML 2024)</strong> basato sulla ratio tra Perplessità e Cross-Perplessità della coppia di modelli Qwen2.5 (0.5B observer / 0.5B-Instruct performer).
        </Typography>
      </Box>

      {error && (
        <Paper variant="outlined" sx={{ p: 3, mb: 4, borderColor: "#b30000", backgroundColor: "#fdf2f2" }}>
          <Typography variant="body2" sx={{ color: "#b30000", fontWeight: 600 }}>
            {error}
          </Typography>
        </Paper>
      )}

      {data && (
        <Grid container spacing={4} sx={{ mb: 6 }}>
          {/* Summary Card */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 4,
                borderRadius: "22px",
                backgroundColor: "#eeece7",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: "#75758a", mb: 2, display: "block" }}>
                  STATO ANALISI BINOCULARS
                </Typography>
                <Typography
                  variant="h1"
                  sx={{
                    fontFamily: "Space Grotesk, Inter, sans-serif",
                    fontWeight: 400,
                    fontSize: "56px",
                    color: "#17171c",
                    lineHeight: 1.0,
                    mb: 2,
                  }}
                >
                  {data.done.toLocaleString("it-IT")}
                </Typography>
                <Typography variant="body2" sx={{ color: "#75758a" }}>
                  Post valutati su <strong>{data.eligible.toLocaleString("it-IT")}</strong> totali nel dataset.
                </Typography>
              </Box>

              {data.stats && (
                <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid #d9d9dd" }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => setStatsModalOpen(true)}
                    startIcon={<AnalyticsIcon />}
                    sx={{
                      backgroundColor: "#003c33",
                      color: "#ffffff",
                      borderRadius: "32px",
                      py: 1.2,
                      textTransform: "none",
                      fontWeight: 600,
                      boxShadow: "none",
                      "&:hover": { backgroundColor: "#002a24" },
                    }}
                  >
                    Statistiche Descrittive Avanzate
                  </Button>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Histogram Card */}
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                p: 4,
                borderRadius: "22px",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                height: "100%",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#17171c", mb: 3 }}>
                Spettro di Probabilità Binoculars
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Object.entries(data.histogram).map(([bucket, count]) => {
                  const pct = Math.round((count / maxHistVal) * 100);
                  const isHighRisk = bucket === "0.8-1.0" || bucket === "0.6-0.8";
                  return (
                    <Box key={bucket}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: "#17171c", fontWeight: 500 }}>
                          Fascia {bucket}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#75758a" }}>
                          {count.toLocaleString("it-IT")} post
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#f2f2f2",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: isHighRisk ? "#003c33" : "#003c33",
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Probability Bucket Sampling Cards */}
      {data?.bucket_samples && Object.keys(data.bucket_samples).length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#17171c" }}>
              Campionamento Rappresentativo per Fascia di Probabilità Binoculars
            </Typography>
            <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5 }}>
              Campioni estratti da <code>ai_scores_binoculars.jsonl</code> per ciascuna fascia di confidenza.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {Object.entries(data.bucket_samples).map(([bucketName, samples]) => {
              const currentPage = getBucketPage(bucketName);
              const totalPages = Math.max(1, Math.ceil(samples.length / ITEMS_PER_BUCKET_PAGE));
              const startIndex = (currentPage - 1) * ITEMS_PER_BUCKET_PAGE;
              const paginatedSamples = samples.slice(startIndex, startIndex + ITEMS_PER_BUCKET_PAGE);

              return (
                <Grid item xs={12} md={2.4} key={bucketName}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: "16px",
                      border: "1px solid #e2e4e8",
                      backgroundColor: "#ffffff",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Chip
                          label={`Fascia ${bucketName}`}
                          size="small"
                          sx={{
                            backgroundColor: "#edfce9",
                            color: "#003c33",
                            fontWeight: 700,
                            fontSize: "11px",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "#75758a", fontSize: "11px" }}>
                          {samples.length} post
                        </Typography>
                      </Box>

                      <List disablePadding>
                        {paginatedSamples.map(({ post, probability }) => (
                          <Box key={post.id}>
                            <ListItem disablePadding sx={{ py: 1, px: 0, flexDirection: "column", alignItems: "flex-start" }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", mb: 0.5 }}>
                                <Typography
                                  component={Link}
                                  to={`/posts/${post.id}`}
                                  variant="caption"
                                  sx={{
                                    fontFamily: "ui-monospace, monospace",
                                    color: "#1863dc",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    "&:hover": { textDecoration: "underline" },
                                  }}
                                >
                                  #{post.id}
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "#003c33" }}>
                                  {(probability * 100).toFixed(1)}%
                                </Typography>
                              </Box>
                              <ListItemText
                                primary={post.content}
                                primaryTypographyProps={{
                                  variant: "body2",
                                  sx: {
                                    fontSize: "12px",
                                    color: "#212121",
                                    overflow: "hidden",
                                    lineHeight: 1.3,
                                  },
                                }}
                              />

                            </ListItem>
                            <Divider sx={{ my: 0.5, borderColor: "#f2f2f2" }} />
                          </Box>
                        ))}
                      </List>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1, mt: 1, borderTop: "1px solid #f2f2f2" }}>
                      <Button
                        size="small"
                        disabled={currentPage <= 1}
                        onClick={() => setBucketPage(bucketName, currentPage - 1)}
                        sx={{ minWidth: 28, p: 0.3 }}
                      >
                        <PrevIcon sx={{ fontSize: 16 }} />
                      </Button>
                      <Typography variant="caption" sx={{ color: "#75758a", fontSize: "11px" }}>
                        {currentPage} / {totalPages}
                      </Typography>
                      <Button
                        size="small"
                        disabled={currentPage >= totalPages}
                        onClick={() => setBucketPage(bucketName, currentPage + 1)}
                        sx={{ minWidth: 28, p: 0.3 }}
                      >
                        <NextIcon sx={{ fontSize: 16 }} />
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Main Filter & Table */}
      <Paper variant="outlined" sx={{ borderRadius: "16px", p: 3, mb: 4, borderColor: "#e5e7eb" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: "#17171c", mb: 2 }}>
          Filtra & Esplora i Post Valutati da Binoculars
        </Typography>

        <FormGroup row sx={{ gap: 2, mb: 3 }}>
          {data?.prob_buckets.map((b) => (
            <FormControlLabel
              key={b}
              control={
                <Checkbox
                  checked={selectedBuckets.includes(b)}
                  onChange={() => handleBucketChange(b)}
                  sx={{ color: "#75758a", "&.Mui-checked": { color: "#003c33" } }}
                />
              }
              label={`Fascia ${b}%`}
            />
          ))}
        </FormGroup>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <ToggleButtonGroup value={sortBy} exclusive onChange={handleSortChange} size="small">
            <ToggleButton value="id">
              <IdIcon sx={{ mr: 0.5, fontSize: 16 }} /> Per ID (Crescente)
            </ToggleButton>
            <ToggleButton value="top">
              <TopIcon sx={{ mr: 0.5, fontSize: 16 }} /> Più Probabile IA
            </ToggleButton>
            <ToggleButton value="bottom">
              <BottomIcon sx={{ mr: 0.5, fontSize: 16 }} /> Meno Probabile IA
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Table Rows */}
      {data && (
        <Paper variant="outlined" sx={{ borderRadius: "16px", overflow: "hidden", borderColor: "#e5e7eb" }}>
          <List disablePadding>
            {data.page_rows.map(({ post, probability }, idx) => (
              <Box key={post.id}>
                <ListItem sx={{ py: 2.5, px: 3, display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <Chip
                    label={`#${post.id}`}
                    component={Link}
                    to={`/posts/${post.id}`}
                    clickable
                    size="small"
                    sx={{
                      fontFamily: "ui-monospace, monospace",
                      fontWeight: 600,
                      backgroundColor: "#f1f5ff",
                      color: "#1863dc",
                    }}
                  />
                  {post.bot && <BotIcon sx={{ color: "#75758a", fontSize: 18 }} />}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" sx={{ color: "#212121", fontSize: "14px", lineHeight: 1.5, mb: 1 }}>
                      {post.content}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <Typography variant="caption" sx={{ color: "#75758a" }}>
                        Lingua: {post.language || "N/A"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ minWidth: 100, textAlign: "right" }}>
                    <Typography variant="caption" sx={{ color: "#75758a", display: "block" }}>
                      Probabilità Binoculars
                    </Typography>
                    <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#003c33" }}>
                      {(probability * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </ListItem>
                {idx < data.page_rows.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </Paper>
      )}

      {/* Pagination Footer */}
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

      {/* Stats Modal */}
      {data?.stats && (
        <StatsModal open={statsModalOpen} onClose={() => setStatsModalOpen(false)} stats={data.stats} />
      )}
    </Box>
  );
}
