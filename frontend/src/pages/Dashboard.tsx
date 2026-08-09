import { Grid, Typography, Box, CircularProgress, LinearProgress, Button } from "@mui/material";
import { Link } from "react-router-dom";
import { useDashboardQuery } from "../api/queries.ts";
import GraphHero from "../components/GraphHero.tsx";
import DescriptiveStatsBlock from "../components/DescriptiveStatsBlock.tsx";
import {
  Article as PostsIcon,
  SyncAlt as FollowsIcon,
  Psychology as AiIcon,
  FactCheck as FactIcon,
  ArrowForward as ArrowIcon,
} from "@mui/icons-material";

export default function Dashboard() {
  const { data: stats, isLoading: loading, isError } = useDashboardQuery();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (isError || !stats) {
    return (
      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Typography color="error" variant="h6">Impossibile caricare le statistiche del server.</Typography>
      </Box>
    );
  }

  const aiPercent = stats.ai_eligible > 0 ? (stats.ai_done / stats.ai_eligible) * 100 : 0;
  const factPercent = stats.fact_check_eligible > 0 ? (stats.fact_check_done / stats.fact_check_eligible) * 100 : 0;

  return (
    <Box>
      {/* Dynamic Graph Hero Section (Incremental Render) */}
      <GraphHero />

      {/* Block Statistiche Descrittive Conforme a DESIGN.md */}
      <DescriptiveStatsBlock />

      {/* Main Grid Metrics */}
      <Grid container spacing={4} sx={{ mb: 6 }}>


        {/* Post Totali */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 4,
              borderRadius: "22px",
              backgroundColor: "#eeece7", // Soft Stone Surface
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justify: "space-between",
            }}
          >
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="caption" sx={{ color: "#75758a", textTransform: "uppercase" }}>
                  INDEXED STATUSES
                </Typography>
                <PostsIcon sx={{ color: "#17171c" }} />
              </Box>
              <Typography
                variant="h1"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 400,
                  fontSize: "64px",
                  color: "#17171c",
                  lineHeight: 1.0,
                  mb: 1,
                }}
              >
                {stats.posts_total.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: "#75758a" }}>
                Total post records collected from monitored instance nodes.
              </Typography>
            </Box>

            <Button
              component={Link}
              to="/posts"
              variant="contained"
              endIcon={<ArrowIcon />}
              sx={{ alignSelf: "flex-start", borderRadius: "32px", px: 3 }}
            >
              Explore Corpus
            </Button>
          </Box>
        </Grid>

        {/* Follow Network */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 4,
              borderRadius: "22px",
              backgroundColor: "#eeece7", // Soft Stone Surface
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justify: "space-between",
            }}
          >
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="caption" sx={{ color: "#75758a", textTransform: "uppercase" }}>
                  GRAPH EDGES
                </Typography>
                <FollowsIcon sx={{ color: "#17171c" }} />
              </Box>
              <Typography
                variant="h1"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 400,
                  fontSize: "64px",
                  color: "#17171c",
                  lineHeight: 1.0,
                  mb: 1,
                }}
              >
                {stats.follows_total.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: "#75758a" }}>
                Static social follow edges discovered via relationship crawler.
              </Typography>
            </Box>

            <Button
              component={Link}
              to="/accounts"
              variant="contained"
              endIcon={<ArrowIcon />}
              sx={{ alignSelf: "flex-start", borderRadius: "32px", px: 3 }}
            >
              Account Metrics
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Cohere Deep Green Section for AI & Fact Check Pipelines */}
      <Box
        sx={{
          p: { xs: 4, md: 6 },
          borderRadius: "22px",
          backgroundColor: "#003c33", // Deep Enterprise Green Band
          color: "#ffffff",
          mb: 6,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#ffad9b", fontFamily: "ui-monospace, monospace", fontSize: "11px", display: "block", mb: 2 }}
        >
          AI SYNTHETIC & TRUTH ANALYSIS PIPELINES
        </Typography>

        <Grid container spacing={4}>
          {/* AI Detection Multi-Model Card */}
          <Grid item xs={12} md={6}>
            <Box sx={{ borderTop: "1px solid rgba(255, 255, 255, 0.15)", pt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <AiIcon sx={{ color: "#ff7759" }} />
                <Typography variant="h5" sx={{ color: "#ffffff", fontWeight: 500 }}>
                  Rilevamento Testo Sintetico (3 Modelli)
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "#93939f", mb: 2 }}>
                Analisi comparativa del testo tramite <strong>FastDetectGPT</strong>, <strong>Binoculars (ICML 2024)</strong> e <strong>Desklib AI Detector</strong>.
              </Typography>

              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="caption" sx={{ color: "#ffffff" }}>
                    Completamento FastDetectGPT
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#ff7759", fontWeight: 600 }}>
                    {aiPercent.toFixed(1)}% ({stats.ai_done.toLocaleString()} / {stats.ai_eligible.toLocaleString()})
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={aiPercent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    "& .MuiLinearProgress-bar": { backgroundColor: "#ff7759" },
                  }}
                />
              </Box>

              {/* Links to all 3 models + comparison */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, pt: 1 }}>
                <Button
                  component={Link}
                  to="/ai-detection"
                  size="small"
                  sx={{ color: "#ffffff", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "16px", textTransform: "none", fontSize: "12px", "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" } }}
                >
                  FastDetectGPT
                </Button>
                <Button
                  component={Link}
                  to="/ai-detection-binoculars"
                  size="small"
                  sx={{ color: "#ffffff", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "16px", textTransform: "none", fontSize: "12px", "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" } }}
                >
                  Binoculars
                </Button>
                <Button
                  component={Link}
                  to="/ai-detection-desklib"
                  size="small"
                  sx={{ color: "#ffffff", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "16px", textTransform: "none", fontSize: "12px", "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" } }}
                >
                  Desklib
                </Button>
                <Button
                  component={Link}
                  to="/detector-comparison"
                  size="small"
                  variant="outlined"
                  sx={{ color: "#ff7759", borderColor: "#ff7759", borderRadius: "16px", textTransform: "none", fontSize: "12px", fontWeight: 600, "&:hover": { backgroundColor: "rgba(255,119,89,0.1)", borderColor: "#ff7759" } }}
                >
                  Confronto &rarr;
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Fact Checking Card */}
          <Grid item xs={12} md={6}>
            <Box sx={{ borderTop: "1px solid rgba(255, 255, 255, 0.15)", pt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <FactIcon sx={{ color: "#1863dc" }} />
                <Typography variant="h5" sx={{ color: "#ffffff", fontWeight: 500 }}>
                  LLM Fact Verification
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "#93939f", mb: 3 }}>
                Verified <strong>{stats.fact_check_done.toLocaleString()}</strong> of <strong>{stats.fact_check_eligible.toLocaleString()}</strong> checkworthy claim statuses.
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="caption" sx={{ color: "#ffffff" }}>
                    Completion Rate
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#1863dc", fontWeight: 600 }}>
                    {factPercent.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={factPercent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    "& .MuiLinearProgress-bar": { backgroundColor: "#1863dc" },
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "#93939f" }}>
                  Verification Source: DuckDuckGo + Wikipedia
                </Typography>
                <Box
                  component={Link}
                  to="/fact-check"
                  sx={{ color: "#1863dc", textDecoration: "underline", fontSize: "14px", fontWeight: 500 }}
                >
                  View Verdicts &rarr;
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
