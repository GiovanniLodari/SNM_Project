import { Box, Grid, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { tokens } from "../../theme.ts";
import { ANCORA_COME_FUNZIONA, STEPS } from "./homeContent.ts";

/**
 * I quattro passi della pipeline, come indice navigabile del progetto.
 *
 * Serve a rispondere alla domanda che si fa chi arriva qui la prima volta -
 * "da dove comincio?" - prima che incontri il grafo: ogni passo dice cosa fa e
 * porta alla pagina che lo mostra.
 */
export default function HowItWorks() {
  return (
    <Box id={ANCORA_COME_FUNZIONA} sx={{ mb: 6, scrollMarginTop: "88px" }}>
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
          Come funziona
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5 }}>
          Quattro passi, dalla raccolta dei post alla diffusione nella rete. Ognuno ha la sua pagina.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {STEPS.map((step) => {
          const Icona = step.icona;
          return (
            <Grid item xs={12} sm={6} md={3} key={step.numero}>
              <Box
                sx={{
                  height: "100%",
                  p: 3,
                  borderRadius: tokens.radius.lg,
                  backgroundColor: tokens.color.canvas,
                  border: tokens.border.subtle,
                  display: "flex",
                  flexDirection: "column",
                  transition: "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
                  "&:hover": {
                    borderColor: tokens.color.nearBlack,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: tokens.font.mono,
                      fontSize: "12px",
                      color: tokens.color.textFaint,
                      letterSpacing: "1px",
                    }}
                  >
                    {step.numero}
                  </Typography>
                  <Icona sx={{ fontSize: 22, color: tokens.color.nearBlack }} />
                </Box>

                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: tokens.font.display,
                    fontWeight: 600,
                    fontSize: "18px",
                    color: tokens.color.nearBlack,
                    mb: 1,
                  }}
                >
                  {step.titolo}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{ color: tokens.color.textMuted, lineHeight: 1.55, mb: 2.5, flexGrow: 1 }}
                >
                  {step.descrizione}
                </Typography>

                <Box
                  component={Link}
                  to={step.path}
                  sx={{
                    color: tokens.color.actionBlue,
                    textDecoration: "underline",
                    fontSize: "14px",
                    fontWeight: 500,
                    alignSelf: "flex-start",
                  }}
                >
                  {step.ctaLabel} &rarr;
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
