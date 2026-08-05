import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Chip,
  Grid,
  Paper,
  Divider,
  LinearProgress,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  SmartToy as BotIcon,
  Psychology as AiIcon,
  FactCheck as FactIcon,
} from "@mui/icons-material";
import { api, PostDetailResponse } from "../api/client.ts";

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.postDetail(Number(id))
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossibile caricare il dettaglio del post.");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !data || !data.post) {
    return (
      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          {error || "Post non trovato."}
        </Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2, borderRadius: "32px" }}>
          Torna indietro
        </Button>
      </Box>
    );
  }

  const { post, ai_score, fact_check } = data;

  const getVerdictColor = (verdict: string) => {
    const v = verdict.toLowerCase();
    if (v.includes("falso")) return "#b30000"; // Error Red
    if (v.includes("vero")) return "#003c33"; // Deep Enterprise Green
    if (v.includes("misto") || v.includes("incerto")) return "#ff7759"; // Coral
    return "#75758a";
  };

  return (
    <Box>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate(-1)}
        variant="outlined"
        sx={{
          mb: 4,
          borderRadius: "32px",
        }}
      >
        Back to Statuses
      </Button>

      <Box sx={{ mb: 4 }}>
        <Chip
          label="STATUS INSPECTOR & AUDIT"
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
          variant="h4"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 400,
            fontSize: "36px",
            color: "#17171c",
          }}
        >
          Status Audit Record #{post.id}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Post content */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: "22px", border: "1px solid #e5e7eb", p: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#17171c" }}>
                    {post.acct}
                  </Typography>
                  <Chip label={post.domain} size="small" sx={{ borderRadius: "12px", backgroundColor: "#eeece7" }} />
                  {post.language && <Chip label={post.language.toUpperCase()} size="small" sx={{ borderRadius: "12px", backgroundColor: "#ff7759", color: "#ffffff" }} />}
                  {post.bot && (
                    <Chip
                      icon={<BotIcon style={{ fontSize: 14, color: "#ffffff" }} />}
                      label="BOT"
                      size="small"
                      sx={{ borderRadius: "12px", backgroundColor: "#17171c", color: "#ffffff" }}
                    />
                  )}
                </Box>
              </Box>

              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", fontSize: "18px", lineHeight: 1.6, mb: 4, color: "#212121" }}>
                {post.content}
              </Typography>
              
              <Divider sx={{ my: 3, borderColor: "#e5e7eb" }} />
              
              <Typography variant="caption" sx={{ color: "#93939f" }}>
                Created At (ISO): {post.created_at || "N/A"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* AI & Fact Check analysis */}
        <Grid item xs={12} md={5}>
          {/* AI Score */}
          <Paper
            sx={{
              p: 4,
              borderRadius: "22px",
              border: "1px solid #e5e7eb",
              mb: 4,
              backgroundColor: "#edfce9", // Pale Green Wash
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <AiIcon sx={{ color: "#003c33" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#003c33" }}>
                Fast-DetectGPT Probability
              </Typography>
            </Box>
            
            {ai_score ? (
              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: "#75758a" }}>
                  Synthetic Generation Estimate:
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={ai_score.probability * 100}
                    sx={{
                      flexGrow: 1,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "rgba(0,0,0,0.05)",
                      "& .MuiLinearProgress-bar": { backgroundColor: "#003c33" },
                    }}
                  />
                  <Typography variant="h5" sx={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#003c33" }}>
                    {(ai_score.probability * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  Model: {ai_score.model || "N/A"}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {ai_score.probability >= 0.5 ? (
                    <Chip label="PROBABLE AI SYNTHETIC" sx={{ backgroundColor: "#ff7759", color: "#ffffff", fontWeight: 600 }} />
                  ) : (
                    <Chip label="PROBABLE HUMAN AUTHOR" sx={{ backgroundColor: "#003c33", color: "#ffffff" }} />
                  )}
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: "#75758a" }}>
                No AI detection scores available for this status record.
              </Typography>
            )}
          </Paper>

          {/* Fact-Checking */}
          <Paper
            sx={{
              p: 4,
              borderRadius: "22px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#f1f5ff", // Pale Blue Wash
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <FactIcon sx={{ color: "#1863dc" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#17171c" }}>
                LLM Fact Verification
              </Typography>
            </Box>

            {fact_check ? (
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: "#75758a", display: "block", mb: 0.5 }}>
                    VERDICT:
                  </Typography>
                  <Chip
                    label={fact_check.verdict.toUpperCase()}
                    sx={{
                      backgroundColor: getVerdictColor(fact_check.verdict),
                      color: "#ffffff",
                      fontWeight: 600,
                      px: 1,
                    }}
                  />
                </Box>

                <Typography variant="body1" sx={{ mb: 2, color: "#212121", fontWeight: 500 }}>
                  &ldquo;{fact_check.reasoning}&rdquo;
                </Typography>
                
                {fact_check.evidence && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="caption" sx={{ color: "#75758a", mb: 1, display: "block" }}>
                      EVIDENCE LOGS:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-wrap",
                        maxHeight: 160,
                        overflowY: "auto",
                        border: "1px solid #e5e7eb",
                        p: 2,
                        borderRadius: "12px",
                        backgroundColor: "#ffffff",
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "12px",
                      }}
                    >
                      {typeof fact_check.evidence === "string" 
                        ? fact_check.evidence 
                        : JSON.stringify(fact_check.evidence, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: "#75758a" }}>
                No fact check audit records available.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
