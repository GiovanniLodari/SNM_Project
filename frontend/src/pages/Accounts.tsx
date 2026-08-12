import { Typography, Box, Grid, Skeleton, Paper, LinearProgress, Tooltip, Stack } from "@mui/material";
import { useAccountsQuery } from "../api/queries.ts";
import { SmartToy as BotIcon, People as HumanIcon, Psychology as AiIcon, HelpOutline as HelpIcon } from "@mui/icons-material";
import { tokens } from "../theme.ts";
import { formatNumber } from "../utils/format.ts";

export default function Accounts() {
  const { data: stats, isLoading: loading, isError } = useAccountsQuery();
  const error = isError ? "Impossibile caricare le statistiche sugli account." : null;

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width={220} height={30} sx={{ mb: 2, borderRadius: tokens.radius.md }} />
        <Skeleton variant="rectangular" width="60%" height={50} sx={{ mb: 4, borderRadius: tokens.radius.md }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: tokens.radius.lg, backgroundColor: tokens.color.softStone }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: tokens.radius.lg, backgroundColor: tokens.color.softStone }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: tokens.radius.lg, backgroundColor: tokens.color.softStone }} />
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

        <Typography
          variant="h2"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 400,
            fontSize: { xs: "32px", md: "48px" },
            color: tokens.color.nearBlack,
            mb: 1,
          }}
        >
          Fediverse Account Taxonomy
        </Typography>
        <Typography variant="body1" sx={{ color: tokens.color.textMuted }}>
          Cross-referenced statistics comparing bot accounts vs human creators of synthetic AI content.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Global Bot Distribution */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 4,
              borderRadius: tokens.radius.xl,
              border: tokens.border.subtle,
              backgroundColor: tokens.color.canvas,
              height: "100%",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: tokens.color.nearBlack }}>
                Global Bot Classification
              </Typography>
              <Tooltip title="La classificazione distingue tra account automatizzati (Bot) e utenti umani basandosi su euristiche di attività e metadati del profilo." arrow>
                <HelpIcon sx={{ fontSize: 18, color: tokens.color.textFaint, cursor: "pointer" }} />
              </Tooltip>
            </Stack>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={6}>
                <Paper sx={{ p: 3, textAlign: "center", borderRadius: tokens.radius.lg, backgroundColor: tokens.color.softStone }}>
                  <BotIcon sx={{ fontSize: 32, mb: 1, color: tokens.color.nearBlack }} />
                  <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 400, color: tokens.color.nearBlack }}>
                    {formatNumber(stats.bot_total)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                    Bot Accounts
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 3, textAlign: "center", borderRadius: tokens.radius.lg, backgroundColor: tokens.color.softStone }}>
                  <HumanIcon sx={{ fontSize: 32, mb: 1, color: tokens.color.nearBlack }} />
                  <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 400, color: tokens.color.nearBlack }}>
                    {formatNumber(stats.nonbot_total)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                    Human Accounts
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                  Bot Account Ratio
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.color.nearBlack, fontWeight: 600 }}>
                  {botPercent.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={botPercent}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: tokens.color.softStone,
                  "& .MuiLinearProgress-bar": { backgroundColor: tokens.color.nearBlack },
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
              borderRadius: tokens.radius.xl,
              border: tokens.border.subtle,
              backgroundColor: tokens.color.canvas,
              height: "100%",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: tokens.color.nearBlack, mb: 3 }}>
              Synthetic Content Authors vs Bot Flag
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Paper sx={{ p: 3, textAlign: "center", borderRadius: tokens.radius.lg, backgroundColor: tokens.color.surfaceBlue }}>
                <AiIcon sx={{ fontSize: 32, mb: 1, color: tokens.color.actionBlue }} />
                <Typography variant="h4" sx={{ fontFamily: tokens.font.display, fontWeight: 400, color: tokens.color.nearBlack }}>
                  {formatNumber(stats.ai_producers_total)}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                  Total Distinct AI Content Producers
                </Typography>
              </Paper>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                  BOT AI CREATORS:
                </Typography>
                <Typography variant="h5" sx={{ fontFamily: tokens.font.display, fontWeight: 600, color: tokens.color.coral, mt: 0.5 }}>
                  {formatNumber(stats.ai_and_bot)}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontSize: "11px", display: "block", mt: 0.5 }}>
                  ({stats.bot_total > 0 ? ((stats.ai_and_bot / stats.bot_total) * 100).toFixed(1) : 0}% dei bot usano IA)
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                  HUMAN AI CREATORS:
                </Typography>
                <Typography variant="h5" sx={{ fontFamily: tokens.font.display, fontWeight: 600, color: tokens.color.deepGreen, mt: 0.5 }}>
                  {formatNumber(stats.ai_and_not_bot)}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontSize: "11px", display: "block", mt: 0.5 }}>
                  ({stats.nonbot_total > 0 ? ((stats.ai_and_not_bot / stats.nonbot_total) * 100).toFixed(1) : 0}% degli umani usano IA)
                </Typography>
              </Grid>
            </Grid>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                  Bot Ratio Among AI Content Authors
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.color.coral, fontWeight: 600 }}>
                  {aiBotPercent.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={aiBotPercent}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: tokens.color.softStone,
                  "& .MuiLinearProgress-bar": { backgroundColor: tokens.color.coral },
                }}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
