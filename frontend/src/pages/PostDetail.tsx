import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
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
import { usePostDetailQuery } from "../api/queries.ts";
import { tokens } from "../theme.ts";
import { LoadingState } from "../components/States.tsx";

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading: loading, isError } = usePostDetailQuery(Number(id));
  const error = isError ? "Impossibile caricare il dettaglio del post." : null;

  if (loading) {
    return (
      <LoadingState />
    );
  }

  if (error || !data || !data.post) {
    return (
      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          {error || "Post non trovato."}
        </Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2, borderRadius: tokens.radius.pill }}>
          Torna indietro
        </Button>
      </Box>
    );
  }

  const { post, ai_score, binoculars_score, desklib_score, ada_score, fact_check } = data;

  const getVerdictColor = (verdict: string) => {
    const v = verdict.toLowerCase();
    if (v.includes("falso")) return tokens.color.danger; // Error Red
    if (v.includes("vero")) return tokens.color.deepGreen; // Deep Enterprise Green
    if (v.includes("misto") || v.includes("incerto")) return tokens.color.coral; // Coral
    return tokens.color.textMuted;
  };

  return (
    <Box>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate(-1)}
        variant="outlined"
        sx={{
          mb: 4,
          borderRadius: tokens.radius.pill,
        }}
      >
        Back to Statuses
      </Button>

      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 400,
            fontSize: "36px",
            color: tokens.color.nearBlack,
          }}
        >
          Status Audit Record #{post.id}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Post content */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: tokens.radius.xl, border: tokens.border.subtle, p: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: tokens.color.nearBlack }}>
                    {post.acct}
                  </Typography>
                  <Chip label={post.domain} size="small" sx={{ borderRadius: tokens.radius.md, backgroundColor: tokens.color.softStone }} />
                  {post.language && <Chip label={post.language.toUpperCase()} size="small" sx={{ borderRadius: tokens.radius.md, backgroundColor: tokens.color.coral, color: tokens.color.canvas }} />}
                  {post.bot && (
                    <Chip
                      icon={<BotIcon style={{ fontSize: 14, color: tokens.color.canvas }} />}
                      label="BOT"
                      size="small"
                      sx={{ borderRadius: tokens.radius.md, backgroundColor: tokens.color.nearBlack, color: tokens.color.canvas }}
                    />
                  )}
                </Box>
              </Box>

              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", fontSize: "18px", lineHeight: 1.6, mb: 4, color: tokens.color.textPrimary }}>
                {post.content}
              </Typography>
              
              <Divider sx={{ my: 3, borderColor: tokens.color.border }} />
              
              <Typography variant="caption" sx={{ color: tokens.color.textFaint }}>
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
              borderRadius: tokens.radius.xl,
              border: tokens.border.subtle,
              mb: 4,
              backgroundColor: tokens.color.canvas,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
              <AiIcon sx={{ color: tokens.color.coral }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: tokens.color.nearBlack }}>
                Rilevamento Testo Sintetico IA (4 Detector)
              </Typography>
            </Box>

            <Stack spacing={2}>
              {/* FastDetectGPT */}
              <Box sx={{ p: 2, borderRadius: "14px", backgroundColor: tokens.color.surfaceCoral, border: `1px solid ${tokens.color.coralLight}` }}>
                <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.coral, fontWeight: 700, display: "block", mb: 0.5 }}>
                  DETECTOR 1 • FASTDETECTGPT (GPT-NEO 2.7B)
                </Typography>
                {ai_score ? (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h5" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: ai_score.probability >= 0.5 ? tokens.color.coral : tokens.color.nearBlack }}>
                      {(ai_score.probability * 100).toFixed(1)}%
                    </Typography>
                    <Chip
                      size="small"
                      label={ai_score.probability >= 0.5 ? "IA SINTETICO" : "UMANO"}
                      sx={{ backgroundColor: ai_score.probability >= 0.5 ? tokens.color.coral : tokens.color.nearBlack, color: tokens.color.canvas, fontWeight: 700, fontSize: "10px" }}
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>Non valutato da FastDetectGPT</Typography>
                )}
              </Box>

              {/* Binoculars */}
              <Box sx={{ p: 2, borderRadius: "14px", backgroundColor: "#edfce9", border: `1px solid ${tokens.color.chipBorderHumanGreen}` }}>
                <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.deepGreen, fontWeight: 700, display: "block", mb: 0.5 }}>
                  DETECTOR 2 • BINOCULARS (QWEN2.5 0.5B ICML 2024)
                </Typography>
                {binoculars_score ? (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h5" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: binoculars_score.probability >= 0.5 ? tokens.color.deepGreen : tokens.color.nearBlack }}>
                      {(binoculars_score.probability * 100).toFixed(1)}%
                    </Typography>
                    <Chip
                      size="small"
                      label={binoculars_score.probability >= 0.5 ? "IA SINTETICO" : "UMANO"}
                      sx={{ backgroundColor: binoculars_score.probability >= 0.5 ? tokens.color.deepGreen : tokens.color.nearBlack, color: tokens.color.canvas, fontWeight: 700, fontSize: "10px" }}
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>Non valutato da Binoculars</Typography>
                )}
              </Box>

              {/* Desklib */}
              <Box sx={{ p: 2, borderRadius: "14px", backgroundColor: tokens.color.surfaceBlue, border: `1px solid ${tokens.color.chipBorderHuman}` }}>
                <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.actionBlue, fontWeight: 700, display: "block", mb: 0.5 }}>
                  DETECTOR 3 • DESKLIB SUPERVISED CLASSIFIER (v1.01)
                </Typography>
                {desklib_score ? (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h5" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: desklib_score.probability >= 0.5 ? tokens.color.actionBlue : tokens.color.nearBlack }}>
                      {(desklib_score.probability * 100).toFixed(1)}%
                    </Typography>
                    <Chip
                      size="small"
                      label={desklib_score.probability >= 0.5 ? "IA SINTETICO" : "UMANO"}
                      sx={{ backgroundColor: desklib_score.probability >= 0.5 ? tokens.color.actionBlue : tokens.color.nearBlack, color: tokens.color.canvas, fontWeight: 700, fontSize: "10px" }}
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>Non valutato da Desklib</Typography>
                )}
              </Box>

              {/* AdaDetectGPT */}
              <Box sx={{ p: 2, borderRadius: "14px", backgroundColor: tokens.color.surfacePurple, border: tokens.border.purple }}>
                <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.purple, fontWeight: 700, display: "block", mb: 0.5 }}>
                  DETECTOR 4 • ADADETECTGPT (GPT-NEO 2.7B)
                </Typography>
                {ada_score ? (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h5" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: ada_score.probability >= 0.5 ? tokens.color.purple : tokens.color.nearBlack }}>
                      {(ada_score.probability * 100).toFixed(1)}%
                    </Typography>
                    <Chip
                      size="small"
                      label={ada_score.probability >= 0.5 ? "IA SINTETICO" : "UMANO"}
                      sx={{ backgroundColor: ada_score.probability >= 0.5 ? tokens.color.purple : tokens.color.nearBlack, color: tokens.color.canvas, fontWeight: 700, fontSize: "10px" }}
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>Non valutato da AdaDetectGPT</Typography>
                )}
              </Box>
            </Stack>
          </Paper>

          {/* Fact-Checking */}
          <Paper
            sx={{
              p: 4,
              borderRadius: tokens.radius.xl,
              border: tokens.border.subtle,
              backgroundColor: tokens.color.surfaceBlue, // Pale Blue Wash
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <FactIcon sx={{ color: tokens.color.actionBlue }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: tokens.color.nearBlack }}>
                LLM Fact Verification
              </Typography>
            </Box>

            {fact_check ? (
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: tokens.color.textMuted, display: "block", mb: 0.5 }}>
                    VERDICT:
                  </Typography>
                  <Chip
                    label={fact_check.verdict.toUpperCase()}
                    sx={{
                      backgroundColor: getVerdictColor(fact_check.verdict),
                      color: tokens.color.canvas,
                      fontWeight: 600,
                      px: 1,
                    }}
                  />
                </Box>

                <Typography variant="body1" sx={{ mb: 2, color: tokens.color.textPrimary, fontWeight: 500 }}>
                  &ldquo;{fact_check.reasoning}&rdquo;
                </Typography>
                
                {fact_check.evidence && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="caption" sx={{ color: tokens.color.textMuted, mb: 1, display: "block" }}>
                      EVIDENCE LOGS:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-wrap",
                        maxHeight: 160,
                        overflowY: "auto",
                        border: tokens.border.subtle,
                        p: 2,
                        borderRadius: tokens.radius.md,
                        backgroundColor: tokens.color.canvas,
                        fontFamily: tokens.font.mono,
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
              <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
                No fact check audit records available.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
