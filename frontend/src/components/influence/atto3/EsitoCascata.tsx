import { Box, Typography } from "@mui/material";
import type {
  InfluenceDemographics,
  InfluenceMeta,
  InfluenceStepStat,
} from "../../../api/client.ts";
import {
  composizioneRaggiunti,
  concentrazioneCascata,
} from "../../../utils/influenceAnalysis.ts";
import { formatNumber, formatPercent } from "../../../utils/format.ts";
import { tokens } from "../../../theme.ts";

interface Props {
  meta: InfluenceMeta;
  stepStats: InfluenceStepStat[];
  demografia: InfluenceDemographics;
}

/**
 * Risposta dell'Atto III: quanti nodi vengono raggiunti dalla cascata, e con
 * quale onesta' metodologica va letto quel numero.
 *
 * `meta.reached_nodes` (80.943) non e' il valore atteso sigma(S) di un
 * seed set: `meta.note` dice esplicitamente che la propagazione e' UNA
 * realizzazione Independent Cascade, cioe' un campione singolo di un processo
 * stocastico. Presentarlo come "il risultato" senza quell'avvertenza accanto
 * al numero sarebbe il difetto che l'Atto II ha gia' corretto una volta per
 * i margini fra algoritmi: un numero vero raccontato in modo fuorviante. Per
 * questo l'avvertenza sta subito sotto il titolo, non in una nota a pie'
 * pagina.
 *
 * `meta.reached_pct` e' gia' sulla scala 0-100 (25.366): non va moltiplicato.
 * Le quote da `concentrazioneCascata` e `composizioneRaggiunti` sono invece
 * frazioni 0-1: vanno moltiplicate per 100 prima di `formatPercent`. Le due
 * scale convivono in questo stesso componente, quindi ogni uso e' commentato.
 */
export default function EsitoCascata({ meta, stepStats, demografia }: Props) {
  const { quotaPrimoStep, quotaEntroTerzoStep } = concentrazioneCascata(
    stepStats,
    meta.reached_nodes,
  );
  const { quotaUmani } = composizioneRaggiunti(demografia);

  return (
    <Box>
      <Typography
        sx={{
          fontFamily: tokens.font.display,
          fontSize: "24px",
          lineHeight: 1.35,
          color: tokens.color.nearBlack,
        }}
      >
        Da {formatNumber(meta.seeds, { useGrouping: true })} seed, la cascata
        raggiunge {formatNumber(meta.reached_nodes, { useGrouping: true })} nodi
        su {formatNumber(meta.nodes, { useGrouping: true })} nella rete: il{" "}
        {formatPercent(meta.reached_pct)} del totale.
      </Typography>

      {/* L'avvertenza sta qui, accanto al numero che qualifica, non in fondo
          alla pagina: e' l'onesta' metodologica che giustifica l'intera
          sezione. */}
      <Box
        data-testid="avvertenza-realizzazione"
        sx={{
          mt: 2,
          p: 2,
          backgroundColor: tokens.color.surfaceSubtle,
          border: tokens.border.subtle,
          borderRadius: tokens.radius.md,
        }}
      >
        <Typography sx={{ color: tokens.color.textPrimary, lineHeight: 1.6 }}>
          Questo numero e' una singola realizzazione del processo Independent
          Cascade, non il valore atteso sigma(S) del seed set: ripetendo la
          propagazione con lo stesso seed set, il numero di nodi raggiunti puo'
          variare. Nei dati: "{meta.note}".
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 3 }}>
        <Typography
          data-testid="concentrazione"
          sx={{ color: tokens.color.textPrimary, lineHeight: 1.6 }}
        >
          La cascata si concentra nei primi step: il{" "}
          {formatPercent(quotaPrimoStep * 100)} dei nodi raggiunti si attiva
          gia' al primo step di propagazione, ed entro il terzo step si arriva
          al {formatPercent(quotaEntroTerzoStep * 100)}.
        </Typography>

        <Typography
          data-testid="composizione"
          sx={{ color: tokens.color.textPrimary, lineHeight: 1.6 }}
        >
          Chi viene raggiunto e' quasi sempre umano: il{" "}
          {formatPercent(quotaUmani * 100)} dei{" "}
          {formatNumber(demografia.activated_total, { useGrouping: true })} nodi
          attivati e' un account umano, anche se tutti i seed di partenza sono
          account IA.
        </Typography>
      </Box>
    </Box>
  );
}
