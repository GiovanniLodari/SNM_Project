import { Box } from "@mui/material";
import { tokens } from "../../theme.ts";

export interface Segmento {
  /** Quanto vale questo segmento, nella stessa unita' del totale. */
  valore: number;
  colore: string;
  /** Descrizione leggibile: finisce nel title del segmento. */
  etichetta: string;
}

interface Props {
  /** I segmenti nell'ordine in cui si susseguono da sinistra. */
  segmenti: readonly Segmento[];
  /**
   * Il denominatore. Quando e' maggiore della somma dei segmenti, la parte
   * restante resta vuota sulla barra: e' cosi' che si vede una copertura
   * parziale invece di far sembrare pieno un dato incompleto.
   */
  totale: number;
  /** Spessore in pixel. 8 per le righe di una classifica, 12 per una barra sola. */
  altezza?: number;
}

/**
 * Barra proporzionale a segmenti.
 *
 * DESIGN.md tiene le superfici piatte e non prevede grafici decorativi: una
 * quota si legge meglio come un filetto pieno su una traccia neutra che come
 * una torta. La stessa barra serve la distribuzione delle lingue del corpus, la
 * quota di bot di un'istanza e la copertura di un rilevatore, quindi non si
 * porta dietro alcuna semantica: chi la usa decide colori ed etichette.
 *
 * Con `totale` a zero non rende alcun segmento invece di dividere per zero.
 */
export default function BarraQuota({ segmenti, totale, altezza = 8 }: Props) {
  const denominatore = totale > 0 ? totale : 0;

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: altezza,
        borderRadius: tokens.radius.xs,
        overflow: "hidden",
        backgroundColor: tokens.color.softStone,
      }}
    >
      {denominatore > 0 &&
        segmenti.map((segmento) => (
          <Box
            key={segmento.etichetta}
            title={segmento.etichetta}
            sx={{
              width: `${Math.min(100, (segmento.valore / denominatore) * 100)}%`,
              backgroundColor: segmento.colore,
              transition: "width 0.3s ease",
            }}
          />
        ))}
    </Box>
  );
}
