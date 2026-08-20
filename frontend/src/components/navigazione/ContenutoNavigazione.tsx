import { Link } from "react-router-dom";
import { Box, IconButton, List, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { tokens } from "../../theme.ts";
import { CAPITOLI } from "../../navigazione.ts";
import IntestazioneCapitoloNav from "./IntestazioneCapitoloNav.tsx";
import VoceNavigazione from "./VoceNavigazione.tsx";
import { DURATA_TRANSIZIONE_MS, LARGHEZZA_SIDEBAR } from "./misure.ts";

interface Props {
  /** Se il pannello e' aperto. Su mobile e' sempre vero. */
  espansa: boolean;
  /** Falso quando il sistema chiede di ridurre le animazioni. */
  animato: boolean;
  /** Chiude il pannello temporaneo su mobile dopo un clic. */
  onNavigate?: () => void;
  /** Se il pannello e' tenuto aperto per scelta. Assente nel pannello di mobile. */
  bloccata?: boolean;
  /**
   * Comando di blocco. Quando manca, il comando non viene reso: nel pannello
   * temporaneo di mobile non ha senso, li' il pannello e' gia' a larghezza piena
   * e si chiude toccando fuori.
   */
  onCambiaBlocco?: () => void;
}

/**
 * Il contenuto del pannello: marchio, capitoli, stato del sistema.
 *
 * Resta sempre largo `LARGHEZZA_SIDEBAR` anche quando il foglio che lo contiene
 * e' stretto alla colonna delle icone: a chiudersi e' il foglio, e cio' che
 * avanza viene ritagliato. Se invece si restringesse anche il contenuto, ogni
 * apertura manderebbe a capo le etichette per una frazione di secondo prima di
 * riportarle su una riga - il tipo di sfarfallio che si nota solo quando c'e'.
 */
export default function ContenutoNavigazione({
  espansa,
  animato,
  onNavigate,
  bloccata,
  onCambiaBlocco,
}: Props) {
  const dissolvenza = animato ? `opacity ${DURATA_TRANSIZIONE_MS}ms ease` : "none";

  return (
    <Box
      sx={{
        backgroundColor: tokens.color.canvas,
        width: LARGHEZZA_SIDEBAR,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2,
        overflowX: "hidden",
        overflowY: "auto",
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": {
          width: "4px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: tokens.color.borderStrong,
          borderRadius: tokens.radius.xs,
        },
      }}
    >
      {/* Il comando che tiene aperto il pannello.
          Sta in una riga sua e allineato a sinistra perche' deve restare
          visibile anche a pannello chiuso: nella colonna delle icone si vedono i
          primi 72px, e un comando fuori da quella striscia sarebbe raggiungibile
          solo dopo essere riusciti ad aprire il pannello, cioe' esattamente il
          giro che questo comando esiste per rompere. */}
      {onCambiaBlocco && (
        <Box sx={{ display: "flex", mb: 0.5 }}>
          <IconButton
            onClick={onCambiaBlocco}
            // Solo `aria-expanded`: il comando vive dentro il pannello che apre,
            // quindi un `aria-controls` che punta a un proprio antenato non
            // aggiungerebbe niente a chi ascolta. L'`aria-controls` serve al
            // pulsante della barra superiore, che sta fuori dal pannello.
            aria-expanded={Boolean(bloccata)}
            aria-label={
              bloccata
                ? "Richiudi la navigazione nella colonna di icone"
                : "Tieni aperta la navigazione"
            }
            sx={{
              width: 40,
              height: 40,
              color: tokens.color.textMuted,
              borderRadius: tokens.radius.sm,
              transition: "background-color 0.15s ease, color 0.15s ease",
              "&:hover": {
                backgroundColor: tokens.color.softStone,
                color: tokens.color.nearBlack,
              },
            }}
          >
            {bloccata ? <ChevronLeft sx={{ fontSize: 20 }} /> : <ChevronRight sx={{ fontSize: 20 }} />}
          </IconButton>
        </Box>
      )}

      {/* Marchio e monogramma */}
      <Box
        component={Link}
        to="/"
        onClick={onNavigate}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1,
          py: 1.5,
          mb: 1,
          textDecoration: "none",
          color: "inherit",
          borderRadius: tokens.radius.sm,
          transition: "background-color 0.15s ease",
          "&:hover": {
            backgroundColor: tokens.color.surfaceStone,
          },
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.color.nearBlack,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tokens.color.canvas,
            fontFamily: tokens.font.display,
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "-0.5px",
            flexShrink: 0,
          }}
        >
          SNM
        </Box>
        <Box
          sx={{
            minWidth: 0,
            flexGrow: 1,
            opacity: espansa ? 1 : 0,
            transition: dissolvenza,
          }}
        >
          <Typography
            sx={{
              fontFamily: tokens.font.display,
              fontWeight: 700,
              fontSize: "15px",
              lineHeight: 1.2,
              color: tokens.color.nearBlack,
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            SNM.Intelligence
          </Typography>
          <Typography
            sx={{
              fontFamily: tokens.font.mono,
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: tokens.color.textMuted,
              textTransform: "uppercase",
              lineHeight: 1.2,
              mt: 0.25,
              whiteSpace: "nowrap",
            }}
          >
            Analisi del Fediverso
          </Typography>
        </Box>
      </Box>

      {/* Navigazione ordinata per capitoli della pipeline */}
      <Box sx={{ flexGrow: 1 }}>
        {CAPITOLI.map((capitolo) => (
          <Box key={capitolo.id} component="section" sx={{ mb: 0.5 }}>
            {/* La panoramica non e' un capitolo: e' la porta d'ingresso, e un
                titolo sopra la sua unica voce direbbe due volte la stessa cosa. */}
            {capitolo.id !== "panoramica" && (
              <IntestazioneCapitoloNav
                numero={capitolo.numero}
                etichetta={capitolo.etichetta}
                espansa={espansa}
                animato={animato}
              />
            )}

            <List sx={{ p: 0 }}>
              {capitolo.voci.map((voce) => (
                <VoceNavigazione
                  key={voce.path}
                  voce={voce}
                  espansa={espansa}
                  animato={animato}
                  onNavigate={onNavigate}
                />
              ))}
            </List>
          </Box>
        ))}
      </Box>

      {/* Stato del sistema, in fondo */}
      <Box
        sx={{
          pt: 2,
          pb: 0.5,
          px: 1,
          mt: "auto",
          borderTop: tokens.border.subtle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: tokens.color.success,
              boxShadow: `0 0 6px ${tokens.color.success}`,
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontFamily: tokens.font.mono,
              fontSize: "11px",
              color: tokens.color.textMuted,
              fontWeight: 500,
              whiteSpace: "nowrap",
              opacity: espansa ? 1 : 0,
              transition: dissolvenza,
            }}
          >
            Fediverso Live
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: tokens.font.mono,
            fontSize: "10px",
            color: tokens.color.textMuted,
            opacity: espansa ? 1 : 0,
            transition: dissolvenza,
          }}
        >
          v1.0
        </Typography>
      </Box>
    </Box>
  );
}
