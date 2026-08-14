import { useState, lazy, Suspense } from "react";
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
/** Larghezza fissa della sidebar su desktop. */
const LARGHEZZA_SIDEBAR = 260;

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
}

function NavigationContent({ onNavigate }: PropsNavigazione) {
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

  return (
    <Box
      sx={{
        backgroundColor: tokens.color.canvas,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2,
        overflowX: "hidden",
        overflowY: "auto",
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": {
          width: "4px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: tokens.color.borderStrong,
          borderRadius: "4px",
        },
      }}
    >
      {/* Brand & Monogram Lockup */}
      <Box
        component={Link}
        to="/"
        onClick={onNavigate}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1,
          py: 1.5,
          mb: 1.5,
          textDecoration: "none",
          color: "inherit",
          borderRadius: "8px",
          transition: "background-color 0.15s ease",
          "&:hover": {
            backgroundColor: tokens.color.surfaceStone,
          },
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "8px",
            backgroundColor: tokens.color.nearBlack,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tokens.color.canvas,
            fontFamily: tokens.font.display,
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "-0.5px",
            flexShrink: 0,
          }}
        >
          SNM
        </Box>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography
            sx={{
              fontFamily: tokens.font.display,
              fontWeight: 700,
              fontSize: "15px",
              lineHeight: 1.2,
              color: tokens.color.nearBlack,
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            SNM.Intelligence
          </Typography>
          <Typography
            sx={{
              fontFamily: tokens.font.mono,
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: tokens.color.textMuted,
              textTransform: "uppercase",
              lineHeight: 1.2,
              mt: 0.25,
            }}
          >
            Analisi del Fediverso
          </Typography>
        </Box>
      </Box>

      {/* Navigazione ordinata per capitoli della pipeline */}
      <Box sx={{ flexGrow: 1 }}>
        {CAPITOLI.map((capitolo, indice) => (
          <Box key={capitolo.id} component="section" sx={{ mb: 1.5 }}>
            {capitolo.id !== "panoramica" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1,
                  pt: 1.5,
                  pb: 0.5,
                  mt: indice > 1 ? 0.5 : 0,
                }}
              >
                {capitolo.numero && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: tokens.font.mono,
                      fontSize: "10px",
                      fontWeight: 700,
                      color: tokens.color.coral,
                      backgroundColor: tokens.color.surfaceCoral,
                      px: "5px",
                      py: "1px",
                      borderRadius: "4px",
                      lineHeight: 1.2,
                    }}
                  >
                    {capitolo.numero}
                  </Box>
                )}
                <Typography
                  sx={{
                    fontFamily: tokens.font.mono,
                    fontSize: "11px",
                    fontWeight: 600,
                    color: tokens.color.textMuted,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {capitolo.etichetta}
                </Typography>
              </Box>
            )}

            <List sx={{ p: 0 }}>
              {capitolo.voci.map((voce) => {
                const isSelected = isRouteActive(location.pathname, voce.path);
                const Icona = voce.icona;
                return (
                  <ListItem key={voce.path} disablePadding sx={{ mb: 0.3 }}>
                    <ListItemButton
                      component={Link}
                      to={voce.path}
                      selected={isSelected}
                      onClick={onNavigate}
                      onMouseEnter={() => handlePrefetch(voce.path)}
                      onFocus={() => handlePrefetch(voce.path)}
                      onTouchStart={() => handlePrefetch(voce.path)}
                      sx={{
                        py: 0.85,
                        px: 1.25,
                        borderRadius: "8px",
                        transition: "all 0.15s ease-in-out",
                        "&.Mui-selected": {
                          backgroundColor: tokens.color.nearBlack,
                          color: tokens.color.canvas,
                          "&:hover": {
                            backgroundColor: tokens.color.nearBlackHover,
                          },
                          "& .MuiListItemIcon-root": {
                            color: tokens.color.coral,
                          },
                          "& .MuiListItemText-primary": {
                            color: tokens.color.canvas,
                            fontWeight: 600,
                          },
                        },
                        "&:hover": {
                          backgroundColor: isSelected
                            ? tokens.color.nearBlackHover
                            : tokens.color.softStone,
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 28,
                          color: isSelected ? tokens.color.coral : tokens.color.textMuted,
                          transition: "color 0.15s ease",
                        }}
                      >
                        <Icona sx={{ fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={voce.testo}
                        primaryTypographyProps={{
                          fontFamily: tokens.font.body,
                          fontWeight: isSelected ? 600 : 500,
                          fontSize: "13.5px",
                          color: isSelected ? tokens.color.canvas : tokens.color.textPrimary,
                          whiteSpace: "nowrap",
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

      {/* Footer minimalista della sidebar */}
      <Box
        sx={{
          pt: 2,
          pb: 0.5,
          px: 1,
          mt: "auto",
          borderTop: tokens.border.subtle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: tokens.color.success,
              boxShadow: `0 0 6px ${tokens.color.success}`,
            }}
          />
          <Typography
            sx={{
              fontFamily: tokens.font.mono,
              fontSize: "11px",
              color: tokens.color.textMuted,
              fontWeight: 500,
            }}
          >
            Fediverso Live
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: tokens.font.mono,
            fontSize: "10px",
            color: tokens.color.textFaint,
          }}
        >
          v1.0
        </Typography>
      </Box>
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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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
              width: { sm: `calc(100% - ${LARGHEZZA_SIDEBAR}px)` },
              ml: { sm: `${LARGHEZZA_SIDEBAR}px` },
              backgroundImage: "none",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(8px)",
              color: tokens.color.textPrimary,
              boxShadow: "none",
              borderBottom: tokens.border.subtle,
              zIndex: (tema) => tema.zIndex.appBar,
            }}
          >
            <Toolbar sx={{ justifyContent: "space-between", height: "60px" }}>
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
            sx={{ width: { sm: LARGHEZZA_SIDEBAR }, flexShrink: { sm: 0 } }}
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
                "& .MuiDrawer-paper": {
                  boxSizing: "border-box",
                  width: LARGHEZZA_SIDEBAR,
                  borderRight: tokens.border.subtle,
                },
              }}
            >
              <NavigationContent onNavigate={() => setMobileOpen(false)} />
            </Drawer>
            <Drawer
              variant="permanent"
              open
              PaperProps={{
                "data-testid": "sidebar-desktop",
              }}
              sx={{
                display: { xs: "none", sm: "block" },
                "& .MuiDrawer-paper": {
                  boxSizing: "border-box",
                  width: LARGHEZZA_SIDEBAR,
                  borderRight: tokens.border.subtle,
                  borderTop: "none",
                  borderLeft: "none",
                  borderBottom: "none",
                  backgroundColor: tokens.color.canvas,
                  overflowX: "hidden",
                },
              }}
            >
              <NavigationContent />
            </Drawer>
          </Box>

          {/* Main Content Area */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              width: { sm: `calc(100% - ${LARGHEZZA_SIDEBAR}px)` },
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

