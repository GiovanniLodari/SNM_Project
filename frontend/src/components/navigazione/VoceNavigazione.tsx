import { Link, useLocation } from "react-router-dom";
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { tokens } from "../../theme.ts";
import { isRouteActive } from "../../utils/navigation.ts";
import { prefetchRouteData } from "../../api/queries.ts";
import { CARICATORI_ROTTA } from "../../rotte.ts";
import type { VoceNav } from "../../navigazione.ts";
import { DURATA_TRANSIZIONE_MS } from "./misure.ts";

interface Props {
  voce: VoceNav;
  /** Se il pannello e' aperto: a riposo l'etichetta svanisce, l'icona resta. */
  espansa: boolean;
  /** Falso quando il sistema chiede di ridurre le animazioni. */
  animato: boolean;
  /** Chiude il pannello temporaneo su mobile dopo un clic. */
  onNavigate?: () => void;
}

/**
 * Una voce della sidebar: icona sempre visibile, etichetta solo a pannello
 * aperto.
 *
 * L'etichetta svanisce in opacita' e non esce dal documento. Toglierla davvero
 * (`display: none`, o non renderizzarla) cambierebbe il nome accessibile del
 * collegamento a seconda della posizione del mouse: chi naviga con uno screen
 * reader si troverebbe otto link chiamati come la loro icona, cioe' per niente.
 */
export default function VoceNavigazione({ voce, espansa, animato, onNavigate }: Props) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const selezionata = isRouteActive(location.pathname, voce.path);
  const Icona = voce.icona;

  const anticipa = () => {
    // 1. Pre-scarica il bundle JS del componente lazy
    CARICATORI_ROTTA[voce.path]?.();
    // 2. Pre-scarica i dati delle API via TanStack Query
    prefetchRouteData(queryClient, voce.path);
  };

  return (
    <ListItem disablePadding sx={{ mb: 0.3 }}>
      <ListItemButton
        component={Link}
        to={voce.path}
        selected={selezionata}
        onClick={onNavigate}
        onMouseEnter={anticipa}
        onFocus={anticipa}
        onTouchStart={anticipa}
        sx={{
          py: 0.85,
          px: 1.25,
          borderRadius: tokens.radius.sm,
          // Con un puntatore grosso - un dito - la voce arriva a 44px. A riposo
          // ne misura circa 34, che su un mouse e' densita' giusta e su un
          // touchscreen e' un bersaglio sotto la soglia. La misura cambia con il
          // puntatore, non con la larghezza dello schermo: un portatile touch e'
          // largo e si usa col dito.
          "@media (pointer: coarse)": { minHeight: 44 },
          transition: "background-color 0.15s ease-in-out",
          "&.Mui-selected": {
            backgroundColor: tokens.color.nearBlack,
            color: tokens.color.canvas,
            "&:hover": {
              backgroundColor: tokens.color.nearBlackHover,
            },
            "& .MuiListItemIcon-root": {
              color: tokens.color.coral,
            },
            "& .MuiListItemText-primary": {
              color: tokens.color.canvas,
              fontWeight: 600,
            },
          },
          "&:hover": {
            backgroundColor: selezionata ? tokens.color.nearBlackHover : tokens.color.softStone,
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 28,
            color: selezionata ? tokens.color.coral : tokens.color.textMuted,
            transition: "color 0.15s ease",
          }}
        >
          <Icona sx={{ fontSize: 18 }} />
        </ListItemIcon>
        <ListItemText
          primary={voce.testo}
          sx={{
            opacity: espansa ? 1 : 0,
            transition: animato ? `opacity ${DURATA_TRANSIZIONE_MS}ms ease` : "none",
          }}
          primaryTypographyProps={{
            fontFamily: tokens.font.body,
            fontWeight: selezionata ? 600 : 500,
            fontSize: "13.5px",
            color: selezionata ? tokens.color.canvas : tokens.color.textPrimary,
            whiteSpace: "nowrap",
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}
