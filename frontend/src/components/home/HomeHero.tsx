import { Box, Button, Grid, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowForward as ArrowIcon, SouthEast as ScrollIcon } from "@mui/icons-material";
import type { DashboardStats } from "../../api/client.ts";
import { tokens } from "../../theme.ts";
import { formatNumber } from "../../utils/format.ts";
import HeroMetric from "./HeroMetric.tsx";
import { ANCORA_COME_FUNZIONA, HERO } from "./homeContent.ts";

interface HomeHeroProps {
  /** Null finche' la dashboard non risponde, o se la chiamata fallisce. */
  stats: DashboardStats | null;
  loading: boolean;
}

/**
 * Primo schermo della homepage: dice cosa e' il progetto prima che l'utente
 * incontri il grafo.
 *
 * Riceve i dati per props e non ha uno stato d'errore proprio: se `stats` manca
 * i quattro numeri restano scheletri (durante il caricamento) o "n/d" (se il
 * backend non risponde), e l'errore vero e' compito della pagina. Cosi' il
 * testo introduttivo resta leggibile anche a backend spento.
 */
export default function HomeHero({ stats, loading }: HomeHeroProps) {
  const riduciMovimento = useReducedMotion();

  const scorriACommeFunziona = () => {
    document.getElementById(ANCORA_COME_FUNZIONA)?.scrollIntoView({
      behavior: riduciMovimento ? "auto" : "smooth",
      block: "start",
    });
  };

  const metriche = [
    {
      etichetta: "Post indicizzati",
      valore: formatNumber(stats?.posts_total),
      nota: "Status raccolti dalle istanze monitorate",
    },
    {
      etichetta: "Archi di follow",
      valore: formatNumber(stats?.follows_total),
      nota: "Relazioni che compongono il grafo sociale",
    },
    {
      etichetta: "Post analizzati",
      valore: formatNumber(stats?.ai_done),
      nota: "Testi passati dai rilevatori di scrittura automatica",
    },
    {
      etichetta: "Verdetti di verifica",
      valore: formatNumber(stats?.fact_check_done),
      nota: "Affermazioni controllate con fonti citate",
    },
  ];

  return (
    <Box
      component={motion.section}
      initial={riduciMovimento ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      sx={{ pt: { xs: 4, md: 7 }, pb: { xs: 5, md: 8 } }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "block",
          fontFamily: tokens.font.mono,
          fontSize: "12px",
          letterSpacing: "1px",
          color: tokens.color.textMuted,
          mb: { xs: 2, md: 3 },
        }}
      >
        {HERO.eyebrow}
      </Typography>

      <Typography
        variant="h1"
        sx={{
          fontFamily: tokens.font.display,
          fontWeight: 400,
          fontSize: { xs: "40px", sm: "54px", md: "72px" },
          lineHeight: 1.0,
          letterSpacing: "-1.44px",
          color: tokens.color.nearBlack,
          maxWidth: "16ch",
        }}
      >
        {HERO.titolo}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          mt: { xs: 3, md: 4 },
          maxWidth: "62ch",
          color: tokens.color.textPrimary,
          fontSize: { xs: "16px", md: "18px" },
          lineHeight: 1.6,
        }}
      >
        {HERO.paragrafo}
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: { xs: 4, md: 5 } }}>
        <Button
          component={Link}
          to="/posts"
          variant="contained"
          endIcon={<ArrowIcon />}
          sx={{ borderRadius: tokens.radius.pill, px: 3.5, py: 1.25 }}
        >
          {HERO.ctaPrimaria}
        </Button>
        <Button
          variant="outlined"
          onClick={scorriACommeFunziona}
          endIcon={<ScrollIcon sx={{ fontSize: "18px !important" }} />}
          sx={{ borderRadius: tokens.radius.pill, px: 3.5, py: 1.25 }}
        >
          {HERO.ctaSecondaria}
        </Button>
      </Box>

      <Grid container spacing={{ xs: 3, md: 4 }} sx={{ mt: { xs: 4, md: 6 } }}>
        {metriche.map((metrica) => (
          <Grid item xs={6} md={3} key={metrica.etichetta}>
            <HeroMetric
              etichetta={metrica.etichetta}
              valore={metrica.valore}
              nota={metrica.nota}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
