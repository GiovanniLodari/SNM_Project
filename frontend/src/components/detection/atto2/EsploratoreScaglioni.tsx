import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import type { AiDetectionResponse } from "../../../api/client.ts";
import type { Modello } from "../detectionContent.ts";
import { tokens } from "../../../theme.ts";

/** Post mostrati per pagina dentro uno scaglione. */
const POST_PER_PAGINA = 5;

interface Props {
  campioni: NonNullable<AiDetectionResponse["bucket_samples"]>;
  modello: Modello;
  scaglioneAttivo: string;
  onCambiaScaglione: (nome: string) => void;
  pagina: number;
  onCambiaPagina: (pagina: number) => void;
}

/**
 * Lettura dei post di una singola fascia di probabilita'.
 *
 * E' il punto in cui il capitolo smette di essere fatto di aggregati: una
 * distribuzione non dice se il modello abbia ragione, mentre leggere cinque
 * post che ha marcato al 95% lo dice subito. Una fascia per volta a piena
 * larghezza, perche' affiancarle in colonne da 200px rendeva illeggibile
 * proprio il testo che questa sezione esiste per mostrare.
 */
export default function EsploratoreScaglioni({
  campioni,
  modello,
  scaglioneAttivo,
  onCambiaScaglione,
  pagina,
  onCambiaPagina,
}: Props) {
  const nomi = Object.keys(campioni);
  // Lo stato in URL puo' contenere una fascia che questo modello non espone
  // (link condiviso, cambio di dati): si ripiega sulla prima disponibile
  // invece di mostrare il vuoto.
  const corrente = nomi.includes(scaglioneAttivo) ? scaglioneAttivo : nomi[0] ?? "";
  const postScaglione = campioni[corrente] ?? [];

  const pagineTotali = Math.max(1, Math.ceil(postScaglione.length / POST_PER_PAGINA));
  const paginaCorrente = Math.min(Math.max(1, pagina), pagineTotali);
  const visibili = postScaglione.slice(
    (paginaCorrente - 1) * POST_PER_PAGINA,
    paginaCorrente * POST_PER_PAGINA,
  );

  return (
    <Paper
      sx={{
        p: 4,
        borderRadius: tokens.radius.xl,
        border: tokens.border.subtle,
        backgroundColor: tokens.color.surfaceWarm,
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          component="h3"
          sx={{ ...tokens.type.featureHeading, color: tokens.color.nearBlack }}
        >
          Leggere i post fascia per fascia
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5, maxWidth: "70ch" }}>
          Campioni di post per ciascuna fascia di confidenza di <strong>{modello.nome}</strong>.
          Scegli una fascia per leggerne i post.
        </Typography>
      </Box>

      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 3 }}>
        {nomi.map((nome) => {
          const attivo = nome === corrente;
          return (
            <Button
              key={nome}
              onClick={() => onCambiaScaglione(nome)}
              disableElevation
              aria-pressed={attivo}
              sx={{
                textTransform: "none",
                borderRadius: tokens.radius.chip,
                px: 2.5,
                py: 0.75,
                fontSize: "14px",
                fontWeight: attivo ? 600 : 500,
                color: attivo ? tokens.color.canvas : tokens.color.nearBlack,
                backgroundColor: attivo ? tokens.color.nearBlack : "transparent",
                border: `1px solid ${attivo ? tokens.color.nearBlack : tokens.color.borderStrong}`,
                "&:hover": {
                  backgroundColor: attivo ? tokens.color.nearBlack : tokens.color.softStone,
                },
              }}
            >
              {nome}
              <Box
                component="span"
                sx={{
                  ml: 1,
                  fontFamily: tokens.font.mono,
                  fontSize: "12px",
                  color: attivo ? tokens.color.textFaint : tokens.color.textMuted,
                }}
              >
                {campioni[nome]?.length ?? 0}
              </Box>
            </Button>
          );
        })}
      </Stack>

      {postScaglione.length === 0 ? (
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontStyle: "italic", py: 4 }}>
          Nessun post presente in questa fascia.
        </Typography>
      ) : (
        <>
          <Box sx={{ borderTop: tokens.border.subtle }}>
            {visibili.map(({ post, probability }) => (
              <Box
                key={post.id}
                sx={{
                  display: "flex",
                  gap: 3,
                  py: 3,
                  borderBottom: tokens.border.subtle,
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, color: tokens.color.nearBlack, mb: 0.5 }}
                  >
                    {post.acct}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      color: tokens.color.textPrimary,
                      lineHeight: 1.5,
                      mb: 1.5,
                    }}
                  >
                    {post.content}
                  </Typography>
                  <Link
                    to={`/posts/${post.id}`}
                    style={{
                      color: tokens.color.actionBlue,
                      textDecoration: "underline",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    Vedi il post &rarr;
                  </Link>
                </Box>

                <Box sx={{ flexShrink: 0, textAlign: "right", minWidth: 92 }}>
                  <Typography
                    sx={{
                      fontFamily: tokens.font.mono,
                      fontSize: "20px",
                      fontWeight: 600,
                      lineHeight: 1.2,
                      color: probability >= 0.5 ? modello.accento : tokens.color.textMuted,
                    }}
                  >
                    {(probability * 100).toFixed(1)}%
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", color: tokens.color.textMuted, fontSize: "11px" }}
                  >
                    probabilita&#39; IA
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 0.5,
                      fontFamily: tokens.font.mono,
                      fontSize: "11px",
                      color: tokens.color.textFaint,
                    }}
                  >
                    #{post.id}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={paginaCorrente <= 1}
              onClick={() => onCambiaPagina(paginaCorrente - 1)}
              sx={{ borderRadius: tokens.radius.pill, fontSize: "13px" }}
            >
              &larr; Indietro
            </Button>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontWeight: 500 }}>
              Pagina {paginaCorrente} di {pagineTotali} &middot; {postScaglione.length} post
            </Typography>
            <Button
              size="small"
              variant="outlined"
              disabled={paginaCorrente >= pagineTotali}
              onClick={() => onCambiaPagina(paginaCorrente + 1)}
              sx={{ borderRadius: tokens.radius.pill, fontSize: "13px" }}
            >
              Avanti &rarr;
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
}
