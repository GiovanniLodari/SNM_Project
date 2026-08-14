import { useState, lazy, Suspense, type FocusEvent } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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

// Pagine in caricamento Lazy con loader tracciati per il prefetch istantaneo
const loadDashboard = () => import("./pages/Dashboard.tsx");
const loadPosts = () => import("./pages/Posts.tsx");
const loadPostDetail = () => import("./pages/PostDetail.tsx");
const loadDetection = () => import("./pages/Detection.tsx");
const loadFactChecking = () => import("./pages/FactChecking.tsx");
const loadAccounts = () => import("./pages/Accounts.tsx");
const loadPipelines = () => import("./pages/Pipelines.tsx");
const loadDbSync = () => import("./pages/DbSync.tsx");
const loadInfluenceMaximization = () => import("./pages/InfluenceMaximization.tsx");

const Dashboard = lazy(loadDashboard);
const Posts = lazy(loadPosts);
const PostDetail = lazy(loadPostDetail);
const Detection = lazy(loadDetection);
const FactChecking = lazy(loadFactChecking);
const Accounts = lazy(loadAccounts);
const Pipelines = lazy(loadPipelines);
const DbSync = lazy(loadDbSync);
const InfluenceMaximization = lazy(loadInfluenceMaximization);

const routeLoaders: Record<string, () => Promise<unknown>> = {
  "/": loadDashboard,
  "/posts": loadPosts,
  "/accounts": loadAccounts,
  "/detection": loadDetection,
  "/fact-check": loadFactChecking,
  "/influence-maximization": loadInfluenceMaximization,
  "/pipelines": loadPipelines,
  "/db-sync": loadDbSync,
};

import { NotificationProvider } from "./context/NotificationContext.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import EtichettaMono from "./components/narrativa/EtichettaMono.tsx";
import { tokens } from "./theme.ts";
import { isRouteActive } from "./utils/navigation.ts";
import { prefetchRouteData } from "./api/queries.ts";
import { CAPITOLI, capitoloDaRotta } from "./navigazione.ts";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Larghezza della sidebar aperta e a riposo.
 *
 * A riposo resta la colonna delle icone; l'area contenuto e' dimensionata su
 * quella misura e non si muove mai, perche' la sidebar aperta scorre *sopra* il
 * contenuto invece di spingerlo. Spingerlo significherebbe ricalcolare il
 * layout dell'intera pagina a ogni passaggio del mouse - e su questa
 * applicazione vuol dire ridisegnare il canvas del grafo e i grafici recharts,
 * che sarebbe visibilmente lento oltre che inutile.
 */
const LARGHEZZA_APERTA = 270;
const LARGHEZZA_RIPOSO = 76;

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

interface PropsNavigazione {
  /** Chiude il pannello temporaneo su mobile dopo un clic. */
  onNavigate?: () => void;
  /**
   * Sul desktop la sidebar sta a riposo come colonna di sole icone e si apre
   * al passaggio del mouse. Sul pannello mobile e' sempre `true`: li' non
   * esiste il passaggio del mouse, e una colonna di icone mute sarebbe
   * l'unica navigazione disponibile.
   */
  espansa?: boolean;
}

function NavigationContent({ onNavigate, espansa = true }: PropsNavigazione) {
  const location = useLocation();
  const queryClient = useQueryClient();

  const handlePrefetch = (path: string) => {
    // 1. Pre-scarica il bundle JS del componente lazy
    if (routeLoaders[path]) {
      routeLoaders[path]();
    }
    // 2. Pre-scarica i dati delle API via TanStack Query
    prefetchRouteData(queryClient, path);
  };

  // Le etichette restano sempre nel DOM e si limitano a sfumare: nasconderle
  // con `display: none` le toglierebbe anche agli screen reader, e chi naviga
  // da tastiera si troverebbe otto collegamenti senza nome.
  const testoNascosto = {
    opacity: espansa ? 1 : 0,
    visibility: espansa ? "visible" : "hidden",
    transition: "opacity 0.2s ease",
    whiteSpace: "nowrap" as const,
  };

  return (
    <Box
      sx={{
        backgroundColor: tokens.color.canvas,
        height: "100%",
        borderRight: tokens.border.subtle,
        p: 2,
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      {/* Marchio: contratto resta la sola sigla, cosi' la colonna stretta ha
          comunque un'ancora visiva al posto di uno spazio vuoto. */}
      <Box sx={{ px: 1, py: 2, mb: 2, whiteSpace: "nowrap" }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 700,
            fontSize: "20px",
            color: tokens.color.nearBlack,
            letterSpacing: "-0.5px",
          }}
        >
          {espansa ? "SNM.Intelligence" : "SNM"}
        </Typography>
        <EtichettaMono taglia="micro" sx={{ mt: 0.5, ...testoNascosto }}>
          Analisi del Fediverso
        </EtichettaMono>
      </Box>

      {/* I capitoli nell'ordine della pipeline. L'intestazione di gruppo col
          numero romano e' cio' che rende leggibile la sequenza: prima le voci
          erano dodici allo stesso livello e l'ordine sembrava arbitrario. */}
      {CAPITOLI.map((capitolo, indice) => (
        <Box key={capitolo.id} component="section" sx={{ mb: 2 }}>
          {capitolo.id !== "panoramica" && (
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: espansa ? "flex-start" : "center",
                gap: 1,
                px: espansa ? 2 : 0,
                pt: 2,
                pb: 1,
                mt: 1,
                borderTop: indice > 0 ? tokens.border.subtle : "none",
              }}
            >
              {/* Contratta, resta il solo numero romano: e' abbastanza per
                  ritrovare il capitolo, e il filetto sopra fa da separatore. */}
              {capitolo.numero && (
                <Box
                  component="span"
                  sx={{
                    fontFamily: tokens.font.mono,
                    fontSize: "11px",
                    fontWeight: 600,
                    color: tokens.color.coral,
                    minWidth: 16,
                    textAlign: espansa ? "left" : "center",
                  }}
                >
                  {capitolo.numero}
                </Box>
              )}
              <EtichettaMono
                taglia="micro"
                colore={tokens.color.textFaint}
                component="span"
                sx={testoNascosto}
              >
                {capitolo.etichetta}
              </EtichettaMono>
            </Box>
          )}

          <List sx={{ p: 0 }}>
            {capitolo.voci.map((voce) => {
              const isSelected = isRouteActive(location.pathname, voce.path);
              const Icona = voce.icona;
              return (
                <ListItem key={voce.path} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    component={Link}
                    to={voce.path}
                    selected={isSelected}
                    onClick={onNavigate}
                    onMouseEnter={() => handlePrefetch(voce.path)}
                    onFocus={() => handlePrefetch(voce.path)}
                    onTouchStart={() => handlePrefetch(voce.path)}
                    sx={{
                      py: 1.2,
                      px: espansa ? 2 : 1.5,
                      borderRadius: "24px",
                      transition: "background-color 0.15s ease-in-out, padding 0.2s ease",
                      "&.Mui-selected": {
                        backgroundColor: tokens.color.nearBlack,
                        color: tokens.color.canvas,
                        "&:hover": {
                          backgroundColor: tokens.color.nearBlack,
                        },
                        "& .MuiListItemIcon-root": {
                          color: tokens.color.canvas,
                        },
                      },
                      "&:hover": {
                        backgroundColor: isSelected ? tokens.color.nearBlack : tokens.color.softStone,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 34,
                        color: isSelected ? tokens.color.canvas : tokens.color.textMuted,
                      }}
                    >
                      <Icona sx={{ fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={voce.testo}
                      sx={testoNascosto}
                      primaryTypographyProps={{
                        fontFamily: tokens.font.body,
                        fontWeight: isSelected ? 600 : 500,
                        fontSize: "14px",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      ))}
    </Box>
  );
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

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarAperta, setSidebarAperta] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // `onFocus`/`onBlur` in React corrispondono a focusin/focusout, quindi
  // risalgono dai figli: la sidebar si apre anche arrivandoci col tabulatore,
  // e non solo col mouse. Senza, chi naviga da tastiera resterebbe con le sole
  // icone e nessun modo di far comparire le etichette.
  const gestisciUscitaFocus = (evento: FocusEvent<HTMLDivElement>) => {
    if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
      setSidebarAperta(false);
    }
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <NotificationProvider>
            <CssBaseline />
          <HashRouter>
            <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: tokens.color.canvas }}>

          {/* Top Bar */}
          <AppBar
            position="fixed"
            sx={{
              // Ancorata alla larghezza a riposo: la sidebar che si apre le
              // passa sopra, quindi la barra non si sposta al passaggio del
              // mouse e il titolo del capitolo resta fermo.
              width: { sm: `calc(100% - ${LARGHEZZA_RIPOSO}px)` },
              ml: { sm: `${LARGHEZZA_RIPOSO}px` },
              backgroundImage: "none",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(8px)",
              color: tokens.color.textPrimary,
              boxShadow: "none",
              borderBottom: tokens.border.subtle,
            }}
          >
            <Toolbar sx={{ justifyContent: "space-between", height: "64px" }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
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
          <Box
            component="nav"
            sx={{ width: { sm: LARGHEZZA_RIPOSO }, flexShrink: { sm: 0 } }}
          >
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true,
              }}
              sx={{
                display: { xs: "block", sm: "none" },
                "& .MuiDrawer-paper": { boxSizing: "border-box", width: LARGHEZZA_APERTA, border: "none" },
              }}
            >
              {/* Su mobile il pannello e' sovrapposto al contenuto: se restasse
                  aperto dopo il clic coprirebbe la pagina appena richiesta. */}
              <NavigationContent onNavigate={() => setMobileOpen(false)} />
            </Drawer>
            <Drawer
              variant="permanent"
              open
              PaperProps={{
                onMouseEnter: () => setSidebarAperta(true),
                onMouseLeave: () => setSidebarAperta(false),
                onFocus: () => setSidebarAperta(true),
                onBlur: gestisciUscitaFocus,
              }}
              sx={{
                display: { xs: "none", sm: "block" },
                "& .MuiDrawer-paper": {
                  boxSizing: "border-box",
                  width: sidebarAperta ? LARGHEZZA_APERTA : LARGHEZZA_RIPOSO,
                  border: "none",
                  overflowX: "hidden",
                  transition: "width 0.2s ease",
                  // Sopra la barra superiore: aprendosi la sidebar scavalca il
                  // contenuto, e passare sotto la barra la taglierebbe a meta'.
                  zIndex: (tema) => tema.zIndex.appBar + 1,
                  // Chi ha chiesto meno animazioni non deve vedere la colonna
                  // allargarsi: cambia larghezza, ma di colpo.
                  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
                },
              }}
            >
              <NavigationContent espansa={sidebarAperta} />
            </Drawer>
          </Box>

          {/* Main Content Area */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              width: "100%",
              minHeight: "100vh",
              pt: { xs: 8, sm: 9 },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Container maxWidth="xl" sx={{ flexGrow: 1, px: { xs: 2, sm: 4, md: 6 } }}>
              <Suspense
                fallback={
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
                    <CircularProgress sx={{ color: tokens.color.coral }} />
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
                <Typography variant="caption" sx={{ color: tokens.color.textFaint, fontFamily: tokens.font.mono }}>
                  © {new Date().getFullYear()}
                </Typography>
              </Container>
            </Box>
          </Box>
        </Box>
        </HashRouter>
      </NotificationProvider>
    </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
}

