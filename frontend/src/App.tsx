import { useState } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
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
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Article as PostsIcon,
  Psychology as AiIcon,
  FactCheck as FactCheckIcon,
  People as AccountsIcon,
  PlayCircle as PipelineIcon,
  Sync as SyncIcon,
} from "@mui/icons-material";

// Pagine
import Dashboard from "./pages/Dashboard.tsx";
import Posts from "./pages/Posts.tsx";
import PostDetail from "./pages/PostDetail.tsx";
import AiDetection from "./pages/AiDetection.tsx";
import FactChecking from "./pages/FactChecking.tsx";
import Accounts from "./pages/Accounts.tsx";
import Pipelines from "./pages/Pipelines.tsx";
import DbSync from "./pages/DbSync.tsx";

const drawerWidth = 270;

function NavigationContent() {
  const location = useLocation();
  
  const menuItems = [
    { text: "Dashboard", path: "/", icon: <DashboardIcon sx={{ fontSize: 20 }} /> },
    { text: "Tutti i Post", path: "/posts", icon: <PostsIcon sx={{ fontSize: 20 }} /> },
    { text: "Rilevamento IA", path: "/ai-detection", icon: <AiIcon sx={{ fontSize: 20 }} /> },
    { text: "Fact Checking", path: "/fact-check", icon: <FactCheckIcon sx={{ fontSize: 20 }} /> },
    { text: "Accounts & Bot", path: "/accounts", icon: <AccountsIcon sx={{ fontSize: 20 }} /> },
    { text: "Pipeline System", path: "/pipelines", icon: <PipelineIcon sx={{ fontSize: 20 }} /> },
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
            color: "#000000",
            letterSpacing: "-0.5px",
          }}
        >
          snm<Box component="span" sx={{ color: "#ff7759" }}>.</Box>intelligence
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

      {/* System Status Chip */}
      <Box sx={{ mt: 6, p: 2, borderRadius: "16px", backgroundColor: "#edfce9", border: "1px solid #d9d9dd" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#003c33" }} />
          <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 600, color: "#003c33" }}>
            NODE ONLINE
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "#75758a", fontSize: "12px", display: "block" }}>
          Fediverse Crawler & LLM Pipeline ACTIVE
        </Typography>
      </Box>
    </Box>
  );
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const theme = createTheme({
    palette: {
      mode: "light",
      primary: {
        main: "#17171c",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#1863dc",
      },
      background: {
        default: "#ffffff",
        paper: "#ffffff",
      },
      text: {
        primary: "#212121",
        secondary: "#75758a",
      },
      divider: "#e5e7eb",
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: "Inter, sans-serif",
      h1: {
        fontFamily: "Space Grotesk, Inter, sans-serif",
        fontWeight: 400,
        fontSize: "72px",
        lineHeight: 1.0,
        letterSpacing: "-1.44px",
      },
      h2: {
        fontFamily: "Space Grotesk, Inter, sans-serif",
        fontWeight: 400,
        fontSize: "48px",
        lineHeight: 1.2,
        letterSpacing: "-0.48px",
      },
      h4: {
        fontFamily: "Space Grotesk, Inter, sans-serif",
        fontWeight: 400,
        fontSize: "32px",
        lineHeight: 1.2,
        letterSpacing: "-0.32px",
      },
      h5: {
        fontFamily: "Inter, sans-serif",
        fontWeight: 500,
        fontSize: "20px",
      },
      h6: {
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
        fontSize: "16px",
      },
      body1: {
        fontFamily: "Inter, sans-serif",
        fontSize: "16px",
        lineHeight: 1.5,
      },
      body2: {
        fontFamily: "Inter, sans-serif",
        fontSize: "14px",
        lineHeight: 1.4,
      },
      button: {
        fontFamily: "Inter, sans-serif",
        fontWeight: 500,
        fontSize: "14px",
        textTransform: "none",
      },
      caption: {
        fontFamily: "ui-monospace, monospace",
        fontSize: "13px",
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: "16px",
            boxShadow: "none",
            border: "1px solid #e5e7eb",
            backgroundColor: "#ffffff",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: "16px",
            boxShadow: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "32px",
            padding: "10px 24px",
            boxShadow: "none",
            "&:hover": {
              boxShadow: "none",
            },
          },
          containedPrimary: {
            backgroundColor: "#17171c",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#000000",
            },
          },
          outlined: {
            borderColor: "#d9d9dd",
            color: "#212121",
            "&:hover": {
              backgroundColor: "#eeece7",
              borderColor: "#17171c",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: "30px",
            fontSize: "13px",
            fontWeight: 500,
          },
        },
      },
    },
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <ThemeProvider theme={theme}>
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

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Chip
                  label="LLM ENGINE CONNECTED"
                  size="small"
                  sx={{
                    backgroundColor: "#ff7759",
                    color: "#ffffff",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                />
                <Box
                  component={Link}
                  to="/pipelines"
                  sx={{
                    color: "#1863dc",
                    fontSize: "14px",
                    fontWeight: 500,
                    textDecoration: "underline",
                    "&:hover": { color: "#000000" },
                  }}
                >
                  System Controls &rarr;
                </Box>
              </Box>
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

          {/* Main Workspace */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              backgroundColor: "#ffffff",
              minHeight: "100vh",
            }}
          >
            <Toolbar sx={{ height: "64px" }} />
            <Container maxWidth="xl" sx={{ py: 5, px: { xs: 3, md: 5 } }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/posts" element={<Posts />} />
                <Route path="/posts/:id" element={<PostDetail />} />
                <Route path="/ai-detection" element={<AiDetection />} />
                <Route path="/fact-check" element={<FactChecking />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/pipelines" element={<Pipelines />} />
                <Route path="/db-sync" element={<DbSync />} />
              </Routes>
            </Container>

            {/* Dark Enterprise Footer */}
            <Box
              sx={{
                mt: 12,
                py: 8,
                px: { xs: 3, md: 6 },
                backgroundColor: "#17171c",
                color: "#ffffff",
              }}
            >
              <Container maxWidth="xl">
                <Grid container spacing={4} sx={{ mb: 6 }}>
                  <Grid item xs={12} md={6}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontFamily: "Space Grotesk, Inter, sans-serif",
                        fontWeight: 400,
                        color: "#ffffff",
                        mb: 2,
                      }}
                    >
                      Enterprise Information Command
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#93939f", maxWidth: 460 }}>
                      Scalable detection of synthetic content, misinformation propagation, and network density analysis across the Fediverse.
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6} sx={{ display: "flex", justifyContent: { md: "flex-end" }, alignItems: "center" }}>
                    <Chip
                      label="ENTERPRISE SYSTEM READY"
                      sx={{
                        backgroundColor: "#003c33",
                        color: "#ffffff",
                        px: 2,
                        py: 2.5,
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "12px",
                      }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", pt: 4, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                  <Typography variant="caption" sx={{ color: "#93939f" }}>
                    &copy; {new Date().getFullYear()} SNM Enterprise AI Analysis System. All rights reserved.
                  </Typography>
                  <Box sx={{ display: "flex", gap: 3 }}>
                    <Typography variant="caption" sx={{ color: "#93939f" }}>Privacy Policy</Typography>
                    <Typography variant="caption" sx={{ color: "#93939f" }}>Terms of Service</Typography>
                    <Typography variant="caption" sx={{ color: "#93939f" }}>API Documentation</Typography>
                  </Box>
                </Box>
              </Container>
            </Box>
          </Box>
        </Box>
      </HashRouter>
    </ThemeProvider>
  );
}
