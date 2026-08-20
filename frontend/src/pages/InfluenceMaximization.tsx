import { Box, Skeleton, Typography } from "@mui/material";
import { useUrlNumber, useUrlString } from "../hooks/useUrlState.ts";
import { useDettaglioAccount } from "../hooks/useDettaglioAccount.ts";
import {
  useInfluenceSummaryQuery,
  useInfluenceGraphQuery,
  useInfluenceComparisonQuery,
  useInfluenceSeedsQuery,
} from "../api/queries.ts";
import AccountDetailModal from "../components/AccountDetailModal.tsx";
import PaginaCapitolo, { Sezione } from "../components/narrativa/PaginaCapitolo.tsx";
import BandaScura from "../components/narrativa/BandaScura.tsx";
import { useAttoInVista } from "../components/narrativa/useAttoInVista.ts";
import { ATTI } from "../components/influence/influenceContent.ts";
import { CAPITOLO_PROPAGAZIONE } from "../navigazione.ts";
import { formatNumber } from "../utils/format.ts";
import EsitoConfronto from "../components/influence/atto2/EsitoConfronto.tsx";
import GraficoCostoBeneficio from "../components/influence/atto2/GraficoCostoBeneficio.tsx";
import TabellaBenchmark from "../components/influence/atto2/TabellaBenchmark.tsx";
import AffidabilitaStimatori from "../components/influence/atto2/AffidabilitaStimatori.tsx";
import SovrapposizioneSeed from "../components/influence/atto2/SovrapposizioneSeed.tsx";
import EsitoCascata from "../components/influence/atto3/EsitoCascata.tsx";
import AndamentoStep from "../components/influence/atto3/AndamentoStep.tsx";
import ComposizioneRaggiunti from "../components/influence/atto3/ComposizioneRaggiunti.tsx";
import CanvasCascata from "../components/influence/atto3/CanvasCascata.tsx";
import ClassificheSeed from "../components/influence/atto3/ClassificheSeed.tsx";
import LimitiMetodologici from "../components/influence/atto4/LimitiMetodologici.tsx";
import ImpattoDis from "../components/influence/atto_impatto/ImpattoDis.tsx";
import { tokens } from "../theme.ts";

// Quanti seed per pagina chiedere all'API: lo stesso valore serve alla query,
// alla paginazione e al calcolo del numero di pagine, quindi vive qui una
// volta sola invece di essere ripetuto a mano in tre punti come prima.
const SEEDS_PER_PAGINA = 10;

// Altezza dei segnaposto mostrati mentre il confronto fra algoritmi e' in
// volo: approssima l'ingombro dei blocchi veri, cosi' la pagina non sobbalza
// quando i dati arrivano.
const ALTEZZA_SEGNAPOSTO = 300;

// I quattro atti nell'ordine in cui si leggono. Destrutturarli qui evita di
// indicizzare ATTI con numeri sparsi nel JSX.
const [ATTO_IMPATTO, ATTO_ALGORITMO, ATTO_CASCATA, ATTO_LIMITI] = ATTI;

/**
 * La sezione Influence Maximization come narrazione lineare in quattro atti:
 * il problema, la scelta dell'algoritmo, la cascata sul grafo reale, i limiti.
 *
 * Prima erano due tab separati — la simulazione e il confronto fra algoritmi —
 * e nessuno dei due spiegava l'altro: chi apriva la pagina vedeva dei risultati
 * senza sapere quale domanda avessero risposto. Scorrendo, invece, ogni atto
 * poggia sul precedente, e l'indice laterale tiene sempre visibile la mappa.
 *
 * Questa pagina non calcola nulla: tiene le quattro query, lo stato di
 * navigazione nella URL e il modale di dettaglio, e distribuisce i dati ai
 * componenti degli atti.
 */
export default function InfluenceMaximization() {
  // Seed selezionato e paginazione della classifica vivono nella URL: sono
  // stato di navigazione, quindi un link porta l'altro esattamente dove si e'
  // e il tasto Indietro del browser si comporta come ci si aspetta.
  const [selectedSeedId, setSelectedSeedId] = useUrlString("seed");
  const [seedsPage, setSeedsPage] = useUrlNumber("seedsPage", 1);
  const [seedsSearch, setSeedsSearch] = useUrlString("seedsQ");

  const { data: summary, isLoading: loadingSummary, isError: errorSummary } = useInfluenceSummaryQuery();
  const { data: graphData } = useInfluenceGraphQuery(selectedSeedId);
  const { data: comparisonData } = useInfluenceComparisonQuery();
  const { data: seedsRes, isLoading: seedsLoading } = useInfluenceSeedsQuery(
    seedsPage,
    SEEDS_PER_PAGINA,
    seedsSearch,
  );

  const attoAttivo = useAttoInVista(ATTI, true);

  const dettaglio = useDettaglioAccount();

  const handleSearchChange = (query: string) => {
    setSeedsSearch(query, { azzera: ["seedsPage"] });
  };

  const segnaposto = (
    <Skeleton
      variant="rectangular"
      height={ALTEZZA_SEGNAPOSTO}
      sx={{ borderRadius: tokens.radius.xl, backgroundColor: tokens.color.softStone }}
    />
  );

  const avvisoInfluenza = (
    <Box sx={{ p: 3, border: `1px dashed ${tokens.color.border}`, borderRadius: tokens.radius.xl,
      backgroundColor: tokens.color.surfaceStone }}>
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.textMuted }}>
        {loadingSummary ? "Caricamento dati influence maximization…" : "Dati influence maximization non disponibili (backend 503)."}
      </Typography>
    </Box>
  );

  const { meta, demographics, step_stats, top_seeds, top_targets } = summary ?? {};

  return (
    <>
      <PaginaCapitolo
        numero={CAPITOLO_PROPAGAZIONE.numero}
        capitolo={CAPITOLO_PROPAGAZIONE.etichetta}
        titolo={CAPITOLO_PROPAGAZIONE.titolo}
        guida={CAPITOLO_PROPAGAZIONE.guida}
        atti={ATTI}
        attoAttivo={attoAttivo}
      >
          <Sezione atto={ATTO_IMPATTO}>
            <ImpattoDis />
          </Sezione>

          <Sezione atto={ATTO_ALGORITMO}>
            {summary ? (
              comparisonData ? (
                <>
                  <EsitoConfronto
                    algoritmi={comparisonData.algorithms}
                    vincitore={comparisonData.winner_by_mc_spread}
                  />
                  <GraficoCostoBeneficio algoritmi={comparisonData.algorithms} />
                  <TabellaBenchmark algoritmi={comparisonData.algorithms} kRichiesto={comparisonData.k} />
                  <AffidabilitaStimatori algoritmi={comparisonData.algorithms} />
                  <SovrapposizioneSeed jaccard={comparisonData.seed_overlap_jaccard} />
                </>
              ) : segnaposto
            ) : avvisoInfluenza}
          </Sezione>

          <Sezione atto={ATTO_CASCATA}>
            {summary ? (
              <>
                <EsitoCascata meta={meta!} stepStats={step_stats!} demografia={demographics!} />
                <AndamentoStep stepStats={step_stats!} />
                <ComposizioneRaggiunti demografia={demographics!} />
                {graphData && (
                  <CanvasCascata
                    nodes={graphData.nodes}
                    links={graphData.links}
                    onSelectAccount={dettaglio.apri}
                    seedSelezionato={selectedSeedId || undefined}
                    onSelectSeed={setSelectedSeedId}
                    maxStep={meta!.num_steps}
                    topSeeds={top_seeds!}
                  />
                )}
                <ClassificheSeed
                  seeds={seedsRes?.seeds ?? []}
                  seedsTotal={seedsRes?.total ?? 0}
                  seedsLoading={seedsLoading}
                  seedsPage={seedsPage}
                  onSeedsPageChange={setSeedsPage}
                  seedsSearch={seedsSearch}
                  onSeedsSearchChange={handleSearchChange}
                  seedsPageSize={SEEDS_PER_PAGINA}
                  totalSeedCount={meta!.seeds}
                  selectedSeedId={selectedSeedId || undefined}
                  onSelectSeed={setSelectedSeedId}
                  onSelectAccount={dettaglio.apri}
                  targets={top_targets!}
                />
              </>
            ) : avvisoInfluenza}
          </Sezione>

        {summary && (
          <BandaScura
            larghezza="colonna"
            occhiello="Il risultato"
            titolo={`${meta!.reached_pct.toFixed(1)}% della rete raggiunto`}
            testo={
              `Partendo da ${formatNumber(meta!.seeds)} account seed, la cascata ne attiva ` +
              `${formatNumber(meta!.reached_nodes)} su ${formatNumber(meta!.nodes)} in ` +
              `${meta!.num_steps} passi. E' una singola realizzazione del processo, non un ` +
              `valore atteso: l'atto che segue spiega perche' la differenza conta.`
            }
            cifre={[
              { valore: formatNumber(meta!.seeds), etichetta: "Account seed" },
              { valore: formatNumber(meta!.reached_nodes), etichetta: "Nodi attivati" },
              { valore: String(meta!.num_steps), etichetta: "Passi della cascata" },
            ]}
          />
        )}

          <Sezione atto={ATTO_LIMITI}>
            <LimitiMetodologici />
          </Sezione>
      </PaginaCapitolo>

      <AccountDetailModal
        account={dettaglio.account}
        error={dettaglio.errore}
        open={dettaglio.aperto}
        onClose={dettaglio.chiudi}
        loading={dettaglio.caricamento}
      />
    </>
  );
}
