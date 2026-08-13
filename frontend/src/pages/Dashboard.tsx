import { Grid, Typography, Box, LinearProgress, Button } from "@mui/material";
import { Link } from "react-router-dom";
import { useDashboardQuery } from "../api/queries.ts";
import GraphHero from "../components/GraphHero.tsx";
import DescriptiveStatsBlock from "../components/DescriptiveStatsBlock.tsx";
import HomeHero from "../components/home/HomeHero.tsx";
import HowItWorks from "../components/home/HowItWorks.tsx";
import {
  Article as PostsIcon,
  SyncAlt as FollowsIcon,
  Psychology as AiIcon,
  FactCheck as FactIcon,
  ArrowForward as ArrowIcon,
} from "@mui/icons-material";
import { tokens } from "../theme.ts";
import { ErrorState } from "../components/States.tsx";
import { formatNumber } from "../utils/format.ts";

export default function Dashboard() {
  const { data: stats, isLoading: loading, isError } = useDashboardQuery();

  // Niente early return sul caricamento: la hero e' cio' che spiega il
  // progetto, e tenerla dietro allo spinner di /api/dashboard significava
  // accogliere chi arriva con una pagina bianca. Hero e "Come funziona" non
  // dipendono dal fetch; i numeri dentro la hero si riempiono quando arrivano.
  const aiPercent = stats && stats.ai_eligible > 0 ? (stats.ai_done / stats.ai_eligible) * 100 : 0;
  const factPercent =
    stats && stats.fact_check_eligible > 0 ? (stats.fact_check_done / stats.fact_check_eligible) * 100 : 0;

  return (
    <Box>
      {/* Prima schermata: cosa e' questo progetto */}
      <HomeHero stats={stats ?? null} loading={loading} />

      {/* Indice dei quattro passi della pipeline */}
      <HowItWorks />

      {isError && (
        <ErrorState message="Impossibile caricare le statistiche del server. Verificare che il backend sia in esecuzione." />
      )}

      {/* Intestazione del grafo: dice cosa si sta guardando prima del canvas */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 400,
            fontSize: { xs: "28px", md: "36px" },
            color: tokens.color.nearBlack,
            letterSpacing: "-0.48px",
          }}
        >
          La rete dei follow, nodo per nodo
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, maxWidth: "70ch" }}>
          I nodi compaiono pochi alla volta: corallo per gli account automatizzati, verde per quelli
          umani, ciano per le istanze con molte connessioni. Trascina un nodo per spostarlo, passaci
          sopra per vederne i dati, cliccalo per aprire la scheda completa.
        </Typography>
      </Box>

      {/* Dynamic Graph Hero Section (Incremental Render) */}
      <GraphHero />

      {/* I blocchi qui sotto vivono sui dati della dashboard: senza, non si
          disegnano barre di completamento e totali che non conosciamo. */}
      {stats && (
      <>
      {/* Block Statistiche Descrittive Conforme a DESIGN.md */}
      <DescriptiveStatsBlock />

      {/* Main Grid Metrics */}
      <Grid container spacing={4} sx={{ mb: 6 }}>


        {/* Post Totali */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 4,
              borderRadius: tokens.radius.xl,
              backgroundColor: tokens.color.softStone, // Soft Stone Surface
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted, textTransform: "uppercase" }}>
                  POST INDICIZZATI
                </Typography>
                <PostsIcon sx={{ color: tokens.color.nearBlack }} />
              </Box>
              <Typography
                variant="h1"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 400,
                  fontSize: "64px",
                  color: tokens.color.nearBlack,
                  lineHeight: 1.0,
                  mb: 1,
                }}
              >
                {formatNumber(stats.posts_total)}
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
                Status raccolti dalle istanze del Fediverso sotto osservazione.
              </Typography>
            </Box>

            <Button
              component={Link}
              to="/posts"
              variant="contained"
              endIcon={<ArrowIcon />}
              sx={{ alignSelf: "flex-start", borderRadius: tokens.radius.pill, px: 3 }}
            >
              Esplora il corpus
            </Button>
          </Box>
        </Grid>

        {/* Follow Network */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 4,
              borderRadius: tokens.radius.xl,
              backgroundColor: tokens.color.softStone, // Soft Stone Surface
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted, textTransform: "uppercase" }}>
                  ARCHI DEL GRAFO
                </Typography>
                <FollowsIcon sx={{ color: tokens.color.nearBlack }} />
              </Box>
              <Typography
                variant="h1"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 400,
                  fontSize: "64px",
                  color: tokens.color.nearBlack,
                  lineHeight: 1.0,
                  mb: 1,
                }}
              >
                {formatNumber(stats.follows_total)}
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
                Relazioni di follow trovate dal crawler delle connessioni.
              </Typography>
            </Box>

            <Button
              component={Link}
              to="/accounts"
              variant="contained"
              endIcon={<ArrowIcon />}
              sx={{ alignSelf: "flex-start", borderRadius: tokens.radius.pill, px: 3 }}
            >
              Metriche account
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Cohere Deep Green Section for AI & Fact Check Pipelines */}
      <Box
        sx={{
          p: { xs: 4, md: 6 },
          borderRadius: tokens.radius.xl,
          backgroundColor: tokens.color.deepGreen, // Deep Enterprise Green Band
          color: tokens.color.canvas,
          mb: 6,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: tokens.color.coralLight, fontFamily: tokens.font.mono, fontSize: "11px", display: "block", mb: 2 }}
        >
          PIPELINE DI ANALISI: TESTO SINTETICO E VERIFICA DEI FATTI
        </Typography>

        <Grid container spacing={4}>
          {/* AI Detection Multi-Model Card */}
          <Grid item xs={12} md={6}>
            <Box sx={{ borderTop: "1px solid rgba(255, 255, 255, 0.15)", pt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <AiIcon sx={{ color: tokens.color.coral }} />
                <Typography variant="h5" sx={{ color: tokens.color.canvas, fontWeight: 500 }}>
                  Rilevamento del testo sintetico (4 modelli)
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: tokens.color.textFaint, mb: 2 }}>
                Analisi comparativa dello stesso testo con <strong>FastDetectGPT</strong>, <strong>Binoculars (ICML 2024)</strong>, <strong>Desklib AI Detector</strong> e <strong>AdaDetectGPT</strong>.
              </Typography>

              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="caption" sx={{ color: tokens.color.canvas }}>
                    Completamento FastDetectGPT
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.color.coral, fontWeight: 600 }}>
                    {aiPercent.toFixed(1)}% ({formatNumber(stats.ai_done)} / {formatNumber(stats.ai_eligible)})
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={aiPercent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    "& .MuiLinearProgress-bar": { backgroundColor: tokens.color.coral },
                  }}
                />
              </Box>

              {/* Collegamenti ai quattro modelli e al confronto */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, pt: 1 }}>
                <Button
                  component={Link}
                  to="/ai-detection"
                  size="small"
                  sx={{ color: tokens.color.canvas, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: tokens.radius.lg, textTransform: "none", fontSize: "12px", "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" } }}
                >
                  FastDetectGPT
                </Button>
                <Button
                  component={Link}
                  to="/ai-detection-binoculars"
                  size="small"
                  sx={{ color: tokens.color.canvas, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: tokens.radius.lg, textTransform: "none", fontSize: "12px", "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" } }}
                >
                  Binoculars
                </Button>
                <Button
                  component={Link}
                  to="/ai-detection-desklib"
                  size="small"
                  sx={{ color: tokens.color.canvas, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: tokens.radius.lg, textTransform: "none", fontSize: "12px", "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" } }}
                >
                  Desklib
                </Button>
                <Button
                  component={Link}
                  to="/ai-detection-ada"
                  size="small"
                  sx={{ color: tokens.color.canvas, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: tokens.radius.lg, textTransform: "none", fontSize: "12px", "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" } }}
                >
                  AdaDetectGPT
                </Button>
                <Button
                  component={Link}
                  to="/detector-comparison"
                  size="small"
                  variant="outlined"
                  sx={{ color: tokens.color.coral, borderColor: tokens.color.coral, borderRadius: tokens.radius.lg, textTransform: "none", fontSize: "12px", fontWeight: 600, "&:hover": { backgroundColor: "rgba(255,119,89,0.1)", borderColor: tokens.color.coral } }}
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
                <FactIcon sx={{ color: tokens.color.actionBlue }} />
                <Typography variant="h5" sx={{ color: tokens.color.canvas, fontWeight: 500 }}>
                  Verifica dei fatti con LLM
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: tokens.color.textFaint, mb: 3 }}>
Verificate <strong>{formatNumber(stats.fact_check_done)}</strong> affermazioni su <strong>{formatNumber(stats.fact_check_eligible)}</strong> ritenute controllabili.
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="caption" sx={{ color: tokens.color.canvas }}>
                    Completamento
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.color.actionBlue, fontWeight: 600 }}>
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
                    "& .MuiLinearProgress-bar": { backgroundColor: tokens.color.actionBlue },
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: tokens.color.textFaint }}>
                  Fonti di verifica: DuckDuckGo + Wikipedia
                </Typography>
                <Box
                  component={Link}
                  to="/fact-check"
                  sx={{ color: tokens.color.actionBlue, textDecoration: "underline", fontSize: "14px", fontWeight: 500 }}
                >
                  Vedi i verdetti &rarr;
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
      </>
      )}
    </Box>
  );
}
