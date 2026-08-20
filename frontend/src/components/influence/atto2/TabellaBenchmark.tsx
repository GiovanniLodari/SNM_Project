import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import type { InfluenceAlgorithmInfo } from "../../../api/client.ts";
import { rapportoCostoBeneficio } from "../../../utils/influenceAnalysis.ts";
import { NON_DISPONIBILE, formatDecimal, formatNumber } from "../../../utils/format.ts";
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
    // Il contenitore scorrevole non e' decorativo: cinque colonne numeriche
    // con intestazioni come "Spread Monte Carlo" chiedono circa 485px, e la
    // colonna di contenuto su uno schermo da 390px ne offre 308. Senza un
    // antenato con `overflow-x: auto` il traboccamento risale fino al body e
    // fa scorrere lateralmente l'intera pagina - il difetto peggiore possibile
    // durante una discussione dal vivo. Le due classifiche dell'Atto III lo
    // avevano gia'; qui mancava.
    <TableContainer
      sx={{ overflowX: "auto" }}
      // Un'area che scorre deve poter scorrere anche da tastiera: senza
      // `tabIndex` le colonne oltre il bordo destro sono raggiungibili solo col
      // mouse, ed erano proprio quelle per cui il contenitore era stato messo.
      tabIndex={0}
      role="region"
      aria-label="Confronto fra algoritmi, scorrevole in orizzontale"
    >
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
              {/* Il nome dell'algoritmo e' l'intestazione della riga, non una
                  cella qualunque: e' cio' che dice di chi sono i quattro numeri
                  accanto. Senza `scope` uno screen reader li legge orfani. */}
              <TableCell
                component="th"
                scope="row"
                sx={{ fontFamily: tokens.font.display, fontWeight: 400, color: tokens.color.nearBlack }}
              >
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
                {/* Tre casi distinti (vedi influenceAnalysis.ts): un tempo misurato si mostra
                    cosi' com'e', un tempo sotto il pavimento si mostra con il suo valore reale
                    (mai un "0,00 s" scritto a mano) e un tempo assente dichiara l'assenza invece
                    di spacciarla per una misura sotto il decimo di secondo.

                    Le due note stavano in un attributo `title`, cioe' erano informazione affidata
                    a un passaggio del mouse: non compaiono al tocco, non si raggiungono da
                    tastiera perche' uno `span` non prende focus, e su un proiettore nessuno le
                    vedra' mai. Sono la provenienza di due valori in una tabella il cui compito e'
                    dichiarare la provenienza, quindi stanno in pagina, nella stessa forma che la
                    colonna dei seed usa gia' due colonne piu' a sinistra. */}
                {riga.statoTempo === "assente" ? NON_DISPONIBILE : `${formatDecimal(riga.tempoS, 2)} s`}
                {riga.statoTempo === "assente" && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", color: tokens.color.textMuted, fontFamily: tokens.font.body }}
                  >
                    tempo non registrato in questa run
                  </Typography>
                )}
                {riga.statoTempo === "sotto_pavimento" && (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", color: tokens.color.textMuted, fontFamily: tokens.font.body }}
                  >
                    misura reale, sotto il pavimento della scala logaritmica
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          );
        })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
