import { forwardRef } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  MenuItem,
  Paper,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { SmartToy as BotIcon, ExpandMore as AltroIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";
import type { Post } from "../../../api/client.ts";
import PastiglieRilevatori from "./PastiglieRilevatori.tsx";
import { EmptyState, ErrorState } from "../../States.tsx";
import { TINTA_BOT } from "../../dati/tinte.ts";
import { tokens } from "../../../theme.ts";
import { formatDateTime, formatNumber } from "../../../utils/format.ts";

interface Props {
  post: readonly Post[];
  errore: boolean;
  /** Vero solo al primissimo caricamento, quando non c'e' nulla a schermo. */
  caricamentoIniziale: boolean;
  /** Vero mentre l'elenco viene rifatto da capo con quello vecchio ancora visibile. */
  staAggiornando: boolean;
  caricandoAltro: boolean;
  altroDisponibile: boolean;
  onCaricaAltro: () => void;
  postPerBlocco: number;
  onCambiaPostPerBlocco: (valore: number) => void;
  /**
   * Post che soddisfano i filtri, per dire quanti restano da vedere. `null`
   * quando il backend non lo calcola: allora si dichiara solo quanti sono a
   * schermo.
   */
  totale?: number | null;
  /** Avviso di fine corsa, es. il tetto ai blocchi caricabili. */
  avvisoLimite?: string | null;
}

const BLOCCHI_DISPONIBILI = [10, 25, 50];

/**
 * L'archivio vero e proprio: righe separate da filetti, non card.
 *
 * DESIGN.md riserva le card ai media e tiene gli elenchi editoriali su righe
 * alte con regole sottili (`research-table`): e' anche la forma che regge
 * meglio lo scorrimento lungo, perche' non moltiplica i bordi mentre si scende.
 *
 * Il riferimento inoltrato e' la sentinella dello scorrimento infinito: sta in
 * fondo, e chi usa il componente decide cosa fare quando entra in vista.
 */
const ElencoCorpus = forwardRef<HTMLDivElement, Props>(function ElencoCorpus(
  {
    post,
    errore,
    caricamentoIniziale,
    staAggiornando,
    caricandoAltro,
    altroDisponibile,
    onCaricaAltro,
    postPerBlocco,
    onCambiaPostPerBlocco,
    totale,
    avvisoLimite,
  },
  sentinella,
) {
  if (errore) {
    return <ErrorState message="Impossibile caricare l'elenco dei post. Verificare che il backend sia in esecuzione." />;
  }

  if (caricamentoIniziale) {
    return (
      <Paper sx={{ borderRadius: tokens.radius.xl, border: tokens.border.subtle, overflow: "hidden" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Box key={i} sx={{ p: 3, borderBottom: i < 5 ? tokens.border.subtle : "none" }}>
            <Skeleton variant="text" width="35%" height={22} sx={{ mb: 1.5 }} />
            <Skeleton variant="text" width="100%" height={18} />
            <Skeleton variant="text" width="80%" height={18} />
          </Box>
        ))}
      </Paper>
    );
  }

  if (post.length === 0) {
    return (
      <EmptyState message="Nessun post corrisponde ai filtri selezionati. Prova ad allargare la ricerca o a togliere una lingua." />
    );
  }

  return (
    <Box>
      <Paper
        sx={{
          borderRadius: tokens.radius.xl,
          border: tokens.border.subtle,
          overflow: "hidden",
          backgroundColor: tokens.color.canvas,
        }}
      >
        {/* Il filetto di avanzamento occupa il proprio spazio anche da fermo,
            cosi' comparendo non fa scorrere l'elenco di due pixel. */}
        <Box sx={{ height: 2 }}>
          {staAggiornando && (
            <LinearProgress
              sx={{
                height: 2,
                backgroundColor: "transparent",
                "& .MuiLinearProgress-bar": { backgroundColor: tokens.color.nearBlack },
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            opacity: staAggiornando ? 0.55 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          {post.map((riga, indice) => (
            <Box
              component="article"
              key={riga.id}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderTop: indice === 0 ? "none" : tokens.border.subtle,
                transition: "background-color 0.15s ease",
                "&:hover": { backgroundColor: tokens.color.surfaceStone },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 2,
                  flexWrap: "wrap",
                  mb: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                  <Typography
                    component="span"
                    sx={{ fontWeight: 600, fontSize: "15px", color: tokens.color.nearBlack }}
                  >
                    {riga.acct}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{ fontFamily: tokens.font.mono, fontSize: "12px", color: tokens.color.textMuted }}
                  >
                    {riga.domain}
                  </Typography>
                  {riga.language && (
                    <Chip
                      label={riga.language.toUpperCase()}
                      size="small"
                      sx={{
                        height: 20,
                        fontFamily: tokens.font.mono,
                        fontSize: "11px",
                        backgroundColor: tokens.color.surfaceCoral,
                        color: tokens.color.coralInk,
                        border: `1px solid ${tokens.color.coralLight}`,
                      }}
                    />
                  )}
                  {riga.bot && (
                    <Chip
                      icon={<BotIcon style={{ fontSize: 13, color: tokens.color.canvas }} />}
                      label="BOT"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: TINTA_BOT,
                        color: tokens.color.canvas,
                      }}
                    />
                  )}
                </Box>
                <Typography sx={{ ...tokens.type.micro, color: tokens.color.textMuted, flexShrink: 0 }}>
                  {formatDateTime(riga.created_at)}
                </Typography>
              </Box>

              <Typography
                sx={{
                  ...tokens.type.body,
                  color: tokens.color.textPrimary,
                  whiteSpace: "pre-wrap",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  mb: 2,
                }}
              >
                {riga.content}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <PastiglieRilevatori post={riga} />
                <Link
                  to={`/posts/${riga.id}`}
                  style={{
                    color: tokens.color.actionBlue,
                    textDecoration: "underline",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Vedi il dettaglio &rarr;
                </Link>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Coda dell'elenco: la sentinella invisibile carica in anticipo mentre si
          scorre, il bottone resta perche' lo scorrimento automatico e'
          inaccessibile da tastiera e non esiste dove IntersectionObserver
          manca. */}
      <Box
        ref={sentinella}
        sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 3 }}
      >
        {caricandoAltro && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <CircularProgress size={16} sx={{ color: tokens.color.nearBlack }} />
            <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
              Carico altri post…
            </Typography>
          </Box>
        )}

        {altroDisponibile && !caricandoAltro && (
          <Button
            variant="outlined"
            endIcon={<AltroIcon />}
            onClick={onCaricaAltro}
            sx={{ borderRadius: tokens.radius.pill, fontSize: "13px" }}
          >
            Carica altri {postPerBlocco} post
          </Button>
        )}

        {!altroDisponibile && !avvisoLimite && (
          <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
            Fine dell&#39;elenco.
          </Typography>
        )}

        {avvisoLimite && (
          <Typography variant="body2" sx={{ color: tokens.color.textMuted, textAlign: "center" }}>
            {avvisoLimite}
          </Typography>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
          <Typography sx={{ ...tokens.type.micro, color: tokens.color.textMuted }}>
            {formatNumber(post.length)} post a schermo
            {totale != null && totale > post.length ? ` su ${formatNumber(totale)}` : ""}
          </Typography>
          <TextField
            select
            size="small"
            value={postPerBlocco}
            onChange={(evento) => onCambiaPostPerBlocco(Number(evento.target.value))}
            label="Post per blocco"
            sx={{
              minWidth: 140,
              "& .MuiOutlinedInput-root": { borderRadius: tokens.radius.sm, fontSize: "13px" },
              "& .MuiInputLabel-root": { fontSize: "13px" },
            }}
          >
            {BLOCCHI_DISPONIBILI.map((quanti) => (
              <MenuItem key={quanti} value={quanti} sx={{ fontSize: "13px" }}>
                {quanti}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>
    </Box>
  );
});

export default ElencoCorpus;
