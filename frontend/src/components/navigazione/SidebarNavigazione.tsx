import { useState } from "react";
import type { FocusEvent } from "react";
import { Box, Drawer } from "@mui/material";
import { tokens } from "../../theme.ts";
import { useMovimentoRidotto } from "../../hooks/useMovimentoRidotto.ts";
import ContenutoNavigazione from "./ContenutoNavigazione.tsx";
import {
  DURATA_TRANSIZIONE_MS,
  ID_NAVIGAZIONE_MOBILE,
  LARGHEZZA_RAIL,
  LARGHEZZA_SIDEBAR,
} from "./misure.ts";

interface Props {
  /** Stato del pannello temporaneo di mobile, comandato dalla barra superiore. */
  mobileAperta: boolean;
  onChiudiMobile: () => void;
  /**
   * Se il pannello e' tenuto aperto per scelta. Vive in App perche' l'area
   * contenuto si ridimensiona con lui: a pannello bloccato la pagina gli fa
   * spazio invece di lasciarselo coprire.
   */
  bloccata: boolean;
  onCambiaBlocco: () => void;
}

/**
 * La navigazione principale: colonna di icone che si apre quando la si sfiora,
 * o che si tiene aperta con il suo comando.
 *
 * Su desktop il pannello sta a riposo largo quanto le sue icone. Si allarga in
 * due modi, e la differenza non e' cosmetica:
 *
 * - **Al passaggio del mouse o del focus**, scorrendo *sopra* il contenuto: il
 *   foglio e' in posizione fissa, quindi la pagina sotto non si accorge di nulla
 *   e non viene ridisegnata. E' il caso frequente e transitorio, e ridisegnare a
 *   ogni passaggio del mouse significherebbe rifare il canvas del grafo e i
 *   grafici della dashboard.
 * - **Con il comando di blocco**, spingendo il contenuto: chi lo preme ha
 *   chiesto che le etichette restino, e un pannello che copre per sempre un
 *   quinto della pagina non e' quello che ha chiesto. E' il caso raro e
 *   deliberato, quindi il costo del riflusso si paga volentieri.
 *
 * Il comando esiste perche' l'hover non e' disponibile a tutti. Sotto `sm` c'e'
 * il pannello temporaneo con il suo pulsante nella barra, ma da 600px in su
 * c'era solo l'hover: su un tablet o un portatile touch le etichette restavano
 * a `opacity: 0` per sempre, e toccare una voce navigava prima che si potesse
 * leggerne il nome. La navigazione era otto icone senza nome, ed e' esattamente
 * cio' che PRODUCT.md vieta quando dice che nessuna informazione va affidata a
 * un passaggio del mouse.
 *
 * L'apertura da puntatore risponde a due segnali tenuti distinti di proposito,
 * il mouse e il focus. Con il solo hover, chi arriva alle voci con il tasto Tab
 * sposterebbe il focus dentro un pannello chiuso, su etichette invisibili: si
 * vedrebbe il contorno del collegamento e non il suo nome. Tenendoli separati il
 * pannello resta aperto finche' *almeno uno* dei due lo richiede, e non si
 * richiude appena il mouse esce da una voce ancora selezionata da tastiera.
 */
export default function SidebarNavigazione({
  mobileAperta,
  onChiudiMobile,
  bloccata,
  onCambiaBlocco,
}: Props) {
  const [puntata, setPuntata] = useState(false);
  const [focalizzata, setFocalizzata] = useState(false);
  const movimentoRidotto = useMovimentoRidotto();

  const espansa = puntata || focalizzata || bloccata;
  const animato = !movimentoRidotto;

  /**
   * Il focus che si sposta da una voce all'altra passa da un `focusout` prima
   * del `focusin` successivo: senza questo controllo il pannello si
   * richiuderebbe e riaprirebbe a ogni Tab.
   */
  const gestisciUscitaFocus = (evento: FocusEvent<HTMLElement>) => {
    if (evento.currentTarget.contains(evento.relatedTarget)) return;
    setFocalizzata(false);
  };

  return (
    <Box
      component="nav"
      aria-label="Navigazione principale"
      onMouseEnter={() => setPuntata(true)}
      onMouseLeave={() => setPuntata(false)}
      onFocus={() => setFocalizzata(true)}
      onBlur={gestisciUscitaFocus}
      // La larghezza dello spazio riservato cambia di scatto e non in
      // animazione: e' una proprieta' di layout, e animarla vorrebbe dire
      // ricalcolare il layout dell'intera pagina per una decina di fotogrammi -
      // compreso il canvas del grafo. Il foglio del pannello si anima perche' e'
      // in posizione fissa, quindi fuori dal flusso: lo stesso valore, due costi
      // diversi.
      sx={{
        width: { sm: bloccata ? LARGHEZZA_SIDEBAR : LARGHEZZA_RAIL },
        flexShrink: { sm: 0 },
      }}
    >
      <Drawer
        variant="temporary"
        open={mobileAperta}
        onClose={onChiudiMobile}
        ModalProps={{
          keepMounted: true,
        }}
        PaperProps={{ id: ID_NAVIGAZIONE_MOBILE }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: LARGHEZZA_SIDEBAR,
            borderRight: tokens.border.subtle,
          },
        }}
      >
        <ContenutoNavigazione espansa animato={animato} onNavigate={onChiudiMobile} />
      </Drawer>

      <Drawer
        variant="permanent"
        open
        PaperProps={{
          "data-testid": "sidebar-desktop",
          // La larghezza e' l'unica proprieta' che cambia con lo stato: darla in
          // linea evita a emotion di generare una classe per ciascuno dei due
          // valori, e la rende leggibile a chi ispeziona l'elemento.
          style: { width: espansa ? LARGHEZZA_SIDEBAR : LARGHEZZA_RAIL },
        }}
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            borderRight: tokens.border.subtle,
            borderTop: "none",
            borderLeft: "none",
            borderBottom: "none",
            backgroundColor: tokens.color.canvas,
            overflowX: "hidden",
            // Sopra la barra superiore: aperto per hover il pannello ne copre il
            // bordo sinistro, ed e' cio' che deve fare - sta scorrendo sopra la
            // pagina, non accanto.
            zIndex: (tema) => tema.zIndex.appBar + 1,
            // L'ombra compare solo quando il pannello copre davvero qualcosa,
            // cioe' aperto per hover. A pannello bloccato la pagina gli ha fatto
            // spazio e non c'e' niente sotto da cui staccarsi: l'ombra lo farebbe
            // galleggiare senza motivo, ed e' il caso che DESIGN.md esclude.
            boxShadow: espansa && !bloccata ? tokens.overlay.ombraPannello : "none",
            transition: animato
              ? `width ${DURATA_TRANSIZIONE_MS}ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow ${DURATA_TRANSIZIONE_MS}ms ease`
              : "none",
          },
        }}
      >
        <ContenutoNavigazione
          espansa={espansa}
          animato={animato}
          bloccata={bloccata}
          onCambiaBlocco={onCambiaBlocco}
        />
      </Drawer>
    </Box>
  );
}
