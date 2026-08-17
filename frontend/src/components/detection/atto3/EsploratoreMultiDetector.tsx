import {
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import type { ComparisonPostRow } from "../../../api/client.ts";
import { MODELLI } from "../detectionContent.ts";
import EtichettaMono from "../../narrativa/EtichettaMono.tsx";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";

/**
 * I filtri dell'esploratore, raggruppati per domanda.
 *
 * Erano undici schede in una barra scorrevole: essendo tutte uguali e tutte
 * sullo stesso piano, non si vedeva che rispondono a tre domande diverse - su
 * quanti modelli concordano, quale modello e' l'unico a segnalare un post, e
 * chi ha scritto il post. Come pill raggruppate la struttura si legge, ed e'
 * anche la forma che DESIGN.md prevede per le tassonomie.
 */
const GRUPPI_FILTRO: ReadonlyArray<{
  titolo: string;
  filtri: ReadonlyArray<{ valore: string; etichetta: string }>;
}> = [
  {
    titolo: "Grado di consenso",
    filtri: [
      { valore: "all", etichetta: "Tutti i post" },
      { valore: "unanimous_ai", etichetta: "Unanime IA (4/4)" },
      { valore: "exactly_3", etichetta: "3 su 4" },
      { valore: "exactly_2", etichetta: "2 su 4" },
      { valore: "exactly_1", etichetta: "1 su 4" },
      { valore: "unanimous_human", etichetta: "Unanime umano (0/4)" },
    ],
  },
  {
    titolo: "Segnalato da un solo modello",
    filtri: [
      { valore: "fastdetect_only", etichetta: "Solo FastDetectGPT" },
      { valore: "binoculars_only", etichetta: "Solo Binoculars" },
      { valore: "desklib_only", etichetta: "Solo Desklib" },
      { valore: "ada_only", etichetta: "Solo AdaDetectGPT" },
    ],
  },
  {
    titolo: "Origine del post",
    filtri: [{ valore: "bots_only", etichetta: "Solo account bot" }],
  },
];

/** Quante colonne ha la tabella: serve al colSpan degli stati vuoti. */
const NUMERO_COLONNE = 8;

interface Props {
  post: readonly ComparisonPostRow[];
  totale: number;
  caricamento: boolean;
  errore: boolean;
  filtro: string;
  onCambiaFiltro: (filtro: string) => void;
  ricerca: string;
  onCambiaRicerca: (ricerca: string) => void;
  pagina: number;
  onCambiaPagina: (pagina: number) => void;
  postPerPagina: number;
}

/** Probabilita' in percentuale, accettando sia la scala 0-1 sia la scala 0-100. */
function formattaProbabilita(probabilita: number | null | undefined): string {
  if (probabilita == null || isNaN(probabilita)) return "n/d";
  return `${(probabilita > 1 ? probabilita : probabilita * 100).toFixed(1)}%`;
}

function tintaProbabilita(probabilita: number | null | undefined): string {
  if (probabilita == null || isNaN(probabilita)) return tokens.color.textMuted;
  const valore = probabilita > 1 ? probabilita / 100 : probabilita;
  if (valore >= 0.7) return tokens.color.danger;
  if (valore >= 0.5) return tokens.color.coral;
  return tokens.color.textMuted;
}

/** Etichetta del consenso raggiunto su un post. */
function ChipConsenso({ voti }: { voti: number }) {
  const per: Record<number, { testo: string; fondo: string; testoColore: string }> = {
    4: { testo: "4/4 IA", fondo: tokens.color.purple, testoColore: tokens.color.canvas },
    3: { testo: "3/4 IA", fondo: tokens.color.deepGreen, testoColore: tokens.color.canvas },
    2: { testo: "2/4 IA", fondo: tokens.color.coral, testoColore: tokens.color.canvas },
    1: { testo: "1/4 IA", fondo: tokens.color.softStone, testoColore: tokens.color.textPrimary },
    0: { testo: "0/4 umano", fondo: tokens.color.surfaceBlue, testoColore: tokens.color.actionBlue },
  };
  const stile = per[voti] ?? per[0];
  return (
    <Chip
      label={stile.testo}
      size="small"
      sx={{
        backgroundColor: stile.fondo,
        color: stile.testoColore,
        fontFamily: tokens.font.mono,
        fontWeight: 600,
        fontSize: "11px",
      }}
    />
  );
}

export default function EsploratoreMultiDetector({
  post,
  totale,
  caricamento,
  errore,
  filtro,
  onCambiaFiltro,
  ricerca,
  onCambiaRicerca,
  pagina,
  onCambiaPagina,
  postPerPagina,
}: Props) {
  return (
    <Box>
      <Typography
        component="h3"
        sx={{ ...tokens.type.cardHeading, color: tokens.color.nearBlack, mb: 1 }}
      >
        I post, con i quattro punteggi affiancati
      </Typography>
      <Typography variant="body2" sx={{ color: tokens.color.textMuted, maxWidth: "70ch", mb: 4 }}>
        Ogni riga mostra lo stesso testo giudicato dai quattro modelli. I filtri isolano i casi
        interessanti: l&#39;unanimita&#39;, il dissenso di uno solo, i post degli account bot.
      </Typography>

      <Paper
        variant="outlined"
        sx={{ borderRadius: tokens.radius.lg, p: 3, mb: 3, borderColor: tokens.color.border }}
      >
        {GRUPPI_FILTRO.map((gruppo) => (
          <Box key={gruppo.titolo} sx={{ mb: 2.5 }}>
            <EtichettaMono taglia="micro" sx={{ mb: 1 }}>
              {gruppo.titolo}
            </EtichettaMono>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
              {gruppo.filtri.map((voce) => {
                const attivo = voce.valore === filtro;
                return (
                  <Button
                    key={voce.valore}
                    onClick={() => onCambiaFiltro(voce.valore)}
                    disableElevation
                    aria-pressed={attivo}
                    sx={{
                      textTransform: "none",
                      borderRadius: tokens.radius.chip,
                      px: 2,
                      py: 0.5,
                      fontSize: "13px",
                      fontWeight: attivo ? 600 : 500,
                      color: attivo ? tokens.color.canvas : tokens.color.nearBlack,
                      backgroundColor: attivo ? tokens.color.nearBlack : "transparent",
                      border: `1px solid ${attivo ? tokens.color.nearBlack : tokens.color.borderStrong}`,
                      "&:hover": {
                        backgroundColor: attivo ? tokens.color.nearBlack : tokens.color.softStone,
                      },
                    }}
                  >
                    {voce.etichetta}
                  </Button>
                );
              })}
            </Stack>
          </Box>
        ))}

        <TextField
          size="small"
          fullWidth
          placeholder="Cerca nel testo dei post…"
          value={ricerca}
          onChange={(evento) => onCambiaRicerca(evento.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: tokens.color.textMuted, fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mt: 1,
            backgroundColor: tokens.color.canvas,
            "& .MuiOutlinedInput-root": { borderRadius: tokens.radius.chip },
          }}
        />
      </Paper>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: tokens.radius.lg, borderColor: tokens.color.border }}
      >
        <Table sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 90 }}>ID</TableCell>
              <TableCell>Testo</TableCell>
              <TableCell sx={{ width: 80 }}>Lingua</TableCell>
              {MODELLI.map((modello) => (
                <TableCell key={modello.id} sx={{ width: 120 }}>
                  {modello.nome}
                </TableCell>
              ))}
              <TableCell sx={{ width: 120 }}>Consenso</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {caricamento ? (
              <TableRow>
                <TableCell colSpan={NUMERO_COLONNE} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} sx={{ color: tokens.color.nearBlack }} />
                </TableCell>
              </TableRow>
            ) : errore ? (
              <TableRow>
                <TableCell
                  colSpan={NUMERO_COLONNE}
                  align="center"
                  sx={{ py: 6, color: tokens.color.danger, fontWeight: 600 }}
                >
                  Impossibile caricare i post. Verificare che il backend sia in esecuzione.
                </TableCell>
              </TableRow>
            ) : post.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={NUMERO_COLONNE}
                  align="center"
                  sx={{ py: 6, color: tokens.color.textMuted }}
                >
                  Nessun post corrisponde ai filtri selezionati.
                </TableCell>
              </TableRow>
            ) : (
              post.map((riga) => (
                <TableRow key={riga.id} hover>
                  <TableCell sx={{ fontFamily: tokens.font.mono, fontSize: "13px" }}>
                    #{riga.id}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 420 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {riga.text || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={riga.lang || "en"}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "11px" }}
                    />
                  </TableCell>
                  {(
                    [
                      riga.fastdetect_prob,
                      riga.binoculars_prob,
                      riga.desklib_prob,
                      riga.ada_prob,
                    ] as const
                  ).map((probabilita, indice) => (
                    <TableCell key={MODELLI[indice].id}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: tokens.font.mono,
                          fontWeight: 600,
                          color: tintaProbabilita(probabilita),
                        }}
                      >
                        {formattaProbabilita(probabilita)}
                      </Typography>
                    </TableCell>
                  ))}
                  <TableCell>
                    <ChipConsenso voti={riga.ai_votes} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mt: 3,
        }}
      >
        <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
          {post.length > 0
            ? `Post da ${formatNumber((pagina - 1) * postPerPagina + 1)} a ${formatNumber(Math.min(pagina * postPerPagina, totale))} su ${formatNumber(totale)}`
            : `${formatNumber(totale)} post`}
        </Typography>
        <Pagination
          count={Math.max(1, Math.ceil(totale / postPerPagina))}
          page={pagina}
          onChange={(_evento, nuova) => onCambiaPagina(nuova)}
          shape="rounded"
          sx={{
            "& .Mui-selected": {
              backgroundColor: `${tokens.color.nearBlack} !important`,
              color: tokens.color.canvas,
            },
          }}
        />
      </Box>
    </Box>
  );
}
