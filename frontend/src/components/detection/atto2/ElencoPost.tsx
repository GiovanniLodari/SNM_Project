import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  ArrowBack as PrevIcon,
  ArrowForward as NextIcon,
  ArrowDownward as BottomIcon,
  ArrowUpward as TopIcon,
  FormatListNumbered as IdIcon,
  SmartToy as BotIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import type { AiDetectionResponse } from "../../../api/client.ts";
import type { Modello } from "../detectionContent.ts";
import EtichettaMono from "../../narrativa/EtichettaMono.tsx";
import { EmptyState } from "../../States.tsx";
import { tokens } from "../../../theme.ts";

interface Props {
  dati?: AiDetectionResponse;
  modello: Modello;
  caricamento: boolean;
  errore: boolean;
  ordinamento: string;
  onCambiaOrdinamento: (ordinamento: string) => void;
  quartiliSelezionati: string[];
  onCambiaQuartile: (quartile: string) => void;
  pagina: number;
  onCambiaPagina: (pagina: number) => void;
}

/**
 * Elenco completo dei post valutati, con ordinamento e filtro per quartile.
 *
 * I due controlli a sinistra rispondono a due domande diverse: l'ordinamento
 * porta in cima i casi estremi (cosa ha convinto di piu' il modello, cosa di
 * meno), i quartili restringono a una fascia. Sono separati perche' combinarli
 * in un unico controllo costringerebbe a scegliere fra le due letture.
 */
export default function ElencoPost({
  dati,
  modello,
  caricamento,
  errore,
  ordinamento,
  onCambiaOrdinamento,
  quartiliSelezionati,
  onCambiaQuartile,
  pagina,
  onCambiaPagina,
}: Props) {
  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={3}>
        <Paper
          sx={{
            p: 3,
            borderRadius: tokens.radius.lg,
            border: tokens.border.subtle,
            backgroundColor: tokens.color.canvas,
            mb: 3,
          }}
        >
          <EtichettaMono taglia="micro" sx={{ mb: 1.5 }}>
            Ordina per probabilita&#39;
          </EtichettaMono>
          <ToggleButtonGroup
            value={ordinamento}
            exclusive
            onChange={(_evento, valore: string | null) => {
              if (valore) onCambiaOrdinamento(valore);
            }}
            size="small"
            fullWidth
            sx={{
              "& .MuiToggleButton-root": {
                borderRadius: tokens.radius.sm,
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "none",
                py: 0.8,
                "&.Mui-selected": {
                  backgroundColor: tokens.color.nearBlack,
                  color: tokens.color.canvas,
                  "&:hover": { backgroundColor: tokens.color.nearBlackHover },
                },
              },
            }}
          >
            <ToggleButton value="top">
              <TopIcon sx={{ fontSize: 16, mr: 0.5 }} /> Piu&#39; alta
            </ToggleButton>
            <ToggleButton value="bottom">
              <BottomIcon sx={{ fontSize: 16, mr: 0.5 }} /> Piu&#39; bassa
            </ToggleButton>
            <ToggleButton value="id">
              <IdIcon sx={{ fontSize: 16, mr: 0.5 }} /> Ordine di archivio
            </ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        <Paper
          sx={{
            p: 3,
            borderRadius: tokens.radius.lg,
            border: tokens.border.subtle,
            backgroundColor: tokens.color.canvas,
          }}
        >
          <EtichettaMono taglia="micro" sx={{ mb: 2 }}>
            Quartili di punteggio
          </EtichettaMono>
          {dati?.prob_buckets?.length ? (
            <FormGroup>
              {dati.prob_buckets.map((quartile) => (
                <FormControlLabel
                  key={quartile}
                  control={
                    <Checkbox
                      checked={quartiliSelezionati.includes(quartile)}
                      onChange={() => onCambiaQuartile(quartile)}
                      sx={{
                        color: tokens.color.textMuted,
                        "&.Mui-checked": { color: modello.accento },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: "14px" }}>
                      Quartile {quartile}%
                    </Typography>
                  }
                />
              ))}
            </FormGroup>
          ) : (
            <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
              Nessun filtro disponibile.
            </Typography>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={9} sx={{ minWidth: 0 }}>
        {caricamento ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress sx={{ color: tokens.color.nearBlack }} />
          </Box>
        ) : errore || !dati || dati.page_rows.length === 0 ? (
          <EmptyState message="Nessun post corrisponde agli intervalli di probabilita' selezionati." />
        ) : (
          <Box>
            <Paper
              sx={{
                borderRadius: tokens.radius.lg,
                border: tokens.border.subtle,
                overflow: "hidden",
                mb: 4,
                backgroundColor: tokens.color.canvas,
              }}
            >
              <List sx={{ p: 0 }}>
                {dati.page_rows.map(({ post, probability }, indice) => (
                  <div key={post.id}>
                    <ListItem
                      sx={{
                        p: 3,
                        alignItems: "flex-start",
                        transition: "background-color 0.15s ease",
                        "&:hover": { backgroundColor: tokens.color.surfaceSubtle },
                      }}
                    >
                      <ListItemText
                        disableTypography
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 2,
                              mb: 1.5,
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, color: tokens.color.nearBlack }}
                              >
                                {post.acct}
                              </Typography>
                              <Chip
                                label={post.domain}
                                size="small"
                                sx={{
                                  borderRadius: tokens.radius.md,
                                  backgroundColor: tokens.color.softStone,
                                }}
                              />
                              {post.bot && (
                                <Chip
                                  icon={<BotIcon style={{ fontSize: 14, color: tokens.color.canvas }} />}
                                  label="BOT"
                                  size="small"
                                  sx={{
                                    borderRadius: tokens.radius.md,
                                    backgroundColor: tokens.color.nearBlack,
                                    color: tokens.color.canvas,
                                  }}
                                />
                              )}
                            </Box>
                            <Chip
                              label={`${(probability * 100).toFixed(0)}% IA`}
                              size="small"
                              sx={{
                                flexShrink: 0,
                                borderRadius: tokens.radius.chip,
                                fontFamily: tokens.font.mono,
                                fontWeight: 600,
                                backgroundColor:
                                  probability >= 0.5 ? modello.accento : tokens.color.softStone,
                                color:
                                  probability >= 0.5
                                    ? tokens.color.canvas
                                    : tokens.color.nearBlack,
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography
                              variant="body1"
                              sx={{
                                whiteSpace: "pre-wrap",
                                mb: 2,
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                color: tokens.color.textPrimary,
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
                              Apri il post e i punteggi dei quattro modelli &rarr;
                            </Link>
                          </Box>
                        }
                      />
                    </ListItem>
                    {indice < dati.page_rows.length - 1 && (
                      <Divider sx={{ borderColor: tokens.color.border }} />
                    )}
                  </div>
                ))}
              </List>
            </Paper>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button
                variant="outlined"
                startIcon={<PrevIcon />}
                disabled={pagina <= 1}
                onClick={() => onCambiaPagina(pagina - 1)}
                sx={{ borderRadius: tokens.radius.pill }}
              >
                Precedente
              </Button>
              <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
                Pagina {pagina}
              </Typography>
              <Button
                variant="outlined"
                endIcon={<NextIcon />}
                disabled={!dati.has_next}
                onClick={() => onCambiaPagina(pagina + 1)}
                sx={{ borderRadius: tokens.radius.pill }}
              >
                Successiva
              </Button>
            </Box>
          </Box>
        )}
      </Grid>
    </Grid>
  );
}
