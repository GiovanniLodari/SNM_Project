import { Box, Skeleton, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import type { DetectorModelInfo } from "../../../api/client.ts";
import Blocco from "../../dati/Blocco.tsx";
import ClassificaBarre, { type VoceClassifica } from "../../dati/ClassificaBarre.tsx";
import LegendaVoce from "../../dati/LegendaVoce.tsx";
import { TINTA_NON_VALUTATO } from "../../dati/tinte.ts";
import { risolviModello } from "../../detection/detectionContent.ts";
import { ErrorState } from "../../States.tsx";
import { tokens } from "../../../theme.ts";
import { formatNumber, formatPercent, NON_DISPONIBILE } from "../../../utils/format.ts";

interface Props {
  modelli?: readonly DetectorModelInfo[];
  /** Post archiviati: il denominatore della copertura. */
  postTotali?: number;
  errore: boolean;
}

/**
 * Quanta parte del corpus e' passata sotto ciascun rilevatore, e con che esito.
 *
 * Chiude il capitolo perche' e' la cerniera con il successivo: le percentuali
 * del Capitolo II sono calcolate su questi denominatori, non sull'intero
 * corpus, e vederlo qui evita di leggerle piu' tardi come se riguardassero
 * tutto il materiale raccolto. La parte vuota di ogni barra e' esattamente cio'
 * di cui nessuno ha detto niente.
 */
export default function CoperturaRilevatori({ modelli, postTotali, errore }: Props) {
  if (errore) {
    return (
      <ErrorState message="Impossibile caricare la copertura dei rilevatori. Verificare che il backend sia in esecuzione." />
    );
  }

  if (!modelli || postTotali === undefined) {
    return (
      <Skeleton
        variant="rectangular"
        height={360}
        sx={{ borderRadius: tokens.radius.xl, backgroundColor: tokens.color.surfaceStone }}
      />
    );
  }

  const voci: VoceClassifica[] = modelli.map((modelloApi) => {
    const modello = risolviModello(modelloApi.id);
    const valutatiNonMarcati = Math.max(0, modelloApi.scored_count - modelloApi.ai_detected_count);
    return {
      chiave: modelloApi.id,
      etichetta: (
        <>
          <Typography
            component="span"
            sx={{ fontWeight: 600, fontSize: "15px", color: tokens.color.nearBlack }}
          >
            {modello.nome}
          </Typography>
          <Typography
            component="span"
            sx={{ fontFamily: tokens.font.mono, fontSize: "11px", color: tokens.color.textMuted }}
          >
            {modello.famiglia}
          </Typography>
        </>
      ),
      valore:
        modelloApi.ai_percentage != null
          ? `${formatPercent(modelloApi.ai_percentage)} sintetici`
          : NON_DISPONIBILE,
      segmenti: [
        {
          valore: modelloApi.ai_detected_count,
          colore: modello.accento,
          etichetta: `${modello.nome}: post marcati come sintetici`,
        },
        {
          valore: valutatiNonMarcati,
          colore: tokens.color.softStone,
          etichetta: `${modello.nome}: post valutati e non marcati`,
        },
      ],
      nota: `${formatNumber(modelloApi.scored_count)} post valutati su ${formatNumber(
        postTotali,
      )} archiviati · copertura ${formatPercent(
        postTotali > 0 ? (modelloApi.scored_count / postTotali) * 100 : 0,
      )}`,
    };
  });

  return (
    <Blocco
      occhiello="Cerniera col capitolo II"
      titolo="Quanto corpus ha visto ogni rilevatore"
      descrizione="Ogni barra copre l'intero archivio. La porzione colorata sono i post che quel modello marca come sintetici, quella chiara i post che ha valutato senza marcarli, e lo spazio rimasto vuoto e' il materiale su cui non si e' pronunciato: nessuno dei quattro ha letto tutto."
    >
      <ClassificaBarre voci={voci} totale={postTotali} vuoto="Nessun rilevatore ha ancora prodotto punteggi." />

      <Box sx={{ display: "flex", gap: 4, mt: 3, flexWrap: "wrap" }}>
        <LegendaVoce
          colore={tokens.color.softStone}
          titolo="Valutato, non marcato"
          testo="Il modello ha letto il post e lo ha lasciato passare"
        />
        <LegendaVoce
          colore={TINTA_NON_VALUTATO}
          titolo="Spazio vuoto"
          testo="Post che quel modello non ha mai valutato"
        />
      </Box>

      <Box sx={{ mt: 4, pt: 3, borderTop: tokens.border.subtle }}>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, mb: 1.5, maxWidth: "70ch" }}>
          Le quattro percentuali qui sopra non sono confrontabili fra loro senza cautela: sono
          calcolate su insiemi di post diversi, e nessuna di esse e&#39; una misura di accuratezza.
        </Typography>
        <Link
          to="/detection"
          style={{
            color: tokens.color.actionBlue,
            textDecoration: "underline",
            fontSize: "15px",
            fontWeight: 500,
          }}
        >
          Vai al Capitolo II: dove i quattro rilevatori non sono d&#39;accordo &rarr;
        </Link>
      </Box>
    </Blocco>
  );
}
