import { useState } from "react";
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
import { Link, useParams } from "react-router-dom";
import { useAiDetectionQuery } from "../api/queries.ts";
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
import { tokens } from "../theme.ts";
import { EmptyState, LoadingState } from "../components/States.tsx";
import { formatNumber } from "../utils/format.ts";
import { useUrlList, useUrlNumber, useUrlString } from "../hooks/useUrlState.ts";

interface AiDetectionProps {
  detectorKey?: string;
}

const DETECTOR_CONFIGS: Record<string, { title: string; subtitle: string; label: string }> = {
  fastdetect: {
    title: "Rilevamento IA (FastDetectGPT)",
    subtitle: "Analisi della probabilità di testo generato da IA basata su FastDetectGPT (GPT-Neo 2.7B) tramite perturbazioni della curvatura probabilistica.",
    label: "FastDetectGPT (GPT-Neo 2.7B)",
  },
  binoculars: {
    title: "Rilevamento IA (Binoculars)",
    subtitle: "Analisi zero-shot della probabilità di testo generato da IA mediante confronto del rapporto di perplessità tra Qwen2.5-0.5B (observer) e Qwen2.5-0.5B-Instruct (performer).",
    label: "Binoculars (Qwen2.5 0.5B)",
  },
  desklib: {
    title: "Rilevamento IA (Desklib Detector)",
    subtitle: "Rilevamento basato su Desklib AI Detector (Local Model) per identificazione di testo sintetico.",
    label: "Desklib AI Detector",
  },
  ada: {
    title: "Rilevamento IA (AdaDetectGPT)",
    subtitle: "Analisi di rilevamento IA mediante AdaDetectGPT Local Model.",
    label: "AdaDetectGPT Local",
  },
};

export default function AiDetection({ detectorKey }: AiDetectionProps = {}) {
  const params = useParams<{ detector?: string }>();
  const activeDetectorKey = detectorKey || params.detector || "fastdetect";
  const config = DETECTOR_CONFIGS[activeDetectorKey] || DETECTOR_CONFIGS.fastdetect;

  const [selectedBuckets, setSelectedBuckets] = useUrlList("bucket");
  const [sortBy, setSortBy] = useUrlString("sort", "id");
  const [page, setPage] = useUrlNumber("page", 1);
  const [bucketPages, setBucketPages] = useState<Record<string, number>>({});
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  const ITEMS_PER_BUCKET_PAGE = 2;

  const { data, isLoading: loading, isError } = useAiDetectionQuery(
    selectedBuckets, page, sortBy, activeDetectorKey,
  );
  const error = isError
    ? `Impossibile caricare le analisi di rilevamento IA (${config.label}).`
    : null;

  const handleBucketChange = (bucket: string) => {
    const nextBuckets = selectedBuckets.includes(bucket)
      ? selectedBuckets.filter((b) => b !== bucket)
      : [...selectedBuckets, bucket];
    setSelectedBuckets(nextBuckets);
    setPage(1);
  };

  const handleSortChange = (_: React.SyntheticEvent, newSort: string | null) => {
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
      <LoadingState />
    );
  }

  const maxHistVal = data ? Math.max(...Object.values(data.histogram), 1) : 1;

  return (
    <Box>
      <Box sx={{ mb: 6 }}>

        <Typography
          variant="h2"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 400,
            fontSize: { xs: "32px", md: "48px" },
            color: tokens.color.nearBlack,
            letterSpacing: "-0.48px",
            lineHeight: 1.2,
            mb: 1,
          }}
        >
          {config.title}
        </Typography>
        <Typography variant="body1" sx={{ color: tokens.color.textMuted }}>
          {config.subtitle}
        </Typography>

      </Box>

      {data && (
        <Grid container spacing={4} sx={{ mb: 6 }}>
          {/* Summary Card */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 4,
                borderRadius: tokens.radius.xl,
                backgroundColor: tokens.color.softStone,
                height: "100%",
              }}
            >
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, mb: 2, display: "block" }}>
                PROCESSED STATUSES
              </Typography>
              <Typography
                variant="h1"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 400,
                  fontSize: "56px",
                  color: tokens.color.nearBlack,
                  lineHeight: 1.0,
                  mb: 2,
                }}
              >
                {formatNumber(data.done)}
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
                Out of <strong>{formatNumber(data.eligible)}</strong> eligible English statuses.
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, display: "block", mt: 2, mb: 2 }}>
                Threshold for AI flag: &ge; {data.ai_threshold * 100}%
              </Typography>

              <Button
                variant="contained"
                startIcon={<AnalyticsIcon />}
                onClick={() => setStatsModalOpen(true)}
                disableElevation
                sx={{
                  mt: 1,
                  width: "100%",
                  borderRadius: tokens.radius.pill,
                  py: 1.2,
                  px: 2.5,
                  fontWeight: 500,
                  fontSize: "14px",
                  textTransform: "none",
                  backgroundColor: tokens.color.nearBlack,
                  color: tokens.color.canvas,
                  transition: "background-color 0.15s ease",
                  "&:hover": {
                    backgroundColor: "#2e2e38",
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
                borderRadius: tokens.radius.xl,
                border: tokens.border.subtle,
                backgroundColor: tokens.color.canvas,
                height: "100%",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: tokens.color.nearBlack, mb: 3 }}>
                Probability Range Distribution
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Object.entries(data.histogram).map(([bucket, count]) => {
                  const percent = (count / maxHistVal) * 100;
                  return (
                    <Box key={bucket} sx={{ display: "flex", alignItems: "center" }}>
                      <Typography variant="caption" sx={{ minWidth: 70, color: tokens.color.textMuted }}>
                        {bucket}
                      </Typography>
                      <Box sx={{ flexGrow: 1, mx: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: tokens.color.softStone,
                            "& .MuiLinearProgress-bar": { backgroundColor: tokens.color.coral }, // Coral fill
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ minWidth: 60, textAlign: "right", fontWeight: 600, color: tokens.color.nearBlack }}>
                        {formatNumber(count)}
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
            borderRadius: tokens.radius.xl,
            border: tokens.border.subtle,
            backgroundColor: "#fafaf8",
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Chip
              label="TIER EXPLORER"
              size="small"
              sx={{
                fontFamily: tokens.font.mono,
                fontSize: "10px",
                color: tokens.color.coral,
                backgroundColor: tokens.color.surfaceCoral,
                fontWeight: 700,
                mb: 1,
              }}
            />
            <Typography variant="h5" sx={{ fontWeight: 600, color: tokens.color.nearBlack }}>
              Esplorazione Post per Scaglione di Probabilità AI
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5 }}>
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
                      borderRadius: tokens.radius.lg,
                      border: "1px solid #e2e4e8",
                      backgroundColor: tokens.color.canvas,
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
                              ? tokens.color.coral
                              : tokens.color.softStone,
                          color:
                            bucketName.startsWith("0.8") || bucketName.startsWith("0.6")
                              ? tokens.color.canvas
                              : tokens.color.nearBlack,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontWeight: 600 }}>
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
                            const probColor = isHighProb ? tokens.color.coral : "#3b82f6";
                            const probBg = isHighProb ? "#fff1ef" : "#eff6ff";
                            return (
                              <Paper
                                key={post.id}
                                elevation={0}
                                sx={{
                                  p: 2,
                                  borderRadius: tokens.radius.md,
                                  backgroundColor: tokens.color.tableHead,
                                  border: tokens.border.subtle,
                                  transition: "all 0.15s ease",
                                  "&:hover": {
                                    backgroundColor: tokens.color.canvas,
                                    borderColor: isHighProb ? tokens.color.coral : "#3b82f6",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                  },
                                }}
                              >
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 600,
                                      color: tokens.color.nearBlack,
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
                                    WebkitLineClamp: 4,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    color: tokens.color.textPrimary,
                                    fontSize: "13px",
                                    lineHeight: 1.5,
                                    mb: 1.5,
                                  }}
                                >
                                  {post.content}
                                </Typography>

                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontSize: "10px", fontFamily: "monospace" }}>
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
                                      borderRadius: tokens.radius.lg,
                                      backgroundColor: tokens.color.actionBlue,
                                      color: tokens.color.canvas,
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
                            sx={{ minWidth: "32px", px: 1, py: 0.2, fontSize: "11px", borderRadius: tokens.radius.sm }}
                          >
                            &larr; Indietro
                          </Button>
                          <Typography variant="caption" sx={{ color: tokens.color.darkSlateDeep, fontSize: "11px", fontWeight: 600 }}>
                            {currentPage} / {totalPages}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={currentPage >= totalPages}
                            onClick={() => setBucketPage(bucketName, currentPage + 1)}
                            sx={{ minWidth: "32px", px: 1, py: 0.2, fontSize: "11px", borderRadius: tokens.radius.sm }}
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

          <Paper sx={{ p: 3, borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas, mb: 3 }}>
            <Typography variant="caption" sx={{ color: tokens.color.textMuted, mb: 1.5, display: "block" }}>
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
                  borderRadius: tokens.radius.sm,
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "none",
                  py: 0.8,
                  "&.Mui-selected": {
                    backgroundColor: tokens.color.coral,
                    color: tokens.color.canvas,
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

          <Paper sx={{ p: 3, borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas }}>
            <Typography variant="caption" sx={{ color: tokens.color.textMuted, mb: 2, display: "block" }}>
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
                          color: tokens.color.textFaint,
                          "&.Mui-checked": { color: tokens.color.coral },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: "14px", color: tokens.color.textPrimary }}>
                        Quartile {bucket}%
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>
            ) : (
              <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
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
            <EmptyState message="Nessun post corrisponde agli intervalli di probabilità selezionati." />
          ) : (
            <Box>
              <Paper sx={{ borderRadius: tokens.radius.lg, border: tokens.border.subtle, overflow: "hidden", mb: 4, backgroundColor: tokens.color.canvas }}>
                <List sx={{ p: 0 }}>
                  {data.page_rows.map(({ post, probability }, idx) => (
                    <div key={post.id}>
                      <ListItem
                        sx={{
                          p: 3,
                          alignItems: "flex-start",
                          transition: "background-color 0.15s ease",
                          "&:hover": { backgroundColor: tokens.color.surfaceBlue },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: tokens.color.nearBlack }}>
                                  {post.acct}
                                </Typography>
                                <Chip label={post.domain} size="small" sx={{ borderRadius: tokens.radius.md, backgroundColor: tokens.color.softStone }} />
                                {post.bot && (
                                  <Chip
                                    icon={<BotIcon style={{ fontSize: 14, color: tokens.color.canvas }} />}
                                    label="BOT"
                                    size="small"
                                    sx={{ borderRadius: tokens.radius.md, backgroundColor: tokens.color.nearBlack, color: tokens.color.canvas }}
                                  />
                                )}
                              </Box>
                              <Chip
                                label={`AI Prob: ${(probability * 100).toFixed(0)}%`}
                                sx={{
                                  borderRadius: tokens.radius.chip,
                                  fontSize: "12px",
                                  backgroundColor: probability >= 0.5 ? tokens.color.coral : tokens.color.softStone,
                                  color: probability >= 0.5 ? tokens.color.canvas : tokens.color.nearBlack,
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
                                  color: tokens.color.textPrimary,
                                }}
                              >
                                {post.content}
                              </Typography>
                              <Link
                                to={`/posts/${post.id}`}
                                style={{
                                  color: tokens.color.actionBlue,
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
                      {idx < data.page_rows.length - 1 && <Divider sx={{ borderColor: tokens.color.border }} />}
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
                  sx={{ borderRadius: tokens.radius.pill }}
                >
                  Previous
                </Button>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                  Page {page}
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<NextIcon />}
                  disabled={!data.has_next}
                  onClick={() => setPage(page + 1)}
                  sx={{ borderRadius: tokens.radius.pill }}
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
        detectorLabel={config.label}
      />
    </Box>
  );
}

