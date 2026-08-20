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
 * aggiunge un secondo fatto, altrettanto calcolato: anche `degree` — un
 * ordinamento per grado che non richiede alcuna simulazione ne' stima, quindi
 * a costo pressoche' nullo — resta a una distanza di spread comparabile.
 * Rincara la stessa tesi da un angolo diverso (il costo, non il rango: sui
 * dati reali `degree` e' il migliore dei non-vincitori dopo PMIA, non il piu'
 * povero — quello e' `SKIM`, staccato di oltre 22 punti), senza inventare un
 * secondo posto che i dati non assegnano a `degree`.
 */
export default function EsitoConfronto({ algoritmi, vincitore }: Props) {
  const righe = rapportoCostoBeneficio(algoritmi);
  const primoPerSpread = righe[0];
  const vincitoreRiga = righe.find((r) => r.nome === vincitore) ?? primoPerSpread;
  // "Secondo classificato" ha senso solo se `vincitore` coincide col primo per
  // spread reale (righe e' gia' ordinato decrescente). Il prop arriva dal
  // backend (`winner_by_mc_spread`), che ha perfino un default scritto a mano
  // ("CELF++") quando il dato manca: se non coincide, il presunto "secondo"
  // sarebbe in realta' chi vince, e il margine risulterebbe negativo pur
  // presentato come il vantaggio del vincitore. In quel caso la frase non va
  // resa: si dichiara l'incoerenza invece di calcolare un margine falso.
  const vincitoreCoincideConClassifica = vincitoreRiga?.nome === primoPerSpread?.nome;
  const secondoRiga = vincitoreCoincideConClassifica
    ? righe.find((r) => r.nome !== vincitoreRiga?.nome)
    : undefined;
  const pmiaRiga = righe.find((r) => r.nome === "PMIA");
  // Ordinamento per grado: nessuna simulazione, nessuna stima, costo
  // pressoche' nullo. Non e' il piu' debole per spread fra i non-vincitori
  // (quello e' SKIM, staccato di oltre 22 punti percentuali): interessa qui
  // solo perche' e' gratuito, non perche' sia in fondo alla classifica. Se
  // non e' presente nella run la frase la salta, senza inventare un valore.
  const baselineRiga = righe.find((r) => r.nome === "degree");

  if (!vincitoreRiga || !pmiaRiga) {
    return null;
  }

  // Le quote sono frazioni 0-1 (vedi influenceAnalysis.ts): ogni margine va
  // moltiplicato per 100 prima di passare a formatPercent, che si aspetta la
  // scala 0-100. null quando non c'e' un secondo classificato affidabile
  // (vincitore non coincidente col primo per spread, vedi sopra).
  const margineSulSecondo = secondoRiga
    ? (vincitoreRiga.quotaDelMigliore - secondoRiga.quotaDelMigliore) * 100
    : null;
  const margineSullaBaseline = baselineRiga
    ? (vincitoreRiga.quotaDelMigliore - baselineRiga.quotaDelMigliore) * 100
    : null;

  // Quante volte il tempo del vincitore sta nel tempo di PMIA: e' il costo che
  // il badge "vincitore" da solo non dice mai. Nessun rapporto se uno dei due
  // tempi manca dai dati (vedi influenceAnalysis.ts): un tempo assente non e'
  // uno zero, e un rapporto costruito su un dato mancante sarebbe inventato.
  const rapportoTempoSuPmia =
    typeof vincitoreRiga.tempoS === "number" &&
    typeof pmiaRiga.tempoS === "number" &&
    pmiaRiga.tempoS > 0
      ? Math.round(vincitoreRiga.tempoS / pmiaRiga.tempoS)
      : null;

  const quotaPmiaSulVincitore = pmiaRiga.quotaDelMigliore * 100;
  // Stessa relazione di "rapportoTempoSuPmia", ma capovolta ed espressa come
  // quota anziche' come moltiplicatore: evita di ripetere lo stesso "961" gia'
  // usato per il titolo (screen.getByText non tollera un secondo match) e
  // motiva comunque il blocco con un vero rapporto di tempo, non un rimando
  // generico alla frase precedente.
  const quotaTempoPmiaSulVincitore =
    typeof vincitoreRiga.tempoS === "number" &&
    typeof pmiaRiga.tempoS === "number" &&
    vincitoreRiga.tempoS > 0
      ? (pmiaRiga.tempoS / vincitoreRiga.tempoS) * 100
      : null;

  return (
    <Box
      sx={{
        backgroundColor: tokens.color.softStone,
        borderRadius: tokens.radius.xl,
        p: 3,
      }}
    >
      <Typography
        sx={{ ...tokens.type.affermazione, color: tokens.color.nearBlack }}
      >
        {secondoRiga && margineSulSecondo !== null ? (
          <>
            {vincitoreRiga.nome} vince per spread Monte Carlo, ma il margine sul
            secondo classificato, {secondoRiga.nome}, e' dello{" "}
            {formatPercent(margineSulSecondo)}
            {margineSullaBaseline !== null && (
              <>
                : persino un ordinamento per grado ({baselineRiga!.nome}), che non
                richiede alcuna simulazione ne' stima, resta a un margine dello{" "}
                {formatPercent(margineSullaBaseline)}, a un costo pressoche' nullo
              </>
            )}
          </>
        ) : (
          <>
            {vincitoreRiga.nome} e' indicato come vincitore, ma non e' il primo per spread Monte
            Carlo misurato in questa run{primoPerSpread ? ` (lo e' ${primoPerSpread.nome})` : ""}:
            qui non si riporta un margine sul secondo classificato, perche' sarebbe calcolato
            rispetto al posto sbagliato
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
