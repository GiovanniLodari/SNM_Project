import { createTheme } from "@mui/material/styles";

/**
 * Token del design system, sorgente unica dei valori ricorrenti.
 *
 * Esistono perche' il tema MUI da solo non bastava: i componenti usano quasi
 * ovunque `sx` con valori scritti a mano, e i colori erano finiti duplicati in
 * oltre mille letterali esadecimali sparsi nei file - cambiare una tinta voleva
 * dire cercarla e sostituirla ovunque, e le varianti sbagliate passavano
 * inosservate. Qui i valori si dichiarano una volta e si importano:
 *
 *     import { tokens } from "../theme.ts";
 *     <Box sx={{ color: tokens.color.textMuted }} />
 *
 * Il tema MUI qui sotto legge dagli stessi token, quindi componenti tematizzati
 * e `sx` scritti a mano non possono piu' divergere.
 */
const color = {
    // Marchio
    nearBlack: "#17171c",
    black: "#000000",
    deepGreen: "#003c33",
    actionBlue: "#1863dc",
    coral: "#ff7759",
    coralLight: "#ffad9b",
    purple: "#7c3aed",
    danger: "#b30000",

    // Superfici
    canvas: "#ffffff",
    softStone: "#eeece7",
    surfaceSubtle: "#f8f9fa",
    surfaceBlue: "#f1f5ff",
    surfaceCoral: "#fff0ec",
    surfacePurple: "#f5f3ff",
    surfaceDanger: "#fdf2f2",
    tableHead: "#fafafa",

    // Testo
    textPrimary: "#212121",
    textMuted: "#75758a",
    textFaint: "#93939f",

    // Bordi
    border: "#e5e7eb",
    borderStrong: "#d9d9dd",
    borderPurple: "#ddd6fe",

    // Superfici scure (grafo, console log, modali)
    darkSurface: "#0b0f19",
    darkSlate: "#94a3b8",
    darkSlateDeep: "#64748b",
    darkSlateDarker: "#475569",
    darkSlateLight: "#cbd5e1",
    accentCyan: "#00e5ff",

    // Stati positivi: verde "attivo" (nodo umano, pipeline in esecuzione) e
    // verde "appena attivato" della cascata di influenza - due significati
    // diversi, quindi due token distinti anche se le tinte sono vicine.
    success: "#10b981",
    activated: "#34c759",
    // Bordi tenui delle chip detector: azzurro = sotto soglia (non IA),
    // verde = sotto soglia per Binoculars, che usa una scala propria.
    chipBorderHuman: "#c6d7ff",
    chipBorderHumanGreen: "#a8eb99",
};

// I colori stanno in una const a parte perche' i bordi qui sotto devono
// potervisi riferire: un oggetto letterale non puo' citare se stesso.
export const tokens = {
  color,
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "22px",
    pill: "32px",
    chip: "30px",
  },
  font: {
    display: "Space Grotesk, Inter, sans-serif",
    body: "Inter, sans-serif",
    mono: "ui-monospace, monospace",
  },
  // Scorciatoie per i bordi ricorrenti: la sola stringa "1px solid #e5e7eb"
  // compariva 65 volte scritta a mano.
  border: {
    subtle: `1px solid ${color.border}`,
    strong: `1px solid ${color.borderStrong}`,
    purple: `1px solid ${color.borderPurple}`,
  },
};
// Niente `as const`: renderebbe ogni valore un tipo letterale (es. "#003c33"
// invece di string), e un token passato dove ci si aspetta una stringa
// smetterebbe di compilare - come accadeva al type predicate di consensusData
// in DetectorComparison. Sui token i tipi letterali non danno alcun vantaggio:
// l'autocompletamento arriva comunque dalla forma dell'oggetto.

/**
 * Tema MUI per SNM.Intelligence, allineato a DESIGN.md.
 * Tipografia: Space Grotesk (titoli) + Inter (testo) + ui-monospace (etichette
 * tecniche). Raggi: 8px (sm), 16px (md), 22px (lg), 32px (pill).
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: color.nearBlack,
      contrastText: color.canvas,
    },
    secondary: {
      main: color.actionBlue,
      contrastText: color.canvas,
    },
    background: {
      default: color.canvas,
      paper: color.canvas,
    },
    text: {
      primary: color.textPrimary,
      secondary: color.textMuted,
    },
    divider: color.border,
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: tokens.font.body,
    h1: {
      fontFamily: tokens.font.display,
      fontWeight: 400,
      fontSize: "72px",
      lineHeight: 1.0,
      letterSpacing: "-1.44px",
    },
    h2: {
      fontFamily: tokens.font.display,
      fontWeight: 400,
      fontSize: "48px",
      lineHeight: 1.05,
      letterSpacing: "-1.2px",
    },
    h3: {
      fontFamily: tokens.font.display,
      fontWeight: 400,
      fontSize: "38px",
      lineHeight: 1.1,
      letterSpacing: "-1.0px",
    },
    h4: {
      fontFamily: tokens.font.display,
      fontWeight: 400,
      fontSize: "32px",
      lineHeight: 1.2,
      letterSpacing: "-0.32px",
    },
    h5: {
      fontFamily: tokens.font.display,
      fontWeight: 500,
      fontSize: "24px",
      lineHeight: 1.3,
    },
    h6: {
      fontFamily: tokens.font.body,
      fontWeight: 600,
      fontSize: "16px",
    },
    body1: {
      fontFamily: tokens.font.body,
      fontSize: "16px",
      lineHeight: 1.5,
    },
    body2: {
      fontFamily: tokens.font.body,
      fontSize: "14px",
      lineHeight: 1.4,
    },
    button: {
      fontFamily: tokens.font.body,
      fontWeight: 500,
      fontSize: "14px",
      textTransform: "none",
    },
    caption: {
      fontFamily: tokens.font.mono,
      fontSize: "13px",
      letterSpacing: "0.28px",
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.lg,
          boxShadow: "none",
          border: `1px solid ${color.border}`,
          backgroundColor: color.canvas,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.lg,
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.pill,
          padding: "10px 24px",
          boxShadow: "none",
          textTransform: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        containedPrimary: {
          backgroundColor: color.nearBlack,
          color: color.canvas,
          "&:hover": {
            backgroundColor: color.black,
          },
        },
        outlined: {
          borderColor: color.borderStrong,
          color: color.textPrimary,
          "&:hover": {
            backgroundColor: color.softStone,
            borderColor: color.nearBlack,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.chip,
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${color.border}`,
          padding: "14px 16px",
        },
        head: {
          fontWeight: 700,
          color: color.nearBlack,
          backgroundColor: color.tableHead,
          fontFamily: tokens.font.body,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: tokens.font.display,
          fontWeight: 600,
          fontSize: "15px",
          textTransform: "none",
        },
      },
    },
  },
});
