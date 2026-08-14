import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import BarraQuota, { type Segmento } from "./BarraQuota.tsx";
import { tokens } from "../../theme.ts";

export interface VoceClassifica {
  /** Chiave stabile della riga (il codice lingua, il dominio, l'id account). */
  chiave: string;
  /** Colonna sinistra: di norma un'etichetta breve, anche composta. */
  etichetta: ReactNode;
  /** Colonna destra, gia' formattata. */
  valore: string;
  /** Come si compone la barra. Un solo segmento per una quota semplice. */
  segmenti: readonly Segmento[];
  /** Riga di dettaglio sotto la barra, per il secondo dato della voce. */
  nota?: string;
}

interface Props {
  voci: readonly VoceClassifica[];
  /**
   * Denominatore comune a tutte le barre. Farlo condividere e' il punto della
   * classifica: con un denominatore per riga ogni barra risulterebbe piena e
   * il confronto - che e' cio' che si sta guardando - sparirebbe.
   */
  totale: number;
  /** Cosa scrivere quando non c'e' alcuna voce. */
  vuoto?: string;
}

/**
 * Elenco ordinato con barra proporzionale: etichetta a sinistra, quota al
 * centro, cifra a destra.
 *
 * E' la `research-table` di DESIGN.md - righe alte separate da filetti, nessuna
 * card - applicata a una distribuzione. Serve le lingue del corpus, le istanze
 * per numero di post e la popolazione degli account, che sono la stessa domanda
 * ("come si ripartisce questo totale") posta su tre insiemi diversi.
 */
export default function ClassificaBarre({ voci, totale, vuoto = "Nessun dato." }: Props) {
  if (voci.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
        {vuoto}
      </Typography>
    );
  }

  return (
    <Box>
      {voci.map((voce, indice) => (
        <Box
          key={voce.chiave}
          sx={{
            py: 1.75,
            borderTop: indice === 0 ? "none" : tokens.border.subtle,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 1,
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ minWidth: 0, display: "flex", alignItems: "center", gap: 1 }}>
              {voce.etichetta}
            </Box>
            <Typography
              sx={{
                fontFamily: tokens.font.mono,
                fontSize: "13px",
                color: tokens.color.nearBlack,
                flexShrink: 0,
              }}
            >
              {voce.valore}
            </Typography>
          </Box>

          <BarraQuota segmenti={voce.segmenti} totale={totale} />

          {voce.nota && (
            <Typography
              sx={{ ...tokens.type.micro, color: tokens.color.textMuted, mt: 0.75 }}
            >
              {voce.nota}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}
