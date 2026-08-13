import { useState, type ReactNode } from "react";
import { Box, Grid, Skeleton, Typography } from "@mui/material";
import { useUrlNumber, useUrlString } from "../hooks/useUrlState.ts";
import { api, type AccountDetail } from "../api/client.ts";
import {
  useInfluenceSummaryQuery,
  useInfluenceGraphQuery,
  useInfluenceComparisonQuery,
  useInfluenceSeedsQuery,
} from "../api/queries.ts";
import AccountDetailModal from "../components/AccountDetailModal.tsx";
import IndiceAtti from "../components/influence/IndiceAtti.tsx";
import IntestazioneAtto from "../components/influence/IntestazioneAtto.tsx";
import { ATTI, OFFSET_INDICE_PX, type Atto } from "../components/influence/influenceContent.ts";
import { useAttoInVista } from "../components/influence/useAttoInVista.ts";
import SchedaProblema from "../components/influence/atto1/SchedaProblema.tsx";
import ConfrontoGrafi from "../components/influence/atto1/ConfrontoGrafi.tsx";
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
import { tokens } from "../theme.ts";

// Quanti seed per pagina chiedere all'API: lo stesso valore serve alla query,
// alla paginazione e al calcolo del numero di pagine, quindi vive qui una
// volta sola invece di essere ripetuto a mano in tre punti come prima.
const SEEDS_PER_PAGINA = 10;

// Altezza dei segnaposto mostrati mentre il confronto fra algoritmi e' in
// volo: approssima l'ingombro dei blocchi veri, cosi' la pagina non sobbalza
// quando i dati arrivano.
const ALTEZZA_SEGNAPOSTO = 300;

// Aria lasciata sopra il titolo quando si atterra su un'ancora dell'indice.
// Vale quanto il `top` sticky di IndiceAtti (OFFSET_INDICE_PX, definito una
// sola volta in influenceContent.ts), cosi' voce e sezione si allineano.
const OFFSET_ANCORA = `${OFFSET_INDICE_PX}px`;

// I quattro atti nell'ordine in cui si leggono. Destrutturarli qui evita di
// indicizzare ATTI con numeri sparsi nel JSX.
const [ATTO_PROBLEMA, ATTO_ALGORITMO, ATTO_CASCATA, ATTO_LIMITI] = ATTI;

/** Sezione di un atto: ancora per l'indice, intestazione e contenuti. */
function Sezione({ atto, children }: { atto: Atto; children: ReactNode }) {
  return (
    <Box
      component="section"
      id={atto.id}
      // Senza scrollMarginTop, saltando da un'ancora il titolo finirebbe a
      // filo del bordo superiore della finestra.
      sx={{ mb: 12, scrollMarginTop: OFFSET_ANCORA }}
    >
      <IntestazioneAtto atto={atto} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</Box>
    </Box>
  );
}

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

  // Le sezioni entrano nel DOM solo quando la summary e' arrivata: prima di
  // allora non c'e' niente da osservare per l'indice.
  const attoAttivo = useAttoInVista(Boolean(summary));

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalAccount, setModalAccount] = useState<AccountDetail | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleSelectAccount = (idString: string) => {
    const parsedId = parseInt(idString, 10);
    if (isNaN(parsedId)) return;

    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalAccount(null);
    api.accountDetail(parsedId)
      .then((res) => {
        if (res.account) {
          setModalAccount(res.account);
        } else {
          setModalError(`Nessun dettaglio in archivio per l'account #${parsedId}.`);
        }
      })
      .catch((err) => {
        // Senza questo stato il modale si apriva e spariva in silenzio.
        setModalError(
          err instanceof Error
            ? `Impossibile caricare i dettagli dell'account: ${err.message}`
            : "Impossibile caricare i dettagli dell'account.",
        );
      })
      .finally(() => setModalLoading(false));
  };

  const handleSearchChange = (query: string) => {
    setSeedsSearch(query);
    // La pagina 3 di una ricerca precedente non esiste quasi mai nella nuova.
    setSeedsPage(1);
  };

  if (loadingSummary) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 2, borderRadius: tokens.radius.md }} />
        <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 4, borderRadius: tokens.radius.xl }} />
        <Skeleton variant="rectangular" height={540} sx={{ borderRadius: tokens.radius.xl, backgroundColor: tokens.color.softStone }} />
      </Box>
    );
  }

  if (errorSummary || !summary) {
    return (
      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          Dati Influence Maximization non disponibili.
        </Typography>
      </Box>
    );
  }

  const { meta, demographics, step_stats, top_seeds, top_targets } = summary;
  // I blocchi che seguono leggono dal confronto, non dalla summary: finche' la
  // sua query non ha risposto mostrano un segnaposto. Renderli subito con dei
  // valori mancanti significherebbe aprire l'Atto I su una fila di "n/d".
  const segnaposto = (
    <Skeleton
      variant="rectangular"
      height={ALTEZZA_SEGNAPOSTO}
      sx={{ borderRadius: tokens.radius.xl, backgroundColor: tokens.color.softStone }}
    />
  );

  return (
    <Box sx={{ pb: 8 }}>
      <Grid container spacing={4}>
        {/* La colonna sparisce sotto md insieme all'indice che contiene:
            lasciarla vuota aggiungerebbe solo un salto di spaziatura. */}
        <Grid item xs={12} md={3} sx={{ display: { xs: "none", md: "block" } }}>
          <IndiceAtti attivo={attoAttivo} />
        </Grid>

        <Grid item xs={12} md={9}>
          <Box component="header" sx={{ mb: 8 }}>
            <Typography
              variant="h1"
              sx={{
                fontFamily: tokens.font.display,
                fontWeight: 400,
                fontSize: { xs: "32px", md: "48px" },
                letterSpacing: "-1.2px",
                lineHeight: 1.05,
                color: tokens.color.nearBlack,
                mb: 2,
              }}
            >
              Propagazione e penetrazione del grafo sociale
            </Typography>
            <Typography sx={{ color: tokens.color.textMuted, maxWidth: "68ch", lineHeight: 1.6 }}>
              Quattro atti: che problema si sta risolvendo, quale algoritmo conviene usare, fin dove
              arriva la cascata sul grafo Mastodon reale e cosa questi numeri non dimostrano.
            </Typography>
          </Box>

          <Sezione atto={ATTO_PROBLEMA}>
            <SchedaProblema params={comparisonData?.params ?? null} />
            {comparisonData ? (
              <ConfrontoGrafi
                nodiCompleto={meta.nodes}
                archiCompleto={meta.edges}
                nodiSottografo={comparisonData.subgraph.nodes}
                archiSottografo={comparisonData.subgraph.edges}
                candidati={comparisonData.subgraph.candidates}
                kRichiesto={comparisonData.k}
              />
            ) : (
              segnaposto
            )}
          </Sezione>

          <Sezione atto={ATTO_ALGORITMO}>
            {comparisonData ? (
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
            ) : (
              segnaposto
            )}
          </Sezione>

          <Sezione atto={ATTO_CASCATA}>
            <EsitoCascata meta={meta} stepStats={step_stats} demografia={demographics} />
            <AndamentoStep stepStats={step_stats} />
            <ComposizioneRaggiunti demografia={demographics} />
            {graphData && (
              <CanvasCascata
                nodes={graphData.nodes}
                links={graphData.links}
                onSelectAccount={handleSelectAccount}
                seedSelezionato={selectedSeedId || undefined}
                onSelectSeed={setSelectedSeedId}
                maxStep={meta.num_steps}
                topSeeds={top_seeds}
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
              totalSeedCount={meta.seeds}
              selectedSeedId={selectedSeedId || undefined}
              onSelectSeed={setSelectedSeedId}
              onSelectAccount={handleSelectAccount}
              targets={top_targets}
            />
          </Sezione>

          <Sezione atto={ATTO_LIMITI}>
            <LimitiMetodologici />
          </Sezione>
        </Grid>
      </Grid>

      <AccountDetailModal
        account={modalAccount}
        error={modalError}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalAccount(null);
          setModalError(null);
        }}
        loading={modalLoading}
      />
    </Box>
  );
}
