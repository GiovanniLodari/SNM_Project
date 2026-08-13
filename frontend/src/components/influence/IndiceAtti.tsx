import { Box } from "@mui/material";
import { ATTI } from "./influenceContent.ts";
import { tokens } from "../../theme.ts";

interface Props {
  /** Id dell'atto attualmente in vista, es. "cascata". */
  attivo: string;
}

/**
 * Indice laterale dei quattro atti: tiene insieme la narrazione dandole una
 * mappa sempre visibile, cosi' chi legge sa in ogni momento dove si trova e
 * puo' saltare a un atto precedente senza risalire la pagina a scorrimento.
 *
 * Sticky solo da `md` in su: sotto quella soglia la colonna laterale non ha
 * spazio accanto al contenuto, e un indice fisso finirebbe per coprire il
 * testo invece di accompagnarlo.
 */
export default function IndiceAtti({ attivo }: Props) {
  return (
    <Box
      component="nav"
      aria-label="Indice degli atti"
      sx={{
        display: { xs: "none", md: "block" },
        position: "sticky",
        top: 96,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {ATTI.map((atto) => {
          const corrente = atto.id === attivo;
          return (
            <Box
              key={atto.id}
              component="a"
              href={`#${atto.id}`}
              data-testid={`voce-${atto.id}`}
              aria-current={corrente ? "true" : undefined}
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: 1,
                textDecoration: "none",
                color: corrente ? tokens.color.nearBlack : tokens.color.textMuted,
                fontWeight: corrente ? 600 : 400,
              }}
            >
              <Box
                component="span"
                sx={{ fontFamily: tokens.font.mono, fontSize: "12px" }}
              >
                {atto.numero}
              </Box>
              <Box component="span" sx={{ fontFamily: tokens.font.display, fontSize: "14px" }}>
                {atto.titolo}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
