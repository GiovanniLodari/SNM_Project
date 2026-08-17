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
    // Sfumatura appena piu' chiara di nearBlack: hover dei bottoni pieni, dove
    // "piu' scuro" non e' disponibile perche' si parte gia' quasi dal nero.
    nearBlackHover: "#2e2e38",
    black: "#000000",
    deepGreen: "#003c33",
    // Banda scura alternativa a deepGreen (DESIGN.md, dark-feature-band): serve
    // a distinguere un capitolo dall'altro senza cambiare famiglia di colore.
    darkNavy: "#071829",
    actionBlue: "#1863dc",
    coral: "#ff7759",
    // Coral premuto/hover: unica variante scura del coral usata dai controlli.
    coralDark: "#e66043",
    coralLight: "#ffad9b",
    /**
     * Il coral quando deve fare da inchiostro invece che da riempimento.
     *
     * `coral` su fondo chiaro da' 2.6:1 sul canvas e 2.2:1 sulla pietra: sotto
     * la soglia sia per il testo (4.5:1) sia per un segno che porta
     * informazione (3:1). Non e' un difetto del coral, e' il suo posto: vive
     * come fondo, con sopra il nero di marchio (6.8:1).
     *
     * Dove pero' la tinta deve dire "bot" *ed essere letta* - la cifra di una
     * scheda, l'etichetta che la sormonta, il numero di capitolo nella sidebar -
     * serve la stessa tinta piu' scura. Stessa hue OKLCH del coral (33.9), solo
     * lightness ridotta: il legame semantico regge, la lettura anche.
     * 5.3:1 sul canvas, 4.5:1 sulla pietra, 4.8:1 su surfaceCoral.
     */
    coralInk: "#c03d20",
    purple: "#7c3aed",
    danger: "#b30000",

    // Superfici
    canvas: "#ffffff",
    softStone: "#eeece7",
    surfaceSubtle: "#f8f9fa",
    // Bianco appena caldo: fondo dei blocchi di esplorazione, distingue il
    // pannello dal canvas senza introdurre un bordo in piu'.
    surfaceWarm: "#fafaf8",
    surfaceBlue: "#f1f5ff",
    surfaceCoral: "#fff0ec",
    surfacePurple: "#f5f3ff",
    surfaceGreen: "#edfce9",
    surfaceDanger: "#fdf2f2",
    // Pietra chiara: fondo degli scheletri di caricamento e hover delle righe
    // d'elenco, dove softStone sarebbe troppo marcato.
    surfaceStone: "#f9f8f6",
    tableHead: "#fafafa",

    // Testo
    textPrimary: "#212121",
    /**
     * Testo secondario sulle superfici chiare: descrizioni dei blocchi, note
     * delle schede, metadati, etichette mono a riposo.
     *
     * Era `#75758a`, che dava 4.499:1 sul canvas - sotto la soglia AA di 4.5 per
     * un pelo, ma sotto - e 3.8:1 sulla pietra, dove vive la nota di ogni
     * SchedaCifra. Il valore attuale e' calcolato sulla superficie peggiore fra
     * quelle su cui compare davvero: 5.4:1 sul canvas, 4.5:1 sulla pietra,
     * 5.1:1 su surfaceWarm, 4.8:1 su surfaceCoral e surfacePurple.
     */
    textMuted: "#69697e",
    /**
     * Testo secondario sulle superfici scure: grafo, cascata, console, modali
     * scure, card delle pipeline.
     *
     * Si chiamava `textFaint` e veniva usato su entrambe le famiglie di fondo.
     * Sulle superfici scure e' corretto (5.9:1 sul nero di marchio, 6.3:1 sul
     * fondo del grafo); su quelle chiare dava 3.0:1, e nessuna terza tonalita'
     * di grigio piu' chiara di `textMuted` puo' passare AA sul bianco - quindi
     * quelle occorrenze sono diventate `textMuted` e il token ha preso il nome
     * del solo mestiere che sa fare.
     *
     * Non regge sulle bande verdi (4.1:1 su deepGreen): li' si usa
     * `rgba(255,255,255,0.72)`, come fa BandaScura.
     */
    textOnDark: "#93939f",

    // Bordi
    border: "#e5e7eb",
    borderStrong: "#d9d9dd",
    // Bordo dei controlli di modulo, l'unico piu' marcato di borderStrong.
    borderInput: "#d1d5db",
    // Filetto piu' tenue del sistema (DESIGN.md, Card Border): separa le righe
    // dentro una card, dove `border` risulterebbe una gabbia.
    cardBorder: "#f2f2f2",
    borderPurple: "#ddd6fe",
    // Anello di focus da tastiera (DESIGN.md, Semantic): non e' actionBlue,
    // che serve ai link, perche' focus e link devono restare distinguibili.
    focusBlue: "#4c6ee6",

    // Superfici scure (grafo, console log, modali). Sono quattro tinte vicine
    // ma non intercambiabili: ognuna fa da fondo a un contenuto diverso, e
    // uniformarle appiattirebbe la distinzione fra un grafo e un terminale.
    darkSurface: "#0b0f19",
    /** Canvas della cascata di influenza: il piu' scuro, per far risaltare i nodi. */
    darkCanvas: "#0d0d10",
    /** Riquadro del grafo dei follow in homepage. */
    darkGraph: "#131924",
    /** Console dei log delle pipeline: nero bluastro da terminale. */
    darkConsole: "#050811",
    darkSlate: "#94a3b8",
    /**
     * Etichette e icone di servizio sui pannelli scuri (misure del grafo,
     * comandi della barra). Era `#64748b`, 4.0:1 sul fondo scuro: sotto AA per
     * le caption da 10-11px che ne fanno l'uso principale. Ora 4.9:1.
     */
    darkSlateDeep: "#728299",
    /**
     * "Nodo non ancora raggiunto" nella cascata e nella sua legenda. Era
     * `#475569`, 2.6:1 sul fondo della cascata: sotto il 3:1 richiesto a un
     * elemento grafico che porta informazione (WCAG 1.4.11). Ora 3.1:1.
     */
    darkSlateDarker: "#526175",
    darkSlateLight: "#cbd5e1",
    accentCyan: "#00e5ff",
    /** Nodo bot e nodo umano nel grafo dei follow, su fondo scuro. */
    graphBot: "#ff5252",
    graphHuman: "#38bdf8",

    // Stati positivi: verde "attivo" (nodo umano, pipeline in esecuzione) e
    // verde "appena attivato" della cascata di influenza - due significati
    // diversi, quindi due token distinti anche se le tinte sono vicine.
    success: "#10b981",
    /** Verde premuto: hover del comando "in esecuzione" della barra del grafo. */
    successDark: "#0d9668",
    activated: "#34c759",
    /** Rosso premuto: hover dei comandi distruttivi (arresto di una pipeline). */
    dangerDark: "#800000",
    // Bordi tenui delle chip detector: azzurro = sotto soglia (non IA),
    // verde = sotto soglia per Binoculars, che usa una scala propria.
    chipBorderHuman: "#c6d7ff",
    chipBorderHumanGreen: "#a8eb99",
};

// I colori stanno in una const a parte perche' i bordi qui sotto devono
// potervisi riferire: un oggetto letterale non puo' citare se stesso.
const font = {
  display: "Space Grotesk, Inter, sans-serif",
  body: "Inter, sans-serif",
  mono: "ui-monospace, monospace",
};

/**
 * Scala tipografica di DESIGN.md (sezione Typography > Hierarchy), in oggetti
 * pronti da spandere dentro `sx`:
 *
 *     <Typography sx={{ ...tokens.type.sectionHeading }}>
 *
 * Esiste accanto alle varianti MUI perche' le varianti sono sei caselle
 * (h1..h6) mentre DESIGN.md descrive dodici ruoli, e la corrispondenza non e'
 * uno a uno. Il risultato era che ogni pagina dichiarava una `variant` e poi ne
 * riscriveva a mano `fontSize`, `lineHeight` e `letterSpacing` dentro `sx`,
 * ognuna con valori leggermente diversi: e' il motivo per cui i titoli non
 * combaciavano da una sezione all'altra. Qui il ruolo si nomina una volta.
 *
 * Le misure sono responsive gia' nel token: chi lo usa non deve reintrodurre
 * un breakpoint a mano, che era l'altra meta' della divergenza.
 */
const type = {
  /** Dichiarazione della homepage, una sola per pagina. */
  heroDisplay: {
    fontFamily: font.display,
    fontWeight: 400,
    fontSize: { xs: "40px", sm: "56px", md: "72px", lg: "96px" },
    lineHeight: 1.0,
    letterSpacing: "-1.92px",
  },
  /** Titolo di apertura di un capitolo. */
  productDisplay: {
    fontFamily: font.display,
    fontWeight: 400,
    fontSize: { xs: "34px", md: "56px", lg: "72px" },
    lineHeight: 1.0,
    letterSpacing: "-1.44px",
  },
  /** Titolo di sezione ampia. */
  sectionDisplay: {
    fontFamily: font.display,
    fontWeight: 400,
    fontSize: { xs: "32px", md: "48px", lg: "60px" },
    lineHeight: 1.0,
    letterSpacing: "-1.2px",
  },
  /** Titolo di sezione: e' anche la domanda che apre un atto. */
  sectionHeading: {
    fontFamily: font.display,
    fontWeight: 400,
    fontSize: { xs: "26px", md: "34px", lg: "40px" },
    lineHeight: 1.2,
    letterSpacing: "-0.48px",
  },
  /** Titolo di scheda o di blocco dentro un atto. */
  cardHeading: {
    fontFamily: font.display,
    fontWeight: 400,
    fontSize: { xs: "24px", md: "32px" },
    lineHeight: 1.2,
    letterSpacing: "-0.32px",
  },
  /** Titolo di card, filtro, elemento di elenco. */
  featureHeading: {
    fontFamily: font.display,
    fontWeight: 500,
    fontSize: "24px",
    lineHeight: 1.3,
    letterSpacing: 0,
  },
  /** Paragrafo guida sotto un titolo. */
  bodyLarge: {
    fontFamily: font.body,
    fontWeight: 400,
    fontSize: { xs: "16px", md: "18px" },
    lineHeight: 1.4,
  },
  body: {
    fontFamily: font.body,
    fontWeight: 400,
    fontSize: "16px",
    lineHeight: 1.5,
  },
  /**
   * Etichetta tecnica maiuscola. Reso dal componente EtichettaMono, che va
   * preferito a questo token nudo perche' porta con se' anche il `component`
   * corretto e la spaziatura.
   */
  monoLabel: {
    fontFamily: font.mono,
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: 1.4,
    letterSpacing: "0.28px",
    textTransform: "uppercase" as const,
  },
  /** Microcopy: pie' di pagina, metadati, note. */
  micro: {
    fontFamily: font.body,
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: 1.4,
  },
  /** Cifra grande di un dato chiave (KPI, risultato di un atto). */
  numeroGrande: {
    fontFamily: font.display,
    fontWeight: 400,
    fontSize: { xs: "40px", md: "56px" },
    lineHeight: 1.0,
    letterSpacing: "-1.2px",
  },
};

export const tokens = {
  color,
  radius: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "22px",
    pill: "32px",
    chip: "30px",
  },
  font,
  type,
  /**
   * Padding orizzontale del Container in App.tsx. Vive qui perche' le bande a
   * piena larghezza (BandaScura) devono annullarlo con margini negativi
   * speculari: se i due valori divergessero, la banda risulterebbe disallineata
   * dal bordo del contenuto invece che a filo.
   */
  paddingContenuto: { xs: 2, sm: 4, md: 6 },
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
  // Le sei varianti MUI ricalcano i ruoli di DESIGN.md nell'ordine decrescente
  // che MUI impone (h1 > h2 > ... > h6). I ruoli che non ci stanno - Hero
  // Display, Section Display, Mono Label - vivono in `tokens.type`, che e' da
  // preferire nel codice nuovo: le varianti restano per i componenti MUI che
  // le applicano da soli.
  typography: {
    fontFamily: tokens.font.body,
    // Product Display
    h1: {
      fontFamily: tokens.font.display,
      fontWeight: 400,
      fontSize: "72px",
      lineHeight: 1.0,
      letterSpacing: "-1.44px",
    },
    // Section Heading: la crenatura era -1.2px, valore che DESIGN.md riserva ai
    // 60px; a 48px stringeva troppo e i titoli lunghi risultavano compressi.
    h2: {
      fontFamily: tokens.font.display,
      fontWeight: 400,
      fontSize: "48px",
      lineHeight: 1.2,
      letterSpacing: "-0.48px",
    },
    h3: {
      fontFamily: tokens.font.display,
      fontWeight: 400,
      fontSize: "38px",
      lineHeight: 1.2,
      letterSpacing: "-0.4px",
    },
    // Card Heading
    h4: {
      fontFamily: tokens.font.display,
      fontWeight: 400,
      fontSize: "32px",
      lineHeight: 1.2,
      letterSpacing: "-0.32px",
    },
    // Feature Heading
    h5: {
      fontFamily: tokens.font.display,
      fontWeight: 500,
      fontSize: "24px",
      lineHeight: 1.3,
      letterSpacing: 0,
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
    // Anello di focus unico per tutta l'app (DESIGN.md, Semantic > Focus Blue).
    // Prima ogni controllo si affidava all'outline predefinito del browser, che
    // cambia tinta e spessore fra Chrome e Firefox: navigando da tastiera la
    // pagina sembrava di un altro progetto.
    MuiCssBaseline: {
      styleOverrides: {
        "*:focus-visible": {
          outline: `2px solid ${color.focusBlue}`,
          outlineOffset: "2px",
        },
      },
    },
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
