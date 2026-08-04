import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ArticleIcon from "@mui/icons-material/Article";
import GroupsIcon from "@mui/icons-material/Groups";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SyncAltIcon from "@mui/icons-material/SyncAlt";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: <DashboardIcon />, end: true },
  { to: "/posts", label: "Post", icon: <ArticleIcon /> },
  { to: "/accounts", label: "Account / Bot", icon: <GroupsIcon /> },
  { to: "/ai-detection", label: "AI Detection", icon: <SmartToyIcon /> },
  { to: "/fact-check", label: "Fact-Check", icon: <FactCheckIcon /> },
  { to: "/pipelines", label: "Pipeline", icon: <AccountTreeIcon /> },
  { to: "/db-sync", label: "Import/Export", icon: <SyncAltIcon /> },
];

const DRAWER_WIDTH = 240;

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <List>
      {NAV_ITEMS.map((item) => (
        <ListItemButton
          key={item.to}
          component={NavLink}
          to={item.to}
          end={item.end}
          onClick={() => setMobileOpen(false)}
          sx={{
            "&.active": {
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "& .MuiListItemIcon-root": { color: "inherit" },
            },
          }}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Tooltip title="Menù">
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2, display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SNM Project
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Monitoraggio social
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
          }}
        >
          {nav}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
          }}
        >
          <Toolbar />
          <Divider />
          {nav}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          maxWidth: 1000,
          mx: "auto",
          width: "100%",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
