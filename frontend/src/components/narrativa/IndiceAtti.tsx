import { Box } from "@mui/material";
import type { MouseEvent } from "react";
import { OFFSET_INDICE_PX, type Atto } from "./tipi.ts";
import { tokens } from "../../theme.ts";

interface Props {
  /** Gli atti del capitolo, nell'ordine in cui si leggono. */
  atti: readonly Atto[];
  /** Id dell'atto attualmente in vista, es. "cascata". */
  attivo: string;
}

/**
 * Indice laterale degli atti: tiene insieme la narrazione dandole una mappa
 * sempre visibile, cosi' chi legge sa in ogni momento dove si trova e puo'
 * saltare a un atto precedente senza risalire la pagina a scorrimento.
 *
 * Sticky solo da `md` in su: sotto quella soglia la colonna laterale non ha
 * spazio accanto al contenuto, e un indice fisso finirebbe per coprire il
 * testo invece di accompagnarlo.
 */
export default function IndiceAtti({ atti, attivo }: Props) {
  // L'app monta un HashRouter, quindi l'hash della URL e' la rotta: lasciar
  // seguire al browser un href="#cascata" sostituirebbe "#/influence-maximization"
  // con "#cascata", nessuna rotta corrisponderebbe e la pagina resterebbe
  // vuota. Lo scorrimento si fa a mano; l'href resta perche' e' cio' che rende
  // queste voci dei link per la tastiera e per gli screen reader.
  const vaiAllAtto = (evento: MouseEvent<HTMLAnchorElement>, id: string) => {
    evento.preventDefault();
    // `scrollIntoView` non esiste in jsdom: l'optional call tiene i test
    // liberi di montare l'indice senza doverlo simulare.
    document.getElementById(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  return (
    <Box
      component="nav"
      aria-label="Indice degli atti"
      sx={{
        display: { xs: "none", md: "block" },
        position: "sticky",
        top: OFFSET_INDICE_PX,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {atti.map((atto) => {
          const corrente = atto.id === attivo;
          return (
            <Box
              key={atto.id}
              component="a"
              href={`#${atto.id}`}
              onClick={(evento: MouseEvent<HTMLAnchorElement>) => vaiAllAtto(evento, atto.id)}
              data-testid={`voce-${atto.id}`}
              aria-current={corrente ? "true" : undefined}
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: 1,
                textDecoration: "none",
                color: corrente ? tokens.color.nearBlack : tokens.color.textMuted,
                fontWeight: corrente ? 600 : 400,
                transition: "color 0.15s ease",
                "&:hover": { color: tokens.color.nearBlack },
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
