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
  Stack,
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

  const { post, ai_score, binoculars_score, desklib_score, fact_check } = data;

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
          {/* AI Scores Card */}
          <Paper
            sx={{
              p: 3.5,
              borderRadius: "22px",
              border: "1px solid #e5e7eb",
              mb: 4,
              backgroundColor: "#ffffff",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
              <AiIcon sx={{ color: "#ff7759" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#17171c" }}>
                Rilevamento Testo Sintetico IA (3 Detector)
              </Typography>
            </Box>

            <Stack spacing={2}>
              {/* FastDetectGPT */}
              <Box sx={{ p: 2, borderRadius: "14px", backgroundColor: "#fff0ec", border: "1px solid #ffad9b" }}>
                <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#ff7759", fontWeight: 700, display: "block", mb: 0.5 }}>
                  DETECTOR 1 • FASTDETECTGPT (GPT-NEO 2.7B)
                </Typography>
                {ai_score ? (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h5" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: ai_score.probability >= 0.5 ? "#ff7759" : "#17171c" }}>
                      {(ai_score.probability * 100).toFixed(1)}%
                    </Typography>
                    <Chip
                      size="small"
                      label={ai_score.probability >= 0.5 ? "IA SINTETICO" : "UMANO"}
                      sx={{ backgroundColor: ai_score.probability >= 0.5 ? "#ff7759" : "#17171c", color: "#ffffff", fontWeight: 700, fontSize: "10px" }}
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: "#75758a" }}>Non valutato da FastDetectGPT</Typography>
                )}
              </Box>

              {/* Binoculars */}
              <Box sx={{ p: 2, borderRadius: "14px", backgroundColor: "#edfce9", border: "1px solid #a8eb99" }}>
                <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#003c33", fontWeight: 700, display: "block", mb: 0.5 }}>
                  DETECTOR 2 • BINOCULARS (QWEN2.5 0.5B ICML 2024)
                </Typography>
                {binoculars_score ? (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h5" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: binoculars_score.probability >= 0.5 ? "#003c33" : "#17171c" }}>
                      {(binoculars_score.probability * 100).toFixed(1)}%
                    </Typography>
                    <Chip
                      size="small"
                      label={binoculars_score.probability >= 0.5 ? "IA SINTETICO" : "UMANO"}
                      sx={{ backgroundColor: binoculars_score.probability >= 0.5 ? "#003c33" : "#17171c", color: "#ffffff", fontWeight: 700, fontSize: "10px" }}
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: "#75758a" }}>Non valutato da Binoculars</Typography>
                )}
              </Box>

              {/* Desklib */}
              <Box sx={{ p: 2, borderRadius: "14px", backgroundColor: "#f1f5ff", border: "1px solid #c6d7ff" }}>
                <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#1863dc", fontWeight: 700, display: "block", mb: 0.5 }}>
                  DETECTOR 3 • DESKLIB SUPERVISED CLASSIFIER (v1.01)
                </Typography>
                {desklib_score ? (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h5" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: desklib_score.probability >= 0.5 ? "#1863dc" : "#17171c" }}>
                      {(desklib_score.probability * 100).toFixed(1)}%
                    </Typography>
                    <Chip
                      size="small"
                      label={desklib_score.probability >= 0.5 ? "IA SINTETICO" : "UMANO"}
                      sx={{ backgroundColor: desklib_score.probability >= 0.5 ? "#1863dc" : "#17171c", color: "#ffffff", fontWeight: 700, fontSize: "10px" }}
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: "#75758a" }}>Non valutato da Desklib</Typography>
                )}
              </Box>
            </Stack>
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
