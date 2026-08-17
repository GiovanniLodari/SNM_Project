import { Box, MenuItem, Select, Typography, type SelectChangeEvent } from "@mui/material";
import EtichettaMono from "../../narrativa/EtichettaMono.tsx";
import { MODELLI, type IdModello, type Modello } from "../detectionContent.ts";
import { tokens } from "../../../theme.ts";

interface Props {
  modello: Modello;
  onChange: (id: IdModello) => void;
}

/**
 * Menu a tendina con cui si sceglie quale rilevatore leggere.
 *
 * Sostituisce quattro voci di navigazione che aprivano la stessa identica
 * pagina cambiando un parametro: la ripetizione faceva sembrare quattro
 * sezioni diverse cio' che e' un solo strumento applicato a quattro modelli, e
 * per confrontarli bisognava ricordarsi i numeri passando da una voce
 * all'altra. Con un controllo unico il confronto avviene sul posto, perche' il
 * resto della pagina non si muove.
 *
 * Reso come pill con bordo (DESIGN.md, `button-pill-outline`) e non come campo
 * di modulo: non e' un dato che si compila, e' un filtro sulla vista.
 */
export default function SelettoreModello({ modello, onChange }: Props) {
  const gestisciCambio = (evento: SelectChangeEvent) => {
    onChange(evento.target.value as IdModello);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: { xs: 1.5, sm: 3 },
        mb: 4,
      }}
    >
      <EtichettaMono component="span">Rilevatore</EtichettaMono>

      <Select
        value={modello.id}
        onChange={gestisciCambio}
        inputProps={{ "aria-label": "Scegli il rilevatore" }}
        sx={{
          borderRadius: tokens.radius.chip,
          backgroundColor: "transparent",
          fontFamily: tokens.font.display,
          fontSize: "18px",
          minWidth: { xs: "100%", sm: 320 },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.color.nearBlack },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: tokens.color.nearBlack },
          "& .MuiSelect-select": { py: 1.25, px: 2.5 },
        }}
        // Il menu eredita il raggio delle superfici invece dell'angolo vivo
        // predefinito di MUI, che era l'unico spigolo netto della pagina.
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: tokens.radius.md,
              border: tokens.border.subtle,
              mt: 1,
            },
          },
        }}
        renderValue={(valore) => {
          const scelto = MODELLI.find((m) => m.id === valore) ?? modello;
          return (
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
              <span>{scelto.nome}</span>
              <Box
                component="span"
                sx={{ fontFamily: tokens.font.mono, fontSize: "12px", color: tokens.color.textMuted }}
              >
                {scelto.famiglia}
              </Box>
            </Box>
          );
        }}
      >
        {MODELLI.map((voce) => (
          <MenuItem key={voce.id} value={voce.id} sx={{ py: 1.5 }}>
            <Box>
              <Typography sx={{ fontFamily: tokens.font.display, fontSize: "16px" }}>
                {voce.nome}
              </Typography>
              <Box
                component="span"
                sx={{
                  fontFamily: tokens.font.mono,
                  fontSize: "12px",
                  color: tokens.color.textMuted,
                }}
              >
                {voce.famiglia} · {voce.tipo}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>

      <Typography
        variant="body2"
        sx={{ color: tokens.color.textMuted, maxWidth: "42ch", flexBasis: { xs: "100%", md: "auto" } }}
      >
        I quattro rilevatori leggono lo stesso corpus: cambiando modello cambiano i numeri,
        non i post disponibili.
      </Typography>
    </Box>
  );
}
