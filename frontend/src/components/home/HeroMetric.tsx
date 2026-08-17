import { Box, Skeleton, Typography } from "@mui/material";
import { tokens } from "../../theme.ts";

interface HeroMetricProps {
  /** Etichetta breve in maiuscolo, es. "POST INDICIZZATI". */
  etichetta: string;
  /** Valore gia' formattato dal chiamante: qui non si decide il locale. */
  valore: string;
  /** Riga di contesto sotto il numero: dice di cosa e' misura. */
  nota: string;
  /** Mentre la dashboard risponde, al posto del numero va uno scheletro. */
  loading?: boolean;
}

/**
 * Un dato della hero. Non chiama l'API: riceve un valore gia' pronto, cosi' la
 * hero puo' comparire subito con gli scheletri e riempirsi quando i dati
 * arrivano, invece di lasciare la pagina bianca durante il fetch.
 */
export default function HeroMetric({ etichetta, valore, nota, loading = false }: HeroMetricProps) {
  return (
    <Box
      sx={{
        borderLeft: tokens.border.strong,
        pl: 2.5,
        py: 0.5,
        height: "100%",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: tokens.color.textMuted,
          fontFamily: tokens.font.mono,
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          mb: 1,
        }}
      >
        {etichetta}
      </Typography>

      {loading ? (
        <Skeleton
          variant="text"
          width="70%"
          height={44}
          sx={{ backgroundColor: tokens.color.softStone }}
        />
      ) : (
        <Typography
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 400,
            fontSize: { xs: "28px", md: "34px" },
            lineHeight: 1.1,
            letterSpacing: "-0.5px",
            color: tokens.color.nearBlack,
          }}
        >
          {valore}
        </Typography>
      )}

      <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, fontSize: "13px" }}>
        {nota}
      </Typography>
    </Box>
  );
}
