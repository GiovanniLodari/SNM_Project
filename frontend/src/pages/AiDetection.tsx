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

export default function AiDetection() {
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
    api.aiDetection(buckets, pg, sort)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossibile caricare le analisi di rilevamento IA.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAiData(selectedBuckets, page, sortBy);
  }, [page]);

  const handleBucketChange = (bucket: string) => {
    const nextBuckets = selectedBuckets.includes(bucket)
      ? selectedBuckets.filter((b) => b !== bucket)
      : [...selectedBuckets, bucket];
    setSelectedBuckets(nextBuckets);
    setPage(1);
    fetchAiData(nextBuckets, 1, sortBy);
  };

  const handleSortChange = (_: any, newSort: string | null) => {
    if (!newSort) return;
    setSortBy(newSort);
    setPage(1);
    fetchAiData(selectedBuckets, 1, newSort);
  };

  const getBucketPage = (bName: string) => bucketPages[bName] || 1;

  const setBucketPage = (bName: string, newPg: number) => {
    setBucketPages((prev) => ({ ...prev, [bName]: newPg }));
  };



  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  const maxHistVal = data ? Math.max(...Object.values(data.histogram), 1) : 1;

  return (
    <Box>
      <Box sx={{ mb: 6 }}>
        <Chip
          label="SYNTHETIC CONTENT CLASSIFICATION"
          sx={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            color: "#75758a",
            backgroundColor: "#eeece7",
            mb: 2,
            px: 1,
          }}
        />
        <Typography
          variant="h2"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 400,
            fontSize: { xs: "32px", md: "48px" },
            color: "#17171c",
            mb: 1,
          }}
        >
          Fast-DetectGPT Probability Spectrum.
        </Typography>
        <Typography variant="body1" sx={{ color: "#75758a" }}>
          Estimated likelihood distribution of machine-generated synthetic text in English language statuses.
        </Typography>
      </Box>

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
              }}
            >
              <Typography variant="caption" sx={{ color: "#75758a", mb: 2, display: "block" }}>
                PROCESSED STATUSES
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
                {data.done.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: "#75758a" }}>
                Out of <strong>{data.eligible.toLocaleString()}</strong> eligible English statuses.
              </Typography>
              <Typography variant="caption" sx={{ color: "#75758a", display: "block", mt: 2, mb: 2 }}>
                Threshold for AI flag: &ge; {data.ai_threshold * 100}%
              </Typography>

              <Button
                variant="contained"
                startIcon={<AnalyticsIcon />}
                onClick={() => setStatsModalOpen(true)}
                sx={{
                  mt: 1,
                  w: "100%",
                  borderRadius: "16px",
                  py: 1.2,
                  px: 2.5,
                  fontWeight: 700,
                  fontSize: "13px",
                  textTransform: "none",
                  background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
                  color: "#ffffff",
                  boxShadow: "0 8px 20px rgba(30, 27, 75, 0.3)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    background: "linear-gradient(135deg, #312e81 0%, #4338ca 100%)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 24px rgba(30, 27, 75, 0.4)",
                  },
                }}
              >
                Statistiche Descrittive
              </Button>
            </Box>
          </Grid>


          {/* Histogram Chart */}
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
                Probability Range Distribution
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Object.entries(data.histogram).map(([bucket, count]) => {
                  const percent = (count / maxHistVal) * 100;
                  return (
                    <Box key={bucket} sx={{ display: "flex", alignItems: "center" }}>
                      <Typography variant="caption" sx={{ minWidth: 70, color: "#75758a" }}>
                        {bucket}
                      </Typography>
                      <Box sx={{ flexGrow: 1, mx: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: "#eeece7",
                            "& .MuiLinearProgress-bar": { backgroundColor: "#ff7759" }, // Coral fill
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ minWidth: 60, textAlign: "right", fontWeight: 600, color: "#17171c" }}>
                        {count.toLocaleString()}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Bucket Sampling / Exploration Module */}
      {data && data.bucket_samples && (
        <Paper
          sx={{
            p: 4,
            mb: 6,
            borderRadius: "22px",
            border: "1px solid #e5e7eb",
            backgroundColor: "#fafaf8",
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Chip
              label="TIER EXPLORER"
              size="small"
              sx={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "10px",
                color: "#ff7759",
                backgroundColor: "#fff0ec",
                fontWeight: 700,
                mb: 1,
              }}
            />
            <Typography variant="h5" sx={{ fontWeight: 600, color: "#17171c" }}>
              Esplorazione Post per Scaglione di Probabilità AI
            </Typography>
            <Typography variant="body2" sx={{ color: "#75758a", mt: 0.5 }}>
              Campioni estratti direttamente da <code>ai_scores.jsonl</code> per ciascuna fascia di confidenza del modello Fast-DetectGPT.
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
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Chip
                        label={`Scaglione ${bucketName}`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: "11px",
                          backgroundColor:
                            bucketName.startsWith("0.8") || bucketName.startsWith("0.6")
                              ? "#ff7759"
                              : "#eeece7",
                          color:
                            bucketName.startsWith("0.8") || bucketName.startsWith("0.6")
                              ? "#ffffff"
                              : "#17171c",
                        }}
                      />
                      <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 600 }}>
                        {samples.length} post
                      </Typography>
                    </Box>

                    {samples.length === 0 ? (
                      <Typography variant="caption" sx={{ color: "#9e9ea7", fontStyle: "italic", my: "auto" }}>
                        Nessun post presente in questo scaglione.
                      </Typography>
                    ) : (
                      <>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, flexGrow: 1 }}>
                          {paginatedSamples.map(({ post, probability }) => {
                            const isHighProb = probability >= 0.5;
                            const probColor = isHighProb ? "#ff7759" : "#3b82f6";
                            const probBg = isHighProb ? "#fff1ef" : "#eff6ff";
                            return (
                              <Paper
                                key={post.id}
                                elevation={0}
                                sx={{
                                  p: 2,
                                  borderRadius: "12px",
                                  backgroundColor: "#fafafa",
                                  border: "1px solid #e5e7eb",
                                  transition: "all 0.15s ease",
                                  "&:hover": {
                                    backgroundColor: "#ffffff",
                                    borderColor: isHighProb ? "#ff7759" : "#3b82f6",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                  },
                                }}
                              >
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 700,
                                      color: "#17171c",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: "100px",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {post.acct}
                                  </Typography>
                                  <Chip
                                    label={`${(probability * 100).toFixed(1)}%`}
                                    size="small"
                                    sx={{
                                      height: "20px",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      backgroundColor: probBg,
                                      color: probColor,
                                    }}
                                  />
                                </Box>

                                <Typography
                                  variant="body2"
                                  sx={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    color: "#334155",
                                    fontSize: "12px",
                                    lineHeight: 1.4,
                                    mb: 1.5,
                                  }}
                                >
                                  {post.content}
                                </Typography>

                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "10px", fontFamily: "monospace" }}>
                                    #{post.id}
                                  </Typography>
                                  <Button
                                    component={Link}
                                    to={`/posts/${post.id}`}
                                    size="small"
                                    variant="contained"
                                    disableElevation
                                    sx={{
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      textTransform: "none",
                                      py: 0.3,
                                      px: 1.5,
                                      borderRadius: "16px",
                                      backgroundColor: "#1863dc",
                                      color: "#ffffff",
                                      "&:hover": { backgroundColor: "#114cb0" },
                                    }}
                                  >
                                    Vedi Dettagli &rarr;
                                  </Button>
                                </Box>
                              </Paper>
                            );
                          })}
                        </Box>

                        {/* Pagination controls for this tier column */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, pt: 1.5, borderTop: "1px solid #f1f5f9" }}>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={currentPage <= 1}
                            onClick={() => setBucketPage(bucketName, currentPage - 1)}
                            sx={{ minWidth: "32px", px: 1, py: 0.2, fontSize: "11px", borderRadius: "8px" }}
                          >
                            &larr; Indietro
                          </Button>
                          <Typography variant="caption" sx={{ color: "#64748b", fontSize: "11px", fontWeight: 600 }}>
                            {currentPage} / {totalPages}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={currentPage >= totalPages}
                            onClick={() => setBucketPage(bucketName, currentPage + 1)}
                            sx={{ minWidth: "32px", px: 1, py: 0.2, fontSize: "11px", borderRadius: "8px" }}
                          >
                            Avanti &rarr;
                          </Button>
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}



      <Grid container spacing={4}>
        {/* Filters & Sorting */}

        <Grid item xs={12} md={3}>

          <Paper sx={{ p: 3, borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff", mb: 3 }}>
            <Typography variant="caption" sx={{ color: "#75758a", mb: 1.5, display: "block" }}>
              SORT PROBABILITIES
            </Typography>
            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={handleSortChange}
              size="small"
              fullWidth
              sx={{
                "& .MuiToggleButton-root": {
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "none",
                  py: 0.8,
                  "&.Mui-selected": {
                    backgroundColor: "#ff7759",
                    color: "#ffffff",
                    "&:hover": { backgroundColor: "#e66043" },
                  },
                },
              }}
            >
              <ToggleButton value="top">
                <TopIcon sx={{ fontSize: 16, mr: 0.5 }} /> Top %
              </ToggleButton>
              <ToggleButton value="bottom">
                <BottomIcon sx={{ fontSize: 16, mr: 0.5 }} /> Bottom %
              </ToggleButton>
              <ToggleButton value="id">
                <IdIcon sx={{ fontSize: 16, mr: 0.5 }} /> Default
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
            <Typography variant="caption" sx={{ color: "#75758a", mb: 2, display: "block" }}>
              SCORE QUARTILES
            </Typography>
            {data && data.prob_buckets ? (
              <FormGroup>
                {data.prob_buckets.map((bucket) => (
                  <FormControlLabel
                    key={bucket}
                    control={
                      <Checkbox
                        checked={selectedBuckets.includes(bucket)}
                        onChange={() => handleBucketChange(bucket)}
                        sx={{
                          color: "#93939f",
                          "&.Mui-checked": { color: "#ff7759" },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#212121" }}>
                        Quartile {bucket}%
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>
            ) : (
              <Typography variant="body2" sx={{ color: "#75758a" }}>
                No filters available.
              </Typography>
            )}
          </Paper>
        </Grid>


        {/* AI Posts List */}
        <Grid item xs={12} md={9}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : error || !data || data.page_rows.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: "16px", border: "1px solid #e5e7eb" }}>
              <Typography variant="body1" sx={{ color: "#75758a" }}>No posts matched the AI score range filters.</Typography>
            </Paper>
          ) : (
            <Box>
              <Paper sx={{ borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden", mb: 4, backgroundColor: "#ffffff" }}>
                <List sx={{ p: 0 }}>
                  {data.page_rows.map(({ post, probability }, idx) => (
                    <div key={post.id}>
                      <ListItem
                        sx={{
                          p: 3,
                          alignItems: "flex-start",
                          transition: "background-color 0.15s ease",
                          "&:hover": { backgroundColor: "#f1f5ff" },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#17171c" }}>
                                  {post.acct}
                                </Typography>
                                <Chip label={post.domain} size="small" sx={{ borderRadius: "12px", backgroundColor: "#eeece7" }} />
                                {post.bot && (
                                  <Chip
                                    icon={<BotIcon style={{ fontSize: 14, color: "#ffffff" }} />}
                                    label="BOT"
                                    size="small"
                                    sx={{ borderRadius: "12px", backgroundColor: "#17171c", color: "#ffffff" }}
                                  />
                                )}
                              </Box>
                              <Chip
                                label={`AI Prob: ${(probability * 100).toFixed(0)}%`}
                                sx={{
                                  borderRadius: "30px",
                                  fontSize: "12px",
                                  backgroundColor: probability >= 0.5 ? "#ff7759" : "#eeece7",
                                  color: probability >= 0.5 ? "#ffffff" : "#17171c",
                                  fontWeight: 600,
                                }}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  whiteSpace: "pre-wrap",
                                  mb: 2,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  color: "#212121",
                                }}
                              >
                                {post.content}
                              </Typography>
                              <Link
                                to={`/posts/${post.id}`}
                                style={{
                                  color: "#1863dc",
                                  textDecoration: "underline",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                }}
                              >
                                View Detailed Inspection &rarr;
                              </Link>
                            </Box>
                          }
                        />
                      </ListItem>
                      {idx < data.page_rows.length - 1 && <Divider sx={{ borderColor: "#e5e7eb" }} />}
                    </div>
                  ))}
                </List>
              </Paper>

              {/* Pagination */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button
                  variant="outlined"
                  startIcon={<PrevIcon />}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  sx={{ borderRadius: "32px" }}
                >
                  Previous
                </Button>
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  Page {page}
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<NextIcon />}
                  disabled={!data.has_next}
                  onClick={() => setPage(page + 1)}
                  sx={{ borderRadius: "32px" }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Descriptive Statistics Modal */}
      <StatsModal
        open={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        stats={data?.stats}
      />
    </Box>
  );
}

