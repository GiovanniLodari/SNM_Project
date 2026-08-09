import { createTheme } from "@mui/material/styles";

/**
 * Enterprise Design System Theme per SNM.Intelligence.
 * Rigorosamente conforme alle specifiche di DESIGN.md.
 * 
 * - Primary: #17171c (Near-Black)
 * - Deep Enterprise Green: #003c33
 * - Action Blue: #1863dc
 * - Cohere Coral: #ff7759
 * - Soft Stone Surface: #eeece7
 * - Canvas White Surface: #ffffff
 * - Tipografia: Space Grotesk (Headlines) + Inter (Body) + ui-monospace (Technical Labels)
 * - Raggi: 8px (sm), 16px (md), 22px (lg), 32px (pill)
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#17171c",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#1863dc",
      contrastText: "#ffffff",
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
      lineHeight: 1.05,
      letterSpacing: "-1.2px",
    },
    h3: {
      fontFamily: "Space Grotesk, Inter, sans-serif",
      fontWeight: 400,
      fontSize: "38px",
      lineHeight: 1.1,
      letterSpacing: "-1.0px",
    },
    h4: {
      fontFamily: "Space Grotesk, Inter, sans-serif",
      fontWeight: 400,
      fontSize: "32px",
      lineHeight: 1.2,
      letterSpacing: "-0.32px",
    },
    h5: {
      fontFamily: "Space Grotesk, Inter, sans-serif",
      fontWeight: 500,
      fontSize: "24px",
      lineHeight: 1.3,
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
      letterSpacing: "0.28px",
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
          textTransform: "none",
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
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid #e5e7eb",
          padding: "14px 16px",
        },
        head: {
          fontWeight: 700,
          color: "#17171c",
          backgroundColor: "#fafafa",
          fontFamily: "Inter, sans-serif",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: "Space Grotesk, Inter, sans-serif",
          fontWeight: 600,
          fontSize: "15px",
          textTransform: "none",
        },
      },
    },
  },
});
