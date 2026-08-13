import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import type { InfluenceAlgorithmInfo } from "../../../api/client.ts";
import { rapportoCostoBeneficio } from "../../../utils/influenceAnalysis.ts";
import { formatDecimal, formatNumber } from "../../../utils/format.ts";
import { tokens } from "../../../theme.ts";

interface Props {
  algoritmi: Record<string, InfluenceAlgorithmInfo>;
  kRichiesto: number;
}

/**
 * Tabella di benchmark: un algoritmo per riga, in stile `research-table` di
 * DESIGN.md — righe alte separate da filetti orizzontali, nessun bordo
 * verticale.
 *
 * Due note distinte nella cella dei seed, e non vanno confuse:
 * - "sotto il k richiesto" compare per ogni algoritmo che non raggiunge
 *   `kRichiesto` (qui nessuno lo raggiunge: i candidati disponibili sono
 *   meno del k richiesto) — e' solo un confronto col budget nominale;
 * - l'avviso sulla comparabilita' compare invece solo per chi sceglie meno
 *   seed *degli altri algoritmi della stessa run* (qui SKIM, 405 contro
 *   822): il suo spread non e' comparabile alla pari con quello di chi ha
 *   potuto scegliere fra piu' seed, perche' uno spread piu' basso potrebbe
 *   dipendere solo dal budget piu' piccolo, non dalla qualita'
 *   dell'algoritmo. Le due note possono comparire insieme (e' il caso di
 *   SKIM) o solo la prima (e' il caso degli altri quattro algoritmi).
 */
export default function TabellaBenchmark({ algoritmi, kRichiesto }: Props) {
  const righe = rapportoCostoBeneficio(algoritmi);
  const massimoSeed = Math.max(...Object.values(algoritmi).map((a) => a.n_seeds));

  return (
    <Table
      sx={{
        "& .MuiTableCell-root": {
          border: "none",
          borderBottom: tokens.border.subtle,
          py: 2,
        },
        "& .MuiTableRow-root:last-of-type .MuiTableCell-root": {
          borderBottom: "none",
        },
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.nearBlack }}>
            Algoritmo
          </TableCell>
          <TableCell align="right" sx={{ color: tokens.color.textMuted }}>Seed scelti</TableCell>
          <TableCell align="right" sx={{ color: tokens.color.textMuted }}>Spread stimato</TableCell>
          <TableCell align="right" sx={{ color: tokens.color.textMuted }}>Spread Monte Carlo</TableCell>
          <TableCell align="right" sx={{ color: tokens.color.textMuted }}>Tempo</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {righe.map((riga) => {
          const info = algoritmi[riga.nome];
          if (!info) return null;

          const sottoK = info.n_seeds < kRichiesto;
          // Sceglie meno seed di quanti ne abbia scelti chi, nella stessa run,
          // ne ha scelti di piu': confrontarne lo spread alla pari e' scorretto.
          // Va tenuta distinta dalla nota "sotto il k richiesto" sopra: quella
          // e' vera per ogni algoritmo di questa run (nessuno raggiunge k),
          // questa riguarda solo chi sceglie meno seed *degli altri*, non solo
          // meno del budget.
          const menoSeedDegliAltri = info.n_seeds < massimoSeed;

          return (
            <TableRow key={riga.nome}>
              <TableCell sx={{ fontFamily: tokens.font.display, color: tokens.color.nearBlack }}>
                {riga.nome}
              </TableCell>
              <TableCell align="right">
                <Typography component="span" sx={{ fontFamily: tokens.font.mono, color: tokens.color.textPrimary }}>
                  {formatNumber(info.n_seeds, { useGrouping: true })}
                </Typography>
                {sottoK && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", color: tokens.color.textMuted }}
                  >
                    sotto il k richiesto ({formatNumber(kRichiesto, { useGrouping: true })})
                  </Typography>
                )}
                {menoSeedDegliAltri && (
                  <Typography
                    variant="caption"
                    data-testid={`avviso-budget-${riga.nome}`}
                    sx={{ display: "block", color: tokens.color.textMuted, fontStyle: "italic" }}
                  >
                    meno seed degli altri algoritmi ({formatNumber(massimoSeed, { useGrouping: true })}):
                    confrontarne lo spread alla pari non e' corretto
                  </Typography>
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontFamily: tokens.font.mono, color: tokens.color.textMuted }}>
                {formatNumber(info.est_spread)}
              </TableCell>
              <TableCell align="right" sx={{ fontFamily: tokens.font.mono, color: tokens.color.nearBlack }}>
                {formatNumber(riga.spreadMc)}
              </TableCell>
              <TableCell align="right" sx={{ fontFamily: tokens.font.mono, color: tokens.color.textPrimary }}>
                {riga.tempoNonMisurato ? (
                  <Box component="span" title="Tempo reale inferiore a 0,1 s, non misurabile su scala logaritmica.">
                    {"< 0,1 s"}
                  </Box>
                ) : (
                  `${formatDecimal(riga.tempoS, 2)} s`
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
