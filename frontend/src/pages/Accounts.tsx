import { useEffect, useState } from "react";
import { Typography, Box, Grid, Skeleton, Paper, LinearProgress, Chip, Tooltip, Stack } from "@mui/material";
import { api, AccountsStats } from "../api/client.ts";
import { SmartToy as BotIcon, People as HumanIcon, Psychology as AiIcon, HelpOutline as HelpIcon } from "@mui/icons-material";

export default function Accounts() {
  const [stats, setStats] = useState<AccountsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.accounts()
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossibile caricare le statistiche sugli account.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width={220} height={30} sx={{ mb: 2, borderRadius: "12px" }} />
        <Skeleton variant="rectangular" width="60%" height={50} sx={{ mb: 4, borderRadius: "12px" }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: "16px", backgroundColor: "#eeece7" }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: "16px", backgroundColor: "#eeece7" }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: "16px", backgroundColor: "#eeece7" }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (error || !stats) {
    return (
      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          {error || "Nessun dato disponibile."}
        </Typography>
      </Box>
    );
  }

  const totalAccounts = stats.bot_total + stats.nonbot_total;
  const botPercent = totalAccounts > 0 ? (stats.bot_total / totalAccounts) * 100 : 0;
  const aiBotPercent = stats.ai_producers_total > 0 ? (stats.ai_and_bot / stats.ai_producers_total) * 100 : 0;

  return (
    <Box>
      <Box sx={{ mb: 6 }}>
        <Chip
          label="Account Stats"
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
          Fediverse Account Taxonomy
        </Typography>
        <Typography variant="body1" sx={{ color: "#75758a" }}>
          Cross-referenced statistics comparing bot accounts vs human creators of synthetic AI content.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Global Bot Distribution */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 4,
              borderRadius: "22px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              height: "100%",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#17171c" }}>
                Global Bot Classification
              </Typography>
              <Tooltip title="La classificazione distingue tra account automatizzati (Bot) e utenti umani basandosi su euristiche di attività e metadati del profilo." arrow>
                <HelpIcon sx={{ fontSize: 18, color: "#93939f", cursor: "pointer" }} />
              </Tooltip>
            </Stack>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={6}>
                <Paper sx={{ p: 3, textAlign: "center", borderRadius: "16px", backgroundColor: "#eeece7" }}>
                  <BotIcon sx={{ fontSize: 32, mb: 1, color: "#17171c" }} />
                  <Typography variant="h4" sx={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 400, color: "#17171c" }}>
                    {stats.bot_total.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#75758a" }}>
                    Bot Accounts
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 3, textAlign: "center", borderRadius: "16px", backgroundColor: "#eeece7" }}>
                  <HumanIcon sx={{ fontSize: 32, mb: 1, color: "#17171c" }} />
                  <Typography variant="h4" sx={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 400, color: "#17171c" }}>
                    {stats.nonbot_total.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#75758a" }}>
                    Human Accounts
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  Bot Account Ratio
                </Typography>
                <Typography variant="caption" sx={{ color: "#17171c", fontWeight: 600 }}>
                  {botPercent.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={botPercent}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#eeece7",
                  "& .MuiLinearProgress-bar": { backgroundColor: "#17171c" },
                }}
              />
            </Box>
          </Box>
        </Grid>

        {/* AI Producers vs Bot */}
        <Grid item xs={12} md={6}>
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
              Synthetic Content Authors vs Bot Flag
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Paper sx={{ p: 3, textAlign: "center", borderRadius: "16px", backgroundColor: "#f1f5ff" }}>
                <AiIcon sx={{ fontSize: 32, mb: 1, color: "#1863dc" }} />
                <Typography variant="h4" sx={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 400, color: "#17171c" }}>
                  {stats.ai_producers_total.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  Total Distinct AI Content Producers
                </Typography>
              </Paper>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  BOT AI CREATORS:
                </Typography>
                <Typography variant="h5" sx={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#ff7759", mt: 0.5 }}>
                  {stats.ai_and_bot.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: "#75758a", fontSize: "11px", display: "block", mt: 0.5 }}>
                  ({stats.bot_total > 0 ? ((stats.ai_and_bot / stats.bot_total) * 100).toFixed(1) : 0}% dei bot usano IA)
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  HUMAN AI CREATORS:
                </Typography>
                <Typography variant="h5" sx={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "#003c33", mt: 0.5 }}>
                  {stats.ai_and_not_bot.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: "#75758a", fontSize: "11px", display: "block", mt: 0.5 }}>
                  ({stats.nonbot_total > 0 ? ((stats.ai_and_not_bot / stats.nonbot_total) * 100).toFixed(1) : 0}% degli umani usano IA)
                </Typography>
              </Grid>
            </Grid>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  Bot Ratio Among AI Content Authors
                </Typography>
                <Typography variant="caption" sx={{ color: "#ff7759", fontWeight: 600 }}>
                  {aiBotPercent.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={aiBotPercent}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#eeece7",
                  "& .MuiLinearProgress-bar": { backgroundColor: "#ff7759" },
                }}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
