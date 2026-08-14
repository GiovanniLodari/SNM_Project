import { useState } from "react";
import { Box, Grid, Skeleton, Typography } from "@mui/material";
import {
  useAiDetectionQuery,
  useDetectorComparisonSummaryQuery,
  useDetectorComparisonPostsQuery,
} from "../api/queries.ts";
import { useUrlList, useUrlNumber, useUrlString } from "../hooks/useUrlState.ts";
import { useDebounce } from "../hooks/useDebounce.ts";
import PaginaCapitolo, { Sezione } from "../components/narrativa/PaginaCapitolo.tsx";
import BandaScura from "../components/narrativa/BandaScura.tsx";
import { useAttoInVista } from "../components/narrativa/useAttoInVista.ts";
import { DetectorSankeyChart } from "../components/DetectorSankeyChart.tsx";
import StatsModal from "../components/StatsModal.tsx";
import { ErrorState } from "../components/States.tsx";
import SchedeModelli from "../components/detection/atto1/SchedeModelli.tsx";
import SelettoreModello from "../components/detection/atto2/SelettoreModello.tsx";
import RiepilogoModello from "../components/detection/atto2/RiepilogoModello.tsx";
import EsploratoreScaglioni from "../components/detection/atto2/EsploratoreScaglioni.tsx";
import ElencoPost from "../components/detection/atto2/ElencoPost.tsx";
import ConsensoKpi from "../components/detection/atto3/ConsensoKpi.tsx";
import AccordoCoppie from "../components/detection/atto3/AccordoCoppie.tsx";
import DistribuzioneConsenso from "../components/detection/atto3/DistribuzioneConsenso.tsx";
import IndagineBot from "../components/detection/atto3/IndagineBot.tsx";
import EsploratoreMultiDetector from "../components/detection/atto3/EsploratoreMultiDetector.tsx";
import {
  ATTI_DETECTION,
  MODELLO_PREDEFINITO,
  risolviModello,
  type IdModello,
} from "../components/detection/detectionContent.ts";
import { CAPITOLO_TESTO_SINTETICO } from "../navigazione.ts";
import { tokens } from "../theme.ts";
import { formatNumber } from "../utils/format.ts";

const [ATTO_RILEVATORI, ATTO_MODELLO, ATTO_CONFRONTO] = ATTI_DETECTION;

/** Post per pagina nell'esploratore multi-detector dell'Atto III. */
const POST_PER_PAGINA_CONFRONTO = 15;

/**
 * Filtri dell'Atto II che dipendono dal modello scelto. Cambiando rilevatore
 * vanno azzerati nella stessa scrittura della URL: la pagina 7 dei post di un
 * modello non corrisponde ad alcuna pagina significativa di un altro, e due
 * setter separati si sovrascriverebbero (vedi OpzioniScrittura in useUrlState).
 */
const FILTRI_DEL_MODELLO = ["page", "bucket", "sort", "scaglione", "pscaglione"];

/**
 * Il capitolo sul testo sintetico, in tre atti: come funzionano i quattro
 * rilevatori, cosa vede ciascuno preso da solo, dove le loro risposte
 * divergono.
 *
 * Prima erano cinque voci di navigazione. Quattro aprivano lo stesso
 * componente cambiando un parametro - stessa impaginazione, stessi titoli,
 * stessa struttura, solo con dei numeri diversi - e la quinta metteva a
 * confronto i risultati senza che nulla dicesse a chi leggeva che stava
 * guardando gli stessi post di prima. La scelta del rilevatore e' ora un menu a
 * tendina dentro l'Atto II, e il confronto e' l'atto che chiude il capitolo:
 * comparare due modelli non richiede piu' di ricordare a memoria le cifre della
 * pagina precedente.
 */
export default function Detection() {
  // Tutto lo stato di navigazione vive nella URL: la vista resta condivisibile
  // e il tasto Indietro ripercorre modelli, fasce e filtri.
  const [chiaveModello, setChiaveModello] = useUrlString("modello", MODELLO_PREDEFINITO);
  const [quartili, setQuartili] = useUrlList("bucket");
  const [ordinamento, setOrdinamento] = useUrlString("sort", "id");
  const [pagina, setPagina] = useUrlNumber("page", 1);
  const [scaglione, setScaglione] = useUrlString("scaglione", "");
  const [paginaScaglione, setPaginaScaglione] = useUrlNumber("pscaglione", 1);

  const [filtroConfronto, setFiltroConfronto] = useUrlString("filtro", "all");
  const [paginaConfronto, setPaginaConfronto] = useUrlNumber("cpage", 1);
  const [ricerca, setRicerca] = useUrlString("q");
  const ricercaRitardata = useDebounce(ricerca, 400);

  const [statisticheAperte, setStatisticheAperte] = useState(false);

  const modello = risolviModello(chiaveModello);

  const {
    data: datiModello,
    isLoading: caricamentoModello,
    isError: erroreModello,
  } = useAiDetectionQuery(quartili, pagina, ordinamento, modello.id);

  const { data: sintesi, isError: erroreSintesi } = useDetectorComparisonSummaryQuery();

  const {
    data: postConfronto,
    isLoading: caricamentoConfronto,
    isError: erroreConfronto,
  } = useDetectorComparisonPostsQuery(
    filtroConfronto,
    paginaConfronto,
    POST_PER_PAGINA_CONFRONTO,
    ricercaRitardata,
  );

  const attoAttivo = useAttoInVista(ATTI_DETECTION, true);

  const cambiaModello = (id: IdModello) => {
    setChiaveModello(id, { azzera: FILTRI_DEL_MODELLO });
  };

  const cambiaQuartile = (quartile: string) => {
    const prossimi = quartili.includes(quartile)
      ? quartili.filter((q) => q !== quartile)
      : [...quartili, quartile];
    setQuartili(prossimi, { azzera: ["page"] });
  };

  const segnaposto = (
    <Skeleton
      variant="rectangular"
      height={280}
      sx={{ borderRadius: tokens.radius.xl, backgroundColor: tokens.color.softStone }}
    />
  );

  return (
    <>
      <PaginaCapitolo
        numero={CAPITOLO_TESTO_SINTETICO.numero}
        capitolo={CAPITOLO_TESTO_SINTETICO.etichetta}
        titolo={CAPITOLO_TESTO_SINTETICO.titolo}
        guida={CAPITOLO_TESTO_SINTETICO.guida}
        atti={ATTI_DETECTION}
        attoAttivo={attoAttivo}
      >
        <Sezione atto={ATTO_RILEVATORI}>
          <SchedeModelli conteggi={sintesi?.models} />
        </Sezione>

        <Sezione atto={ATTO_MODELLO}>
          <SelettoreModello modello={modello} onChange={cambiaModello} />

          {erroreModello ? (
            <ErrorState message={`Impossibile caricare i risultati di ${modello.nome}.`} />
          ) : !datiModello ? (
            segnaposto
          ) : (
            <>
              <RiepilogoModello
                dati={datiModello}
                modello={modello}
                onApriStatistiche={() => setStatisticheAperte(true)}
              />

              {datiModello.bucket_samples && (
                <EsploratoreScaglioni
                  campioni={datiModello.bucket_samples}
                  modello={modello}
                  scaglioneAttivo={scaglione}
                  onCambiaScaglione={(nome) => setScaglione(nome, { azzera: ["pscaglione"] })}
                  pagina={paginaScaglione}
                  onCambiaPagina={setPaginaScaglione}
                />
              )}
            </>
          )}

          <ElencoPost
            dati={datiModello}
            modello={modello}
            caricamento={caricamentoModello && !datiModello}
            errore={erroreModello}
            ordinamento={ordinamento}
            onCambiaOrdinamento={(valore) => setOrdinamento(valore, { azzera: ["page"] })}
            quartiliSelezionati={quartili}
            onCambiaQuartile={cambiaQuartile}
            pagina={pagina}
            onCambiaPagina={setPagina}
          />
        </Sezione>

        {/* Il passaggio dal singolo modello al confronto: e' la cifra che
            giustifica l'atto seguente, quindi sta fra i due invece che dentro
            uno dei due. */}
        {sintesi?.comparison_report?.accordo?.tutti_e_4_stessa_etichetta != null &&
          sintesi.comparison_report.id_totali > 0 && (
            <BandaScura
              larghezza="colonna"
              occhiello="Il punto della questione"
              titolo={`I quattro concordano sul ${(
                (sintesi.comparison_report.accordo.tutti_e_4_stessa_etichetta /
                  sintesi.comparison_report.id_totali) *
                100
              ).toFixed(1)}% dei post`}
              testo={
                "Sul resto del corpus almeno uno dei quattro rilevatori dice il contrario degli " +
                "altri. Senza una verita' di riferimento nessuno dei quattro puo' essere " +
                "dichiarato nel giusto: quello che si puo' fare e' guardare dove e perche' si " +
                "separano."
              }
              cifre={[
                {
                  valore: formatNumber(sintesi.comparison_report.id_totali),
                  etichetta: "Post nel campione condiviso",
                },
                {
                  valore: formatNumber(
                    sintesi.comparison_report.id_totali -
                      sintesi.comparison_report.accordo.tutti_e_4_stessa_etichetta,
                  ),
                  etichetta: "Post su cui non c'e' accordo",
                },
              ]}
            />
          )}

        <Sezione atto={ATTO_CONFRONTO}>
          {erroreSintesi ? (
            <ErrorState message="Impossibile caricare il confronto fra rilevatori. Verificare che il backend sia in esecuzione." />
          ) : !sintesi ? (
            segnaposto
          ) : (
            <>
              <ConsensoKpi report={sintesi.comparison_report} />
              <DetectorSankeyChart flussi={sintesi.comparison_report?.flussi_consenso} />
              <Grid container spacing={4}>
                <Grid item xs={12} lg={6}>
                  <AccordoCoppie report={sintesi.comparison_report} />
                </Grid>
                <Grid item xs={12} lg={6}>
                  <DistribuzioneConsenso report={sintesi.comparison_report} />
                </Grid>
              </Grid>
              <IndagineBot indagine={sintesi.bot_investigation} />
            </>
          )}

          <EsploratoreMultiDetector
            post={postConfronto?.posts ?? []}
            totale={postConfronto?.total ?? 0}
            caricamento={caricamentoConfronto && !postConfronto}
            errore={erroreConfronto}
            filtro={filtroConfronto}
            onCambiaFiltro={(valore) => setFiltroConfronto(valore, { azzera: ["cpage"] })}
            ricerca={ricerca}
            onCambiaRicerca={(valore) => setRicerca(valore, { azzera: ["cpage"] })}
            pagina={paginaConfronto}
            onCambiaPagina={setPaginaConfronto}
            postPerPagina={POST_PER_PAGINA_CONFRONTO}
          />
        </Sezione>

        {/* Chiusura del capitolo: la stessa avvertenza che apre l'Atto I,
            ripetuta qui perche' e' la conclusione che i numeri autorizzano. */}
        <Box sx={{ borderTop: tokens.border.subtle, pt: 4 }}>
          <Typography variant="body2" sx={{ color: tokens.color.textMuted, maxWidth: "70ch" }}>
            Nessuna delle cifre di questo capitolo e&#39; una misura di accuratezza: senza post
            etichettati a mano non esiste un metro con cui dire quale dei quattro rilevatori
            sbagli meno. Quello che si e&#39; misurato e&#39; la loro concordanza, che e&#39; una
            cosa diversa.
          </Typography>
        </Box>
      </PaginaCapitolo>

      <StatsModal
        open={statisticheAperte}
        onClose={() => setStatisticheAperte(false)}
        stats={datiModello?.stats}
        detectorLabel={`${modello.nome} (${modello.famiglia})`}
      />
    </>
  );
}
