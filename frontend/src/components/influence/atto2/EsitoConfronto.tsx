import { Box, Typography } from "@mui/material";
import type { InfluenceAlgorithmInfo } from "../../../api/client.ts";
import { rapportoCostoBeneficio } from "../../../utils/influenceAnalysis.ts";
import { formatDecimal, formatNumber, formatPercent } from "../../../utils/format.ts";
import { tokens } from "../../../theme.ts";

interface Props {
  algoritmi: Record<string, InfluenceAlgorithmInfo>;
  vincitore: string;
}

/**
 * Risposta dell'Atto II: chi vince e quanto quella vittoria conta davvero.
 *
 * Il difetto che questo componente corregge non e' un numero sbagliato, e' un
 * numero vero raccontato in modo fuorviante: un badge "vincitore CELF++" senza
 * contesto lascia credere a chi legge che CELF++ sia la scelta giusta. Il
 * margine sul secondo classificato e il costo in tempo, mostrati nella stessa
 * frase, dicono l'opposto: la vittoria e' talmente marginale da non giustificare
 * un tempo di calcolo di ordini di grandezza superiore. Per questo qui non c'e'
 * nessun colore di "vittoria": la superficie e' neutra (`softStone`), il testo
 * e' `nearBlack` come ovunque nella pagina.
 *
 * Oltre al margine sul secondo classificato (che qui e' PMIA), la frase
 * aggiunge un secondo fatto, altrettanto calcolato: anche l'euristica piu'
 * povera del confronto (`degree`, che non stima nulla e costa tempo
 * trascurabile) resta a una distanza di spread comparabile. Rincara la stessa
 * tesi da un angolo diverso, senza inventare un secondo posto che i dati non
 * assegnano a `degree`.
 */
export default function EsitoConfronto({ algoritmi, vincitore }: Props) {
  const righe = rapportoCostoBeneficio(algoritmi);
  const vincitoreRiga = righe.find((r) => r.nome === vincitore) ?? righe[0];
  const secondoRiga = righe.find((r) => r.nome !== vincitoreRiga?.nome);
  const pmiaRiga = righe.find((r) => r.nome === "PMIA");
  // Baseline piu' povera del confronto: nessuna stima, tempo trascurabile.
  // Se non e' presente nella run la frase la salta, senza inventare un valore.
  const baselineRiga = righe.find((r) => r.nome === "degree");

  if (!vincitoreRiga || !secondoRiga || !pmiaRiga) {
    return null;
  }

  // Le quote sono frazioni 0-1 (vedi influenceAnalysis.ts): ogni margine va
  // moltiplicato per 100 prima di passare a formatPercent, che si aspetta la
  // scala 0-100.
  const margineSulSecondo =
    (vincitoreRiga.quotaDelMigliore - secondoRiga.quotaDelMigliore) * 100;
  const margineSullaBaseline = baselineRiga
    ? (vincitoreRiga.quotaDelMigliore - baselineRiga.quotaDelMigliore) * 100
    : null;

  // Quante volte il tempo del vincitore sta nel tempo di PMIA: e' il costo che
  // il badge "vincitore" da solo non dice mai.
  const rapportoTempoSuPmia =
    pmiaRiga.tempoS > 0 ? Math.round(vincitoreRiga.tempoS / pmiaRiga.tempoS) : null;

  const quotaPmiaSulVincitore = pmiaRiga.quotaDelMigliore * 100;
  // Stessa relazione di "rapportoTempoSuPmia", ma capovolta ed espressa come
  // quota anziche' come moltiplicatore: evita di ripetere lo stesso "961" gia'
  // usato per il titolo (screen.getByText non tollera un secondo match) e
  // motiva comunque il blocco con un vero rapporto di tempo, non un rimando
  // generico alla frase precedente.
  const quotaTempoPmiaSulVincitore =
    vincitoreRiga.tempoS > 0 ? (pmiaRiga.tempoS / vincitoreRiga.tempoS) * 100 : null;

  return (
    <Box
      sx={{
        backgroundColor: tokens.color.softStone,
        borderRadius: tokens.radius.xl,
        p: 3,
      }}
    >
      <Typography
        sx={{
          fontFamily: tokens.font.display,
          fontSize: "24px",
          lineHeight: 1.35,
          color: tokens.color.nearBlack,
        }}
      >
        {vincitoreRiga.nome} vince per spread Monte Carlo, ma il margine sul
        secondo classificato, {secondoRiga.nome}, e' dello{" "}
        {formatPercent(margineSulSecondo)}
        {margineSullaBaseline !== null && (
          <>
            : persino {baselineRiga!.nome}, l'euristica piu' povera del
            confronto, resta a un margine dello {formatPercent(margineSullaBaseline)}
            , pur non stimando nulla e costando un tempo trascurabile
          </>
        )}
        {rapportoTempoSuPmia !== null && (
          <>
            . Il vincitore, per arrivarci, costa {formatNumber(rapportoTempoSuPmia)} volte il
            tempo di PMIA.
          </>
        )}
      </Typography>

      <Box
        data-testid="algoritmo-scelto"
        sx={{
          mt: 3,
          p: 2.5,
          backgroundColor: tokens.color.canvas,
          border: tokens.border.subtle,
          borderRadius: tokens.radius.md,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            fontFamily: tokens.font.mono,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: tokens.color.textMuted,
            mb: 1,
          }}
        >
          Algoritmo adottato per l'Atto III
        </Typography>
        <Typography sx={{ color: tokens.color.textPrimary, lineHeight: 1.6 }}>
          <strong>PMIA</strong>, non il vincitore per spread: raggiunge il{" "}
          {formatPercent(quotaPmiaSulVincitore)} dello spread del migliore in
          appena {formatDecimal(pmiaRiga.tempoS, 1)} s
          {quotaTempoPmiaSulVincitore !== null && (
            <> — il {formatPercent(quotaTempoPmiaSulVincitore, 2)} del tempo che serve al vincitore</>
          )}
          . La differenza di spread e' irrilevante; la differenza di tempo no.
        </Typography>
      </Box>
    </Box>
  );
}
