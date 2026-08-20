import { useEffect, useRef, useState, lazy, Suspense } from "react";
import type { MouseEvent } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  CircularProgress,
} from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "./theme.ts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});


import { Menu as MenuIcon } from "@mui/icons-material";

// Pagine in caricamento Lazy. I caricatori stanno in rotte.ts perche' li usa
// anche la sidebar, per anticipare il bundle quando il mouse sfiora una voce.
import {
  caricaAccounts,
  caricaDashboard,
  caricaDbSync,
  caricaDetection,
  caricaFactChecking,
  caricaInfluenceMaximization,
  caricaPipelines,
  caricaPostDetail,
  caricaPosts,
} from "./rotte.ts";

const Dashboard = lazy(caricaDashboard);
const Posts = lazy(caricaPosts);
const PostDetail = lazy(caricaPostDetail);
const Detection = lazy(caricaDetection);
const FactChecking = lazy(caricaFactChecking);
const Accounts = lazy(caricaAccounts);
const Pipelines = lazy(caricaPipelines);
const DbSync = lazy(caricaDbSync);
const InfluenceMaximization = lazy(caricaInfluenceMaximization);

import { NotificationProvider } from "./context/NotificationContext.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import EtichettaMono from "./components/narrativa/EtichettaMono.tsx";
import SidebarNavigazione from "./components/navigazione/SidebarNavigazione.tsx";
import {
  ID_NAVIGAZIONE_MOBILE,
  LARGHEZZA_RAIL,
  LARGHEZZA_SIDEBAR,
} from "./components/navigazione/misure.ts";
import { useCambioRotta } from "./hooks/useCambioRotta.ts";
import { tokens } from "./theme.ts";
import { capitoloDaRotta } from "./navigazione.ts";

/**
 * Reindirizza le vecchie rotte per detector al capitolo unificato.
 *
 * Le quattro pagine "IA:" erano lo stesso componente con un parametro diverso;
 * ora quel parametro e' un menu a tendina dentro un solo capitolo. I vecchi
 * indirizzi restano validi perche' erano condivisibili, e un segnalibro che si
 * apre su una pagina vuota e' peggio di una pagina cambiata.
 */
function RedirezioneDetector({ modello }: { modello?: string }) {
  const params = useParams<{ detector?: string }>();
  const scelto = modello ?? params.detector ?? "fastdetect";
  return <Navigate to={`/detection?modello=${scelto}`} replace />;
}

/**
 * Reindirizza il vecchio confronto fra detector all'Atto III del capitolo,
 * traducendo i parametri che ha cambiato nome.
 *
 * `page` e `filter` non potevano restare tali e quali: nella pagina unificata
 * `page` appartiene gia' all'elenco post dell'Atto II, e i due esploratori
 * convivono nella stessa URL. Senza questa traduzione un segnalibro con dei
 * filtri si aprirebbe sull'elenco completo, il che e' peggio di un errore
 * perche' sembra funzionare.
 */
function RedirezioneConfronto() {
  const [params] = useSearchParams();
  const destinazione = new URLSearchParams();

  const filtro = params.get("filter");
  if (filtro) destinazione.set("filtro", filtro);
  const pagina = params.get("page");
  if (pagina) destinazione.set("cpage", pagina);
  const ricerca = params.get("q");
  if (ricerca) destinazione.set("q", ricerca);

  const query = destinazione.toString();
  return <Navigate to={`/detection${query ? `?${query}` : ""}`} replace />;
}

/**
 * Indicatore del capitolo corrente nella barra superiore.
 *
 * Sostituisce una stringa fissa che era identica su tutte e dodici le pagine e
 * quindi non diceva nulla: qui la barra conferma in che punto della narrazione
 * ci si trova, con le stesse parole della sidebar.
 */
function CapitoloCorrente() {
  const location = useLocation();
  const capitolo = capitoloDaRotta(location.pathname);
  if (!capitolo) return null;

  return (
    <EtichettaMono colore={tokens.color.textMuted} sx={{ fontSize: "12px" }}>
      {capitolo.numero ? `Capitolo ${capitolo.numero} · ${capitolo.etichetta}` : capitolo.etichetta}
    </EtichettaMono>
  );
}

/**
 * Il guscio dell'applicazione: barra, navigazione, area contenuto, footer.
 *
 * Sta dentro il router e non attorno perche' `useCambioRotta` legge la rotta
 * corrente, e il ref che restituisce va sull'elemento `main` di questo stesso
 * albero.
 */
/** Ancora del contenuto principale, bersaglio del collegamento di salto. */
const ID_CONTENUTO_PRINCIPALE = "contenuto-principale";

function GuscioApplicazione() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const contenutoPrincipale = useCambioRotta();

  /**
   * Se la navigazione e' tenuta aperta per scelta.
   *
   * Vive qui e non nella sidebar perche' barra e area contenuto si dimensionano
   * su di lei: aperta per hover il pannello scorre *sopra* il contenuto e queste
   * misure non cambiano, ma bloccata la pagina gli fa spazio. Chi la blocca ha
   * chiesto che le etichette restino, non che un quinto della pagina resti
   * coperto.
   */
  const [navBloccata, setNavBloccata] = useState(false);
  const larghezzaNav = navBloccata ? LARGHEZZA_SIDEBAR : LARGHEZZA_RAIL;
  const primoRenderNav = useRef(true);

  /**
   * Bloccare la navigazione restringe l'area contenuto, e i grafici ECharts non
   * se ne accorgono da soli: si ridimensionano su `resize` della finestra, non
   * del proprio contenitore. Senza questo avviso il canvas del grafo resterebbe
   * disegnato alla larghezza precedente, riscalato dal CSS, fino al primo
   * ridimensionamento della finestra.
   *
   * L'evento parte dopo che il DOM ha la nuova larghezza, non prima: e' il
   * motivo per cui sta in un effect invece che dentro il gestore del clic.
   */
  useEffect(() => {
    if (primoRenderNav.current) {
      primoRenderNav.current = false;
      return;
    }
    window.dispatchEvent(new Event("resize"));
  }, [navBloccata]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
            <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: tokens.color.canvas }}>

          {/* Salta al contenuto: otto voci di navigazione precedono il contenuto
              nell'ordine di tabulazione, e senza questo collegamento chi naviga
              da tastiera le riattraversa a ogni pagina. Invisibile finche' non
              riceve il focus, che e' l'unico momento in cui serve.

              Il salto e' gestito a mano per la stessa ragione dell'indice degli
              atti: l'app monta un `HashRouter`, quindi l'hash della URL *e'* la
              rotta, e lasciar seguire al browser un `href="#..."` sostituirebbe
              "#/influence-maximization" con "#contenuto-principale" - nessuna
              rotta corrisponderebbe e il contenuto sparirebbe. L'`href` resta
              perche' e' cio' che rende questo elemento un collegamento per la
              tastiera e per gli screen reader. */}
          <Box
            component="a"
            href={`#${ID_CONTENUTO_PRINCIPALE}`}
            onClick={(evento: MouseEvent<HTMLAnchorElement>) => {
              evento.preventDefault();
              contenutoPrincipale.current?.focus();
            }}
            sx={{
              // `fixed` e non `absolute`: l'antenato posizionato piu' vicino e' il
              // blocco contenitore iniziale, quindi da assoluto il collegamento
              // comparirebbe in cima al *documento* - fuori dallo schermo per chi
              // lo mette a fuoco a pagina scorsa, cioe' proprio quando serve.
              position: "fixed",
              left: 8,
              top: -64,
              zIndex: (tema) => tema.zIndex.tooltip,
              px: 2,
              py: 1,
              borderRadius: tokens.radius.sm,
              backgroundColor: tokens.color.nearBlack,
              color: tokens.color.canvas,
              fontFamily: tokens.font.body,
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              transition: "top 0.15s ease",
              "&:focus-visible": { top: 8 },
            }}
          >
            Salta al contenuto
          </Box>

          {/* Top Bar */}
          <AppBar
            position="fixed"
            sx={{
              // Barra e contenuto seguono la navigazione *a riposo*: aperta al
              // passaggio del mouse il pannello scorre sopra di loro e non li
              // sposta. L'unico stato che li muove e' il blocco, che e' una
              // scelta esplicita e rara.
              width: { sm: `calc(100% - ${larghezzaNav}px)` },
              ml: { sm: `${larghezzaNav}px` },
              backgroundImage: "none",
              // Fondo pieno, non vetro. Era bianco al 90% con `backdrop-filter:
              // blur(8px)`: su un canvas bianco, con sotto contenuto bianco, il
              // vetro era indistinguibile da una barra opaca per quasi tutta la
              // pagina, e si vedeva solo quando ci passava sotto una superficie
              // scura - dove sfocava il grafo invece di tagliarlo netto. Costava
              // un livello di composizione per un effetto che DESIGN.md non
              // ammette e che qui non rendeva nulla.
              backgroundColor: tokens.color.canvas,
              color: tokens.color.textPrimary,
              boxShadow: "none",
              borderBottom: tokens.border.subtle,
              zIndex: (tema) => tema.zIndex.appBar,
            }}
          >
            <Toolbar sx={{ justifyContent: "space-between", height: "60px" }}>
              {/* Il nome cambia con lo stato e resta in italiano come il resto
                  dell'interfaccia: diceva "open drawer" anche a pannello aperto,
                  che e' l'unica stringa inglese della navigazione e la sola
                  informazione sbagliata che dava. */}
              <IconButton
                color="inherit"
                aria-label={mobileOpen ? "Chiudi la navigazione" : "Apri la navigazione"}
                aria-expanded={mobileOpen}
                aria-controls={ID_NAVIGAZIONE_MOBILE}
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { sm: "none" } }}
              >
                <MenuIcon />
              </IconButton>
              
              <CapitoloCorrente />
            </Toolbar>
          </AppBar>

          {/* Sidebar Navigation */}
          <SidebarNavigazione
            mobileAperta={mobileOpen}
            onChiudiMobile={() => setMobileOpen(false)}
            bloccata={navBloccata}
            onCambiaBlocco={() => setNavBloccata((precedente) => !precedente)}
          />

          {/* Main Content Area */}
          <Box
            component="main"
            id={ID_CONTENUTO_PRINCIPALE}
            ref={contenutoPrincipale}
            // `-1`: il contenuto puo' ricevere il focus quando la rotta cambia o
            // quando si segue il collegamento di salto, ma non e' un comando e
            // non deve comparire nell'ordine di tabulazione.
            tabIndex={-1}
            sx={{
              flexGrow: 1,
              width: { sm: `calc(100% - ${larghezzaNav}px)` },
              minHeight: "100vh",
              pt: { xs: 8, sm: 9 },
              display: "flex",
              flexDirection: "column",
              // Il focus programmatico non disegna l'anello: qui segnalerebbe
              // "sei all'inizio del contenuto" senza che nessuno lo abbia
              // chiesto, e l'anello del collegamento di salto e' gia' passato.
              outline: "none",
            }}
          >
            <Container maxWidth="xl" sx={{ flexGrow: 1, px: { xs: 2, sm: 4, md: 6 } }}>
              <Suspense
                fallback={
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
                    {/* Nero come `LoadingState`: erano due colori diversi per
                        lo stesso significato, e il coral qui non diceva "bot"
                        ne' nient'altro - era ornamento. */}
                    <CircularProgress sx={{ color: tokens.color.nearBlack }} />
                  </Box>
                }
              >
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/posts" element={<Posts />} />
                  <Route path="/posts/:id" element={<PostDetail />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/detection" element={<Detection />} />
                  <Route path="/influence-maximization" element={<InfluenceMaximization />} />
                  <Route path="/fact-check" element={<FactChecking />} />
                  <Route path="/pipelines" element={<Pipelines />} />
                  <Route path="/db-sync" element={<DbSync />} />

                  {/* Rotte precedenti al capitolo unificato: restano valide. */}
                  <Route path="/ai-detection" element={<RedirezioneDetector modello="fastdetect" />} />
                  <Route path="/ai-detection-binoculars" element={<RedirezioneDetector modello="binoculars" />} />
                  <Route path="/ai-detection-desklib" element={<RedirezioneDetector modello="desklib" />} />
                  <Route path="/ai-detection-ada" element={<RedirezioneDetector modello="ada" />} />
                  <Route path="/ai-detection/:detector" element={<RedirezioneDetector />} />
                  <Route path="/detector-comparison" element={<RedirezioneConfronto />} />

                  {/* Qualsiasi altro indirizzo torna alla panoramica invece di
                      lasciare l'area contenuto vuota senza spiegazione. */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Container>

            {/* Footer */}
            <Box
              component="footer"
              sx={{
                py: 4,
                px: 3,
                mt: "auto",
                borderTop: tokens.border.subtle,
                backgroundColor: tokens.color.canvas,
              }}
            >
              <Container maxWidth="xl" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontWeight: 500 }}>
                  SNM Project — Analisi del Fediverso: testo sintetico, bot e influenza
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontFamily: tokens.font.mono }}>
                  © {new Date().getFullYear()}
                </Typography>
              </Container>
            </Box>
          </Box>
        </Box>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <NotificationProvider>
            <CssBaseline />
            <HashRouter>
              <GuscioApplicazione />
            </HashRouter>
          </NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

