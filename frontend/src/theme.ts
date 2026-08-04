import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2a78d6" },
    background: { default: "#f6f7f9", paper: "#ffffff" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif",
    h4: { fontWeight: 600, letterSpacing: "-0.01em" },
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: "text.secondary",
          textTransform: "uppercase",
          fontSize: "0.75rem",
          letterSpacing: "0.02em",
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: { textDecoration: "none" },
      },
    },
  },
});
