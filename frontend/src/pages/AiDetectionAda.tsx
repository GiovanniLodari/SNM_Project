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

export default function AiDetectionAda() {
  const [data, setData] = useState<AiDetectionResponse | null>(null);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("id");
  const [page, setPage] = useState(1);
  const [bucketPages, setBucketPages] = useState<Record<string, number>>({});
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ITEMS_PER_BUCKET_PAGE = 2;

  const fetchAiData = (buckets: string[], pg: number, sort: string) => {
    setLoading(true);
    api.aiDetection(buckets, pg, sort, "ada")
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossibile caricare le analisi di rilevamento IA AdaDetectGPT Local.");
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
  };

  const handleSortChange = (_: any, newSort: string | null) => {
    if (!newSort) return;
    setSortBy(newSort);
    setPage(1);
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
          label="DETECTOR 4/4 • ADADETECTGPT (GPT-NEO 2.7B)"
          sx={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            color: "#8b5cf6",
            backgroundColor: "#f5f3ff",
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
          Rilevamento IA (AdaDetectGPT)
        </Typography>
        <Typography variant="body1" sx={{ color: "#75758a" }}>
          Analisi zero-shot tramite l&apos;algoritmo <strong>AdaDetectGPT</strong> con perturba-curvatura adattiva su modello <strong>GPT-Neo 2.7B</strong>.
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
                backgroundColor: "#f5f3ff",
                border: "1px solid #ddd6fe",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: "#7c3aed", mb: 2, display: "block", fontWeight: 700 }}>
                  STATO ANALISI ADADETECTGPT
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
                <Typography variant="body2" sx={{ color: "#6d28d9" }}>
                  Post valutati su <strong>{data.eligible.toLocaleString("it-IT")}</strong> idonei nel dataset.
                </Typography>
              </Box>

              {data.stats && (
                <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid #ddd6fe" }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => setStatsModalOpen(true)}
                    startIcon={<AnalyticsIcon />}
                    sx={{
                      backgroundColor: "#7c3aed",
                      color: "#ffffff",
                      borderRadius: "32px",
                      py: 1.2,
                      textTransform: "none",
                      fontWeight: 600,
                      boxShadow: "none",
                      "&:hover": { backgroundColor: "#6d28d9" },
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
            <Paper sx={{ p: 4, borderRadius: "22px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
              <Typography variant="caption" sx={{ color: "#75758a", mb: 3, fontWeight: 700, display: "block" }}>
                DISTRIBUZIONE PROBABILITÀ IA (ADADETECTGPT)
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Object.entries(data.histogram).map(([bucket, count]) => {
                  const pct = Math.round((count / (data.done || 1)) * 100);
                  const normVal = (count / maxHistVal) * 100;
                  return (
                    <Box key={bucket}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#17171c", fontWeight: 600 }}>
                          Scaglione {bucket}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#75758a" }}>
                          {count.toLocaleString("it-IT")} post ({pct}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={normVal}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: "#f3f4f6",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: bucket.startsWith("0.8") || bucket.startsWith("0.6") ? "#8b5cf6" : "#c4b5fd",
                            borderRadius: 6,
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Probability Bucket Samples Carousel/Pagination Section */}
      {data && data.bucket_samples && (
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 600,
              color: "#17171c",
              mb: 3,
            }}
          >
            Campioni di Post per Scaglione di Probabilità
          </Typography>

          <Grid container spacing={3}>
            {Object.entries(data.bucket_samples).map(([bucketName, samples]) => {
              if (!samples || samples.length === 0) return null;
              const curBucketPg = getBucketPage(bucketName);
              const totalPages = Math.ceil(samples.length / ITEMS_PER_BUCKET_PAGE);
              const startIdx = (curBucketPg - 1) * ITEMS_PER_BUCKET_PAGE;
              const currentSamples = samples.slice(startIdx, startIdx + ITEMS_PER_BUCKET_PAGE);

              return (
                <Grid item xs={12} md={6} key={bucketName}>
                  <Paper sx={{ p: 3, borderRadius: "18px", border: "1px solid #e5e7eb", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Chip
                          label={`Scaglione ${bucketName}`}
                          size="small"
                          sx={{
                            fontFamily: "ui-monospace, monospace",
                            fontSize: "11px",
                            fontWeight: 700,
                            backgroundColor: "#f5f3ff",
                            color: "#7c3aed",
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "#75758a" }}>
                          Campione {curBucketPg} di {totalPages} ({samples.length} totali)
                        </Typography>
                      </Box>

                      <List disablePadding>
                        {currentSamples.map(({ post, probability }) => (
                          <Paper key={post.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: "12px", borderColor: "#e5e7eb" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: "#17171c" }}>
                                {post.acct}
                              </Typography>
                              <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#7c3aed" }}>
                                Prob: {(probability * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: "#4b5563", fontSize: "13px", lineHeight: 1.4, mb: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {post.content}
                            </Typography>
                            <Typography
                              component={Link}
                              to={`/posts/${post.id}`}
                              variant="caption"
                              sx={{ color: "#7c3aed", textDecoration: "none", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
                            >
                              Vedi Dettaglio Post #{post.id} &rarr;
                            </Typography>
                          </Paper>
                        ))}
                      </List>
                    </Box>

                    {totalPages > 1 && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1 }}>
                        <Button
                          size="small"
                          disabled={curBucketPg === 1}
                          onClick={() => setBucketPage(bucketName, curBucketPg - 1)}
                          startIcon={<PrevIcon fontSize="small" />}
                          sx={{ textTransform: "none" }}
                        >
                          Precedenti
                        </Button>
                        <Button
                          size="small"
                          disabled={curBucketPg >= totalPages}
                          onClick={() => setBucketPage(bucketName, curBucketPg + 1)}
                          endIcon={<NextIcon fontSize="small" />}
                          sx={{ textTransform: "none" }}
                        >
                          Successivi
                        </Button>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Main Scored Corpus List Section */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: "18px", border: "1px solid #e5e7eb", mb: 3 }}>
            <Typography variant="caption" sx={{ color: "#75758a", mb: 2, fontWeight: 700, letterSpacing: "0.5px", display: "block" }}>
              FILTRA PER FASCIA DI PROBABILITÀ
            </Typography>
            <FormGroup>
              {data && data.prob_buckets.map((b) => (
                <FormControlLabel
                  key={b}
                  control={
                    <Checkbox
                      checked={selectedBuckets.includes(b)}
                      onChange={() => handleBucketChange(b)}
                      size="small"
                      sx={{ color: "#8b5cf6", "&.Mui-checked": { color: "#7c3aed" } }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace", fontSize: "13px" }}>
                      Fascia {b}%
                    </Typography>
                  }
                />
              ))}
            </FormGroup>

            <Divider sx={{ my: 3 }} />

            <Typography variant="caption" sx={{ color: "#75758a", mb: 2, fontWeight: 700, letterSpacing: "0.5px", display: "block" }}>
              ORDINAMENTO RISULTATI
            </Typography>
            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={handleSortChange}
              size="small"
              orientation="vertical"
              fullWidth
              sx={{ gap: 1 }}
            >
              <ToggleButton value="id" sx={{ borderRadius: "10px !important", justifyContent: "flex-start", px: 2 }}>
                <IdIcon sx={{ mr: 1, fontSize: 18 }} /> Per ID crescente
              </ToggleButton>
              <ToggleButton value="id_desc" sx={{ borderRadius: "10px !important", justifyContent: "flex-start", px: 2 }}>
                <IdIcon sx={{ mr: 1, fontSize: 18 }} /> Per ID decrescente
              </ToggleButton>
              <ToggleButton value="top" sx={{ borderRadius: "10px !important", justifyContent: "flex-start", px: 2 }}>
                <TopIcon sx={{ mr: 1, fontSize: 18 }} /> Più probabile IA
              </ToggleButton>
              <ToggleButton value="bottom" sx={{ borderRadius: "10px !important", justifyContent: "flex-start", px: 2 }}>
                <BottomIcon sx={{ mr: 1, fontSize: 18 }} /> Meno probabile IA
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          <Paper sx={{ borderRadius: "18px", border: "1px solid #e5e7eb", overflow: "hidden", mb: 4 }}>
            <Box sx={{ p: 3, backgroundColor: "#fafafa", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "16px", color: "#17171c" }}>
                Status Valutati da AdaDetectGPT
              </Typography>
              {data && (
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  Pagina {data.page} ({data.page_rows.length} elementi)
                </Typography>
              )}
            </Box>

            <List disablePadding>
              {data && data.page_rows.map(({ post, probability }, idx) => (
                <Box key={post.id}>
                  <ListItem
                    sx={{
                      p: 3,
                      alignItems: "flex-start",
                      transition: "background-color 0.15s ease",
                      "&:hover": { backgroundColor: "#f5f3ff" },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#17171c" }}>
                              {post.acct}
                            </Typography>
                            <Chip label={post.domain} size="small" sx={{ borderRadius: "12px", fontSize: "11px", backgroundColor: "#eeece7" }} />
                            {post.bot && (
                              <Chip
                                icon={<BotIcon style={{ fontSize: 14, color: "#ffffff" }} />}
                                label="BOT"
                                size="small"
                                sx={{ borderRadius: "12px", fontSize: "11px", backgroundColor: "#17171c", color: "#ffffff" }}
                              />
                            )}
                          </Box>
                          <Chip
                            label={`IA: ${(probability * 100).toFixed(1)}%`}
                            size="small"
                            sx={{
                              fontFamily: "ui-monospace, monospace",
                              fontWeight: 700,
                              fontSize: "12px",
                              backgroundColor: probability >= 0.5 ? "#7c3aed" : "#f3f4f6",
                              color: probability >= 0.5 ? "#ffffff" : "#4b5563",
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ color: "#374151", fontSize: "14px", lineHeight: 1.5, mb: 2 }}>
                            {post.content}
                          </Typography>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                              ID Status #{post.id} • Lingua: {post.language ? post.language.toUpperCase() : "N/D"}
                            </Typography>
                            <Typography
                              component={Link}
                              to={`/posts/${post.id}`}
                              variant="caption"
                              sx={{ color: "#7c3aed", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                            >
                              Dettaglio completo &rarr;
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < data.page_rows.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Paper>

          {data && (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 6 }}>
              <Button
                variant="outlined"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                startIcon={<PrevIcon />}
                sx={{ borderRadius: "32px" }}
              >
                Pagina Precedente
              </Button>
              <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 600 }}>
                Pagina {page}
              </Typography>
              <Button
                variant="outlined"
                disabled={!data.has_next}
                onClick={() => setPage(page + 1)}
                endIcon={<NextIcon />}
                sx={{ borderRadius: "32px" }}
              >
                Pagina Successiva
              </Button>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Modal delle statistiche descrittive */}
      {data && data.stats && (
        <StatsModal
          open={statsModalOpen}
          onClose={() => setStatsModalOpen(false)}
          stats={data.stats}
          detectorLabel="AdaDetectGPT (GPT-Neo 2.7B)"
        />
      )}
    </Box>
  );
}
