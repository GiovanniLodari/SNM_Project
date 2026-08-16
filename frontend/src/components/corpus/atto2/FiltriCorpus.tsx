import {
  Box,
  Button,
  InputAdornment,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Search as SearchIcon, Close as ClearIcon } from "@mui/icons-material";
import EtichettaMono from "../../narrativa/EtichettaMono.tsx";
import { AUTORI, ORDINAMENTI, nomeLingua } from "../corpusContent.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";

interface Props {
  lingueDisponibili: readonly string[];
  lingueSelezionate: readonly string[];
  onCambiaLingua: (codice: string) => void;
  onAzzeraFiltri: () => void;
  ricerca: string;
  onCambiaRicerca: (valore: string) => void;
  autore: string;
  onCambiaAutore: (valore: string) => void;
  ordinamento: string;
  onCambiaOrdinamento: (valore: string) => void;
  /**
   * Post che soddisfano i filtri. `undefined` finche' la risposta non e'
   * arrivata, `null` quando il backend non lo calcola (ricerca attiva: il
   * conteggio esatto costerebbe una scansione completa della tabella).
   */
  risultati?: number | null;
}

/**
 * I controlli dell'archivio: ricerca nel testo, tipo di autore, ordinamento e
 * lingue.
 *
 * Le lingue sono chip coral di taglia piena (DESIGN.md, `blog-filter-chip`) e
 * non caselle di spunta in una colonna laterale: sono la tassonomia del
 * capitolo, e nel sistema Cohere la tassonomia e' un controllo di primo piano.
 * Averle in orizzontale libera anche la larghezza intera per i post, che e' il
 * contenuto vero della pagina.
 */
export default function FiltriCorpus({
  lingueDisponibili,
  lingueSelezionate,
  onCambiaLingua,
  onAzzeraFiltri,
  ricerca,
  onCambiaRicerca,
  autore,
  onCambiaAutore,
  ordinamento,
  onCambiaOrdinamento,
  risultati,
}: Props) {
  const filtriAttivi =
    lingueSelezionate.length > 0 || ricerca.trim() !== "" || autore !== "tutti";

  return (
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: tokens.radius.xl,
        border: tokens.border.subtle,
        backgroundColor: tokens.color.surfaceWarm,
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
          mb: 3,
        }}
      >
        <TextField
          value={ricerca}
          onChange={(evento) => onCambiaRicerca(evento.target.value)}
          placeholder="Cerca una parola nel testo dei post"
          // Dentro `inputProps` e non sulla radice: MUI passa gli attributi
          // sconosciuti al `FormControl` esterno, quindi un `aria-label` scritto
          // qui sopra finirebbe su un <div> e il campo resterebbe senza nome.
          inputProps={{ "aria-label": "Cerca nel testo dei post" }}
          size="small"
          sx={{
            flex: "1 1 280px",
            "& .MuiOutlinedInput-root": {
              backgroundColor: tokens.color.canvas,
              borderRadius: tokens.radius.pill,
              fontSize: "15px",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: tokens.color.textMuted }} />
              </InputAdornment>
            ),
            endAdornment: ricerca ? (
              <InputAdornment position="end">
                <Button
                  onClick={() => onCambiaRicerca("")}
                  aria-label="Cancella la ricerca"
                  sx={{ minWidth: 0, p: 0.5, borderRadius: "50%", color: tokens.color.textMuted }}
                >
                  <ClearIcon sx={{ fontSize: 16 }} />
                </Button>
              </InputAdornment>
            ) : null,
          }}
        />

        <ToggleButtonGroup
          value={autore}
          exclusive
          size="small"
          onChange={(_evento, valore: string | null) => {
            if (valore) onCambiaAutore(valore);
          }}
          aria-label="Tipo di autore"
          sx={{
            backgroundColor: tokens.color.canvas,
            "& .MuiToggleButton-root": {
              borderRadius: tokens.radius.pill,
              px: 2,
              py: 0.6,
              fontSize: "13px",
              textTransform: "none",
              borderColor: tokens.color.border,
              "&.Mui-selected": {
                backgroundColor: tokens.color.nearBlack,
                color: tokens.color.canvas,
                "&:hover": { backgroundColor: tokens.color.nearBlackHover },
              },
            },
          }}
        >
          {AUTORI.map((opzione) => (
            <ToggleButton key={opzione.valore} value={opzione.valore}>
              {opzione.etichetta}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <TextField
          select
          size="small"
          value={ordinamento}
          onChange={(evento) => onCambiaOrdinamento(evento.target.value)}
          SelectProps={{ inputProps: { "aria-label": "Ordinamento dei post" } }}
          sx={{
            minWidth: 180,
            "& .MuiOutlinedInput-root": {
              backgroundColor: tokens.color.canvas,
              borderRadius: tokens.radius.pill,
              fontSize: "14px",
            },
          }}
        >
          {ORDINAMENTI.map((opzione) => (
            <MenuItem key={opzione.valore} value={opzione.valore} sx={{ fontSize: "14px" }}>
              {opzione.etichetta}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <EtichettaMono taglia="micro" sx={{ mb: 1.5 }}>
        Lingua dichiarata
      </EtichettaMono>

      {lingueDisponibili.length > 0 ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {lingueDisponibili.map((codice) => {
            const attiva = lingueSelezionate.includes(codice);
            return (
              <Box
                key={codice}
                component="button"
                type="button"
                onClick={() => onCambiaLingua(codice)}
                aria-pressed={attiva}
                // Il nome accessibile va dichiarato: il contenuto e' un codice
                // ISO accostato al nome senza spazio, che uno screen reader
                // leggerebbe come una parola sola ("ITItaliano").
                aria-label={`Filtra per lingua: ${nomeLingua(codice)}`}
                sx={{
                  cursor: "pointer",
                  fontFamily: tokens.font.body,
                  fontSize: "15px",
                  lineHeight: 1.2,
                  px: 2.25,
                  py: 1,
                  borderRadius: tokens.radius.chip,
                  border: `1px solid ${attiva ? tokens.color.coral : tokens.color.coralLight}`,
                  backgroundColor: attiva ? tokens.color.coral : tokens.color.surfaceCoral,
                  // Nero anche da attiva: il bianco sul coral da' 2.6:1, il nero
                  // 6.8:1. Lo stato lo dicono il fondo pieno e `aria-pressed`,
                  // non l'inversione del testo.
                  color: tokens.color.nearBlack,
                  transition: "background-color 0.15s ease, color 0.15s ease",
                  "&:hover": {
                    backgroundColor: attiva ? tokens.color.coralDark : tokens.color.coralLight,
                  },
                }}
              >
                <Box component="span" sx={{ fontFamily: tokens.font.mono, fontSize: "13px", mr: 0.75 }}>
                  {codice.toUpperCase()}
                </Box>
                {nomeLingua(codice)}
              </Box>
            );
          })}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
          Nessuna lingua dichiarata nel corpus.
        </Typography>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          mt: 3,
          pt: 2.5,
          borderTop: tokens.border.subtle,
        }}
      >
        <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
          {risultati === undefined
            ? "Conteggio in corso…"
            : risultati === null
              ? "Con la ricerca attiva il totale non viene calcolato: scorri per vedere quanti sono."
              : `${formatNumber(risultati)} post corrispondono ai filtri`}
        </Typography>
        {filtriAttivi && (
          <Button
            variant="text"
            onClick={onAzzeraFiltri}
            sx={{ color: tokens.color.actionBlue, textDecoration: "underline", fontSize: "13px", p: 0 }}
          >
            Azzera i filtri
          </Button>
        )}
      </Box>
    </Box>
  );
}
