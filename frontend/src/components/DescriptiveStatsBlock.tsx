import { useState, lazy, Suspense } from "react";
import {
  Box,
  Typography,
  Grid,
  Chip,
  Button,
} from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { useAiDetectionQuery } from "../api/queries.ts";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import { tokens } from "../theme.ts";
import { formatNumber } from "../utils/format.ts";

/**
 * Il report interattivo si apre su clic e resta chiuso per la quasi totalita'
 * delle visite: i suoi 21 kB non hanno motivo di viaggiare insieme al blocco
 * che lo apre. Il chunk parte al primo `open`, ed e' per questo che il bottone
 * qui sotto lo precarica al passaggio del mouse - alla pressione il codice e'
 * gia' arrivato e la modale si apre senza attesa percepibile, come le voci
 * della sidebar.
 */
const caricaStatsModal = () => import("./StatsModal.tsx");
const StatsModal = lazy(caricaStatsModal);


export default function DescriptiveStatsBlock() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAperturaAvvenuta, setModalAperturaAvvenuta] = useState(false);

  // Stessa chiave di query della pagina AI Detection: TanStack riusa la
  // risposta gia' in cache invece di rifare la chiamata.
  const { data, isLoading: loading } = useAiDetectionQuery([], 1);
  const stats = data?.stats ?? null;

  if (loading || !stats || !stats.probability || !stats.distribution_curve) {
    return null;
  }

  return (
    <Box sx={{ mb: 6 }}>
      {/* Intestazione Sezione conforme a DESIGN.md */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 3 }}>
        <Box>

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
            Statistiche Descrittive del Corpus
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5 }}>
            Metriche di sintesi e curve di distribuzione per il rilevamento del testo sintetico.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<AnalyticsIcon sx={{ color: tokens.color.actionBlue }} />}
          onMouseEnter={caricaStatsModal}
          onFocus={caricaStatsModal}
          onTouchStart={caricaStatsModal}
          onClick={() => {
            setModalAperturaAvvenuta(true);
            setModalOpen(true);
          }}
          sx={{
            borderRadius: tokens.radius.pill,
            px: 3,
            py: 1,
            fontWeight: 600,
            fontSize: "13px",
            textTransform: "none",
            borderColor: tokens.color.borderStrong,
            color: tokens.color.nearBlack,
            "&:hover": {
              borderColor: tokens.color.actionBlue,
              backgroundColor: tokens.color.surfaceBlue,
            },
          }}
        >
          Apri Report Interattivo
        </Button>
      </Box>

      {/* Grid di Card KPI su sfondo Soft Stone */}
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: tokens.radius.xl,
          backgroundColor: tokens.color.softStone, // Soft Stone Surface da DESIGN.md
          border: tokens.border.strong,
        }}
      >
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Card 1: Probabilità Media */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: tokens.radius.lg,
                backgroundColor: tokens.color.canvas,
                border: tokens.border.subtle,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontWeight: 600, display: "block", mb: 1, letterSpacing: "0.28px" }}>
                PROBABILITÀ MEDIA AI
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 400,
                  fontSize: "38px",
                  color: tokens.color.coralInk,
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {stats.probability.mean}%
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                Mediana: <strong>{stats.probability.median}%</strong> &bull; &plusmn;{stats.probability.std}% std
              </Typography>
            </Box>
          </Grid>

          {/* Card 2: Lunghezza Post Medio */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: tokens.radius.lg,
                backgroundColor: tokens.color.canvas,
                border: tokens.border.subtle,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontWeight: 600, display: "block", mb: 1, letterSpacing: "0.28px" }}>
                LUNGHEZZA MEDIA POST
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 400,
                  fontSize: "38px",
                  color: tokens.color.actionBlue, // Action Blue
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {stats.text_length.avg_chars}
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                Caratteri medi &bull; Mediana: <strong>{stats.text_length.median_chars}</strong>
              </Typography>
            </Box>
          </Grid>

          {/* Card 3: Bot Account */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: tokens.radius.lg,
                backgroundColor: tokens.color.canvas,
                border: tokens.border.subtle,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontWeight: 600, display: "block", mb: 1, letterSpacing: "0.28px" }}>
                ACCOUNT AUTOMATIZZATI
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 400,
                  fontSize: "38px",
                  color: tokens.color.nearBlack,
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {stats.bot_breakdown.bot_percentage}%
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                {formatNumber(stats.bot_breakdown.bots)} bot vs {formatNumber(stats.bot_breakdown.humans)} umani
              </Typography>
            </Box>
          </Grid>

          {/* Card 4: Tokens Analizzati */}
          <Grid item xs={12} sm={6} md={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: tokens.radius.lg,
                backgroundColor: tokens.color.canvas,
                border: tokens.border.subtle,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontWeight: 600, display: "block", mb: 1, letterSpacing: "0.28px" }}>
                TOKEN MEDI PER POST
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 400,
                  fontSize: "38px",
                  color: tokens.color.deepGreen, // Deep Enterprise Green
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {stats.text_length.avg_tokens}
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                Valutati da Fast-DetectGPT
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Grafico Curva di Distribuzione su Fondo Bianco Editorial */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                p: 3.5,
                borderRadius: tokens.radius.lg,
                backgroundColor: tokens.color.canvas,
                border: tokens.border.subtle,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "16px", color: tokens.color.nearBlack }}>
                  Spettro Continuo di Probabilità IA (KDE)
                </Typography>
                <Chip label="10 Bucket Fine-Grained" size="small" sx={{ backgroundColor: tokens.color.softStone, color: tokens.color.textMuted, fontSize: "11px" }} />
              </Box>

              <Box sx={{ height: 220, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.distribution_curve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardProbGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={tokens.color.coral} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={tokens.color.coral} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="bucket" stroke={tokens.color.textMuted} tick={{ fontSize: 11 }} />
                    <YAxis stroke={tokens.color.textMuted} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tokens.color.nearBlack,
                        border: "none",
                        borderRadius: tokens.radius.sm,
                        color: tokens.color.canvas,
                      }}
                      formatter={(val) => [`${formatNumber(Number(val || 0))} status`, "Frequenza"]}
                    />
                    <Area type="monotone" dataKey="count" stroke={tokens.color.coralInk} strokeWidth={2.5} fillOpacity={1} fill="url(#dashboardProbGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Grid>

          {/* Grafico Top Domini */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 3.5,
                borderRadius: tokens.radius.lg,
                backgroundColor: tokens.color.canvas,
                border: tokens.border.subtle,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "16px", color: tokens.color.nearBlack, mb: 2 }}>
                Top Istanze Fediverso
              </Typography>
              <Box sx={{ height: 180, width: "100%", flexGrow: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.top_domains} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" stroke={tokens.color.textMuted} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="domain" type="category" stroke={tokens.color.nearBlack} tick={{ fontSize: 11 }} width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tokens.color.nearBlack,
                        border: "none",
                        borderRadius: tokens.radius.sm,
                        color: tokens.color.canvas,
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stats.top_domains.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? tokens.color.coral : index === 1 ? tokens.color.actionBlue : tokens.color.deepGreen} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Modale report completo. Montata solo dopo la prima apertura, e da
          quel momento lasciata montata: smontarla alla chiusura toglierebbe
          alla Dialog la transizione d'uscita, che e' il segnale di "si sta
          chiudendo" - e la seconda apertura sarebbe di nuovo in attesa. */}
      {modalAperturaAvvenuta && (
        <Suspense fallback={null}>
          <StatsModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            stats={stats}
          />
        </Suspense>
      )}
    </Box>
  );
}
