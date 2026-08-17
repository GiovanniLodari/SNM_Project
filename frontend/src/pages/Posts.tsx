import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import {
  useCorpusQuery,
  useDetectorComparisonSummaryQuery,
  usePostsInfiniteQuery,
} from "../api/queries.ts";
import PaginaCapitolo, { Sezione } from "../components/narrativa/PaginaCapitolo.tsx";
import BandaScura from "../components/narrativa/BandaScura.tsx";
import { useAttoInVista } from "../components/narrativa/useAttoInVista.ts";
import ComposizioneCorpus from "../components/corpus/atto1/ComposizioneCorpus.tsx";
import FiltriCorpus from "../components/corpus/atto2/FiltriCorpus.tsx";
import ElencoCorpus from "../components/corpus/atto2/ElencoCorpus.tsx";
import CoperturaRilevatori from "../components/corpus/atto3/CoperturaRilevatori.tsx";
import { ATTI_CORPUS } from "../components/corpus/corpusContent.ts";
import { CAPITOLO_CORPUS } from "../navigazione.ts";
import { tokens } from "../theme.ts";
import { formatNumber, formatPercent } from "../utils/format.ts";
import { useUrlList, useUrlNumber, useUrlString } from "../hooks/useUrlState.ts";
import { useDebounce } from "../hooks/useDebounce.ts";
import { useSentinella } from "../hooks/useSentinella.ts";

const [ATTO_COMPOSIZIONE, ATTO_ARCHIVIO, ATTO_GIUDIZIO] = ATTI_CORPUS;

/**
 * Tetto ai blocchi che la URL puo' chiedere di ripristinare. Senza, un
 * indirizzo con `?pagine=5000` innescherebbe cinquemila richieste in fila al
 * caricamento della pagina.
 */
const MAX_BLOCCHI = 200;

/**
 * Filtri dell'archivio. Cambiandone uno il conteggio dei blocchi torna a 1
 * nella STESSA scrittura della URL: due setter separati si sovrascriverebbero
 * (vedi OpzioniScrittura in useUrlState) e il reset andrebbe perso.
 */
const AZZERA_BLOCCHI = { azzera: ["pagine"] };

/**
 * Il capitolo sul corpus, in tre atti: di che materiale e' fatto, com'e' fatto
 * un post alla volta, e quanta parte di esso e' poi finita sotto i rilevatori.
 *
 * Era un elenco con una colonna di caselle di spunta: mostrava i post senza
 * dire mai di che cosa fossero un campione - quante lingue, quante istanze,
 * quale arco di tempo - e chiudeva senza spiegare che rapporto avesse con il
 * capitolo seguente. Le tre domande adesso sono dichiarate, e l'archivio resta
 * dove serve, in mezzo, con la larghezza intera invece di nove dodicesimi.
 */
export default function Posts() {
  // Tutto lo stato di navigazione vive nella URL: la vista resta condivisibile
  // e il tasto Indietro ripercorre i filtri invece di uscire dalla pagina.
  const [lingue, setLingue] = useUrlList("lang");
  const [ricerca, setRicerca] = useUrlString("q");
  const [autore, setAutore] = useUrlString("autore", "tutti");
  const [ordinamento, setOrdinamento] = useUrlString("ordine", "archivio");
  const [postPerBlocco, setPostPerBlocco] = useUrlNumber("size", 10);
  // Quanti blocchi mostrare. Ha preso il posto del numero di pagina: l'elenco
  // ora si accumula, ma il conteggio resta nella URL perche' tornando indietro
  // da un post si deve ritrovare l'elenco lungo com'era, non riportato in cima.
  const [blocchiRichiesti, setBlocchiRichiesti] = useUrlNumber("pagine", 1);

  // La ricerca non parte a ogni tasto premuto: altrimenti scrivere "elezioni"
  // sarebbero otto richieste, di cui sette gia' obsolete quando arrivano.
  const ricercaRitardata = useDebounce(ricerca, 400);

  const filtri = {
    lang: lingue,
    pageSize: postPerBlocco,
    search: ricercaRitardata,
    author: autore,
    order: ordinamento,
  };

  const {
    data,
    isLoading,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePostsInfiniteQuery(filtri);

  const { data: corpus, isError: erroreCorpus } = useCorpusQuery();
  const { data: sintesi, isError: erroreSintesi } = useDetectorComparisonSummaryQuery();

  const blocchiCaricati = data?.pages.length ?? 0;
  const daMostrare = Math.min(Math.max(1, blocchiRichiesti), MAX_BLOCCHI);
  const post = data?.pages.flatMap((blocco) => blocco.posts) ?? [];
  const lingueDisponibili = data?.pages[0]?.available_langs ?? [];
  const totaleFiltrato = data?.pages[0]?.total_count;

  // Vero mentre l'elenco viene ricostruito da capo dopo un cambio di filtro,
  // con quello vecchio ancora a schermo: basta un filetto di avanzamento e un
  // velo, non uno spinner che sostituisce tutto (DESIGN.md non usa spinner:
  // superfici piatte e filetti sottili). Il caricamento di un blocco in coda
  // non conta: ha un indicatore suo, in fondo all'elenco.
  const staAggiornando = isFetching && !isFetchingNextPage && blocchiCaricati > 0;

  // Unico punto in cui si chiede altro contenuto: sia la sentinella sia il
  // bottone si limitano ad alzare il numero di blocchi richiesti, e questo
  // effetto allinea il caricato al richiesto. Averne uno solo e' cio' che
  // permette alla URL di ripristinare un elenco lungo senza una seconda
  // strada che faccia la stessa cosa in modo leggermente diverso.
  useEffect(() => {
    if (blocchiCaricati === 0 || blocchiCaricati >= daMostrare) return;
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage();
  }, [blocchiCaricati, daMostrare, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Il tetto entra nella condizione invece di limitarsi a tagliare il valore:
  // altrimenti a duemila post il bottone resterebbe a schermo senza fare piu'
  // nulla, che e' peggio che non averlo.
  const altroDisponibile = hasNextPage === true && blocchiCaricati < MAX_BLOCCHI;

  const caricaAltro = () => {
    if (!altroDisponibile || isFetchingNextPage) return;
    setBlocchiRichiesti(blocchiCaricati + 1);
  };

  const sentinella = useSentinella(altroDisponibile && !isFetchingNextPage, caricaAltro);

  // Lo scroll in cima segue il cambio dei filtri, non il caricamento. La
  // dipendenza e' una stringa e non gli array dei filtri: `useUrlList` ne
  // costruisce uno nuovo a ogni modifica della URL, quindi anche il bottone
  // "carica altri" - che scrive `pagine` - riportava la lettura in cima.
  const chiaveFiltri = `${lingue.join(",")}|${ricercaRitardata}|${autore}|${ordinamento}|${postPerBlocco}`;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [chiaveFiltri]);

  const cambiaLingua = (codice: string) => {
    const prossime = lingue.includes(codice)
      ? lingue.filter((lingua) => lingua !== codice)
      : [...lingue, codice];
    setLingue(prossime, AZZERA_BLOCCHI);
  };

  const azzeraFiltri = () => {
    // Una sola scrittura per tre parametri: separate, si sovrascriverebbero.
    setLingue([], { azzera: ["pagine", "q", "autore"] });
  };

  const attoAttivo = useAttoInVista(ATTI_CORPUS, true);

  const quotaBot =
    corpus && corpus.posts_total > 0 ? (corpus.posts_bot / corpus.posts_total) * 100 : null;

  return (
    <PaginaCapitolo
      numero={CAPITOLO_CORPUS.numero}
      capitolo={CAPITOLO_CORPUS.etichetta}
      titolo="I post raccolti dal Fediverso"
      guida="Il materiale grezzo del progetto, prima che qualsiasi modello lo giudichi: da dove viene, che forma ha, e quanta parte di esso e' poi finita sotto gli occhi dei rilevatori."
      atti={ATTI_CORPUS}
      attoAttivo={attoAttivo}
    >
      <Sezione atto={ATTO_COMPOSIZIONE}>
        {erroreCorpus ? (
          <Typography variant="body2" sx={{ color: tokens.color.danger }}>
            Impossibile caricare la composizione del corpus. Verificare che il backend sia in
            esecuzione.
          </Typography>
        ) : (
          <ComposizioneCorpus dati={corpus} />
        )}
      </Sezione>

      {/* La cifra che giustifica l'atto seguente sta fra i due, non dentro uno
          dei due: e' il passaggio dal corpus come insieme al corpus come
          singoli post da leggere. */}
      {corpus && quotaBot != null && (
        <BandaScura
          larghezza="colonna"
          occhiello="Il materiale grezzo"
          titolo={`${formatNumber(corpus.posts_total)} post, e nessuno ancora giudicato`}
          testo={
            "Da qui in avanti tutto il progetto lavora su questo insieme. L'unica etichetta gia' " +
            "presente e' quella che gli account si sono dati da soli: dichiararsi bot non dice " +
            "come sia stato scritto il testo, ed e' esattamente la distanza che i capitoli " +
            "successivi provano a misurare."
          }
          // Cifre che non ripetono quelle dell'Atto I: la banda aggiunge, non
          // riassume.
          cifre={[
            { valore: formatPercent(quotaBot), etichetta: "Post da account dichiarati bot" },
            {
              valore: formatNumber(corpus.posts_senza_lingua),
              etichetta: "Post che non dichiarano una lingua",
            },
          ]}
        />
      )}

      <Sezione atto={ATTO_ARCHIVIO}>
        <FiltriCorpus
          lingueDisponibili={lingueDisponibili}
          lingueSelezionate={lingue}
          onCambiaLingua={cambiaLingua}
          onAzzeraFiltri={azzeraFiltri}
          ricerca={ricerca}
          onCambiaRicerca={(valore) => setRicerca(valore, AZZERA_BLOCCHI)}
          autore={autore}
          onCambiaAutore={(valore) => setAutore(valore, AZZERA_BLOCCHI)}
          ordinamento={ordinamento}
          onCambiaOrdinamento={(valore) => setOrdinamento(valore, AZZERA_BLOCCHI)}
          risultati={totaleFiltrato}
        />

        <ElencoCorpus
          ref={sentinella}
          post={post}
          errore={isError}
          caricamentoIniziale={isLoading && !data}
          staAggiornando={staAggiornando}
          caricandoAltro={isFetchingNextPage}
          altroDisponibile={altroDisponibile}
          onCaricaAltro={caricaAltro}
          postPerBlocco={postPerBlocco}
          onCambiaPostPerBlocco={(valore) => setPostPerBlocco(valore, AZZERA_BLOCCHI)}
          totale={totaleFiltrato}
          avvisoLimite={
            hasNextPage && blocchiCaricati >= MAX_BLOCCHI
              ? `Raggiunto il limite di ${formatNumber(
                  MAX_BLOCCHI * postPerBlocco,
                )} post per sessione. Restringi con un filtro per vedere il resto.`
              : null
          }
        />
      </Sezione>

      <Sezione atto={ATTO_GIUDIZIO}>
        <CoperturaRilevatori
          modelli={sintesi?.models}
          postTotali={corpus?.posts_total}
          errore={erroreSintesi}
        />
      </Sezione>

      {/* Chiusura del capitolo: cosa questo corpus non e'. */}
      <Box sx={{ borderTop: tokens.border.subtle, pt: 4 }}>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, maxWidth: "70ch" }}>
          Il corpus non e&#39; un campione rappresentativo del Fediverso: il crawler parte da un
          elenco di argomenti e segue le istanze che trova, quindi lingue e comunita&#39; qui
          rappresentate dipendono da quel punto di partenza. Le cifre di questa pagina descrivono
          cio&#39; che e&#39; stato raccolto, non cio&#39; che esiste.
        </Typography>
      </Box>
    </PaginaCapitolo>
  );
}
