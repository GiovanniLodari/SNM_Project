import { Box, Button, Grid, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { ArrowForward as ArrowIcon, SouthEast as ScrollIcon } from "@mui/icons-material";
import type { DashboardStats } from "../../api/client.ts";
import { tokens } from "../../theme.ts";
import { formatNumber } from "../../utils/format.ts";
import { useMovimentoRidotto } from "../../hooks/useMovimentoRidotto.ts";
import HeroMetric from "./HeroMetric.tsx";
import { ANCORA_COME_FUNZIONA, HERO } from "./homeContent.ts";

/**
 * Dissolvenza d'ingresso della hero: 0,4s, stessa curva di prima
 * (`cubic-bezier(.16,1,.3,1)`, una ease-out-quint), stessi 10px di scorrimento.
 *
 * Era l'unico uso di `motion` in tutta l'applicazione, e si portava dietro il
 * motore completo di framer-motion sulla rotta d'ingresso. In CSS l'effetto e'
 * identico ma composito - `opacity` e `transform` soltanto - e non costa
 * JavaScript.
 *
 * La sezione e' **visibile per definizione**: `opacity: 1` e' lo stato
 * dichiarato nella regola, e l'animazione parte da 0 con `from`. Gestirla al
 * contrario (opacita' zero di base, portata a uno da una classe) lascerebbe la
 * hero in bianco ovunque l'animazione non parta - schede in secondo piano,
 * render headless, screenshot - che e' esattamente il difetto che una hero non
 * puo' permettersi.
 */
const ANIMAZIONE_INGRESSO = {
  "@keyframes heroIngresso": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 1, transform: "none" },
  },
  opacity: 1,
  // Senza `fill-mode`: `to` coincide con lo stato dichiarato qui sopra, quindi
  // non c'e' nulla da trattenere a fine corsa - e soprattutto niente
  // `backwards` che terrebbe la sezione a opacita' zero dove l'animazione non
  // parte affatto.
  animation: "heroIngresso 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  // La preferenza di sistema si rispetta qui e non con un ramo in JavaScript:
  // la media query vale anche se lo stato React non e' ancora allineato.
  "@media (prefers-reduced-motion: reduce)": {
    animation: "none",
  },
} as const;

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
  const riduciMovimento = useMovimentoRidotto();

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
      component="section"
      sx={{ ...ANIMAZIONE_INGRESSO, pt: { xs: 4, md: 7 }, pb: { xs: 5, md: 8 } }}
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
