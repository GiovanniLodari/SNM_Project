import { useState, lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
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
  Chip,
  Grid,
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


import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Article as PostsIcon,
  Psychology as AiIcon,
  FactCheck as FactCheckIcon,
  People as AccountsIcon,
  PlayCircle as PipelineIcon,
  Sync as SyncIcon,
  CompareArrows as CompareIcon,
  TrendingUp as InfluenceIcon,
} from "@mui/icons-material";

// Pagine in caricamento Lazy (Code-Splitting per prestazioni elevate)
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Posts = lazy(() => import("./pages/Posts.tsx"));
const PostDetail = lazy(() => import("./pages/PostDetail.tsx"));
const AiDetection = lazy(() => import("./pages/AiDetection.tsx"));
const AiDetectionBinoculars = lazy(() => import("./pages/AiDetectionBinoculars.tsx"));
const AiDetectionDesklib = lazy(() => import("./pages/AiDetectionDesklib.tsx"));
const AiDetectionAda = lazy(() => import("./pages/AiDetectionAda.tsx"));
const FactChecking = lazy(() => import("./pages/FactChecking.tsx"));
const Accounts = lazy(() => import("./pages/Accounts.tsx"));
const Pipelines = lazy(() => import("./pages/Pipelines.tsx"));
const DbSync = lazy(() => import("./pages/DbSync.tsx"));
const DetectorComparison = lazy(() => import("./pages/DetectorComparison.tsx"));
const InfluenceMaximization = lazy(() => import("./pages/InfluenceMaximization.tsx"));
import { NotificationProvider } from "./context/NotificationContext.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

const drawerWidth = 270;

function NavigationContent() {
  const location = useLocation();
  
  const menuItems = [
    { text: "Dashboard", path: "/", icon: <DashboardIcon sx={{ fontSize: 20 }} /> },
    { text: "Tutti i Post", path: "/posts", icon: <PostsIcon sx={{ fontSize: 20 }} /> },
    { text: "IA: FastDetectGPT", path: "/ai-detection", icon: <AiIcon sx={{ fontSize: 20 }} /> },
    { text: "IA: Binoculars", path: "/ai-detection-binoculars", icon: <AiIcon sx={{ fontSize: 20 }} /> },
    { text: "IA: Desklib Detector", path: "/ai-detection-desklib", icon: <AiIcon sx={{ fontSize: 20 }} /> },
    { text: "IA: AdaDetectGPT", path: "/ai-detection-ada", icon: <AiIcon sx={{ fontSize: 20 }} /> },
    { text: "Confronto Detector", path: "/detector-comparison", icon: <CompareIcon sx={{ fontSize: 20 }} /> },
    { text: "Fact Checking", path: "/fact-check", icon: <FactCheckIcon sx={{ fontSize: 20 }} /> },
    { text: "Accounts & Bot", path: "/accounts", icon: <AccountsIcon sx={{ fontSize: 20 }} /> },
    { text: "Influence Maximization", path: "/influence-maximization", icon: <InfluenceIcon sx={{ fontSize: 20 }} /> },
    { text: "Pipelines", path: "/pipelines", icon: <PipelineIcon sx={{ fontSize: 20 }} /> },
    { text: "Database Sync", path: "/db-sync", icon: <SyncIcon sx={{ fontSize: 20 }} /> },
  ];

  return (
    <Box sx={{ backgroundColor: "#ffffff", height: "100%", borderRight: "1px solid #e5e7eb", p: 2 }}>
      {/* Brand Header */}
      <Box sx={{ px: 1, py: 2, mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 700,
            fontSize: "20px",
            color: "#17171c",
            letterSpacing: "-0.5px",
          }}
        >
          SNM.Intelligence
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            color: "#75758a",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            display: "block",
            mt: 0.5,
          }}
        >
          Enterprise AI Command
        </Typography>
      </Box>

      <List sx={{ p: 0 }}>
        {menuItems.map((item) => {
          const isSelected =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isSelected}
                sx={{
                  py: 1.2,
                  px: 2,
                  borderRadius: "24px",
                  transition: "all 0.15s ease-in-out",
                  "&.Mui-selected": {
                    backgroundColor: "#17171c",
                    color: "#ffffff",
                    "&:hover": {
                      backgroundColor: "#17171c",
                    },
                    "& .MuiListItemIcon-root": {
                      color: "#ffffff",
                    },
                  },
                  "&:hover": {
                    backgroundColor: isSelected ? "#17171c" : "#eeece7",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 34, color: isSelected ? "#ffffff" : "#75758a" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontFamily: "Inter, sans-serif",
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
            <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#ffffff" }}>

          {/* Top Bar */}
          <AppBar
            position="fixed"
            sx={{
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              ml: { sm: `${drawerWidth}px` },
              backgroundImage: "none",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(8px)",
              color: "#212121",
              boxShadow: "none",
              borderBottom: "1px solid #e5e7eb",
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
              
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 500,
                  fontSize: "16px",
                  color: "#17171c",
                }}
              >
                Information Analysis Platform
              </Typography>


            </Toolbar>
          </AppBar>

          {/* Sidebar Navigation */}
          <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
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
                "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth, border: "none" },
              }}
            >
              <NavigationContent />
            </Drawer>
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: "none", sm: "block" },
                "& .MuiDrawer-paper": {
                  boxSizing: "border-box",
                  width: drawerWidth,
                  border: "none",
                },
              }}
              open
            >
              <NavigationContent />
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
                    <CircularProgress sx={{ color: "#ff7759" }} />
                  </Box>
                }
              >
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/posts" element={<Posts />} />
                  <Route path="/posts/:id" element={<PostDetail />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/ai-detection" element={<AiDetection />} />
                  <Route path="/ai-detection-binoculars" element={<AiDetectionBinoculars />} />
                  <Route path="/ai-detection-desklib" element={<AiDetectionDesklib />} />
                  <Route path="/ai-detection-ada" element={<AiDetectionAda />} />
                  <Route path="/detector-comparison" element={<DetectorComparison />} />
                  <Route path="/influence-maximization" element={<InfluenceMaximization />} />
                  <Route path="/fact-check" element={<FactChecking />} />
                  <Route path="/pipelines" element={<Pipelines />} />
                  <Route path="/db-sync" element={<DbSync />} />
                </Routes>
              </Suspense>
            </Container>

            {/* Sleek Enterprise Footer */}
            <Box
              sx={{
                mt: 10,
                py: 6,
                px: { xs: 3, md: 6 },
                backgroundColor: "#17171c",
                color: "#ffffff",
              }}
            >
              <Container maxWidth="xl">
                <Grid container spacing={4} sx={{ mb: 4, alignItems: "center" }}>
                  <Grid item xs={12} md={7}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontFamily: "Space Grotesk, Inter, sans-serif",
                        fontWeight: 600,
                        color: "#ffffff",
                        letterSpacing: "-0.5px",
                        mb: 1,
                      }}
                    >
                      SNM.Intelligence
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#93939f", maxWidth: 520, fontSize: "14px", lineHeight: 1.6 }}>
                      Piattaforma di analisi avanzata per il tracciamento della topologia social, rilevamento di testo sintetico (LLM) ed audit della veridicità nel Fediverso.
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={5} sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" }, gap: 1.5, flexWrap: "wrap" }}>
                    <Chip
                      label="SNM.INTELLIGENCE v2.4"
                      size="small"
                      sx={{
                        backgroundColor: "#003c33",
                        color: "#ffffff",
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "11px",
                        fontWeight: 600,
                        px: 1,
                      }}
                    />
                    <Chip
                      label="MASTODON FEDIVERSE AUDIT"
                      size="small"
                      sx={{
                        backgroundColor: "rgba(255,119,89,0.15)",
                        color: "#ff7759",
                        border: "1px solid rgba(255,119,89,0.3)",
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "11px",
                        fontWeight: 600,
                        px: 1,
                      }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", pt: 3, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: "#75758a", fontFamily: "ui-monospace, monospace" }}>
                    &copy; {new Date().getFullYear()} SNM.Intelligence • Social Network & LLM Auditing Infrastructure
                  </Typography>
                  <Box sx={{ display: "flex", gap: 3 }}>
                    <Typography variant="caption" sx={{ color: "#93939f" }}>Corpus Hashtag ~200k</Typography>
                    <Typography variant="caption" sx={{ color: "#93939f" }}>Multi-Model AI Detection</Typography>
                    <Typography variant="caption" sx={{ color: "#93939f" }}>Fact-Check Audit</Typography>
                  </Box>
                </Box>
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

