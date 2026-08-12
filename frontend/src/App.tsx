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
const FactChecking = lazy(() => import("./pages/FactChecking.tsx"));
const Accounts = lazy(() => import("./pages/Accounts.tsx"));
const Pipelines = lazy(() => import("./pages/Pipelines.tsx"));
const DbSync = lazy(() => import("./pages/DbSync.tsx"));
const DetectorComparison = lazy(() => import("./pages/DetectorComparison.tsx"));
const InfluenceMaximization = lazy(() => import("./pages/InfluenceMaximization.tsx"));
import { NotificationProvider } from "./context/NotificationContext.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { tokens } from "./theme.ts";

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
    <Box sx={{ backgroundColor: tokens.color.canvas, height: "100%", borderRight: tokens.border.subtle, p: 2 }}>
      {/* Brand Header */}
      <Box sx={{ px: 1, py: 2, mb: 2 }}>
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
          SNM.Intelligence
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontFamily: tokens.font.mono,
            fontSize: "11px",
            color: tokens.color.textMuted,
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
                <ListItemIcon sx={{ minWidth: 34, color: isSelected ? tokens.color.canvas : tokens.color.textMuted }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
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
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              ml: { sm: `${drawerWidth}px` },
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
              
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{
                  fontFamily: tokens.font.display,
                  fontWeight: 500,
                  fontSize: "16px",
                  color: tokens.color.nearBlack,
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
                    <CircularProgress sx={{ color: tokens.color.coral }} />
                  </Box>
                }
              >
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/posts" element={<Posts />} />
                  <Route path="/posts/:id" element={<PostDetail />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/ai-detection" element={<AiDetection detectorKey="fastdetect" />} />
                  <Route path="/ai-detection-binoculars" element={<AiDetection detectorKey="binoculars" />} />
                  <Route path="/ai-detection-desklib" element={<AiDetection detectorKey="desklib" />} />
                  <Route path="/ai-detection-ada" element={<AiDetection detectorKey="ada" />} />
                  <Route path="/ai-detection/:detector" element={<AiDetection />} />
                  <Route path="/detector-comparison" element={<DetectorComparison />} />
                  <Route path="/influence-maximization" element={<InfluenceMaximization />} />
                  <Route path="/fact-check" element={<FactChecking />} />
                  <Route path="/pipelines" element={<Pipelines />} />
                  <Route path="/db-sync" element={<DbSync />} />
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
                  SNM Project — Fediverse Social Network & AI Analysis
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

