import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { gruppiSeedIdentici } from "../../../utils/influenceAnalysis.ts";
import { formatDecimal } from "../../../utils/format.ts";
import { tokens } from "../../../theme.ts";

interface Props {
  jaccard: Record<string, number>;
}

/**
 * Sovrapposizione dei seed scelti da ciascun algoritmo, misurata con l'indice
 * di Jaccard.
 *
 * Il difetto originale era di forma, non di calcolo: il numero giusto
 * (Jaccard = 1 fra piu' algoritmi) esisteva gia', ma stava sepolto in una
 * matrice in fondo alla pagina, dove nessun lettore arriva a cercarlo. Qui la
 * frase viene prima: nomina il gruppo e dice a chiare lettere che non si
 * tratta di insiemi simili ma dello stesso identico insieme di seed. La
 * matrice resta sotto, come dettaglio di supporto per chi vuole verificare.
 */
export default function SovrapposizioneSeed({ jaccard }: Props) {
  const gruppi = gruppiSeedIdentici(jaccard);

  // Nomi degli algoritmi coinvolti, ricavati dalle chiavi "A|B": ordinati per
  // dare alla matrice un ordine stabile, non per un motivo statistico.
  const nomi = Array.from(
    new Set(Object.keys(jaccard).flatMap((chiave) => chiave.split("|"))),
  ).sort();

  // Le coppie assenti dalla matrice non hanno un indice di Jaccard pari a 0:
  // semplicemente non e' stato calcolato. "0,00" significherebbe "nessun seed
  // in comune", un'affermazione forte che i dati non fanno: il ripiego deve
  // dichiarare l'assenza (vedi formatDecimal, che rende null come NON_DISPONIBILE).
  const punteggio = (a: string, b: string): number | null => {
    if (a === b) return 1;
    return jaccard[`${a}|${b}`] ?? jaccard[`${b}|${a}`] ?? null;
  };

  /** Unisce una lista di nomi in una frase italiana ("A, B e C"). */
  const formatLista = (elenco: string[]): string => {
    if (elenco.length <= 1) return elenco.join("");
    return `${elenco.slice(0, -1).join(", ")} e ${elenco[elenco.length - 1]}`;
  };

  return (
    <Box>
      {gruppi.length > 0 && (
        <Typography
          data-testid="frase-seed-identici"
          sx={{
            ...tokens.type.affermazione,
            color: tokens.color.nearBlack,
            mb: 3,
          }}
        >
          {gruppi.map((gruppo, indice) => (
            <span key={gruppo.join("-")}>
              {indice > 0 && " "}
              {formatLista(gruppo)} non scelgono insiemi di seed fra loro simili:
              scelgono esattamente lo stesso identico insieme (indice di
              Jaccard pari a 1).
            </span>
          ))}
        </Typography>
      )}

      {/* Sei colonne in monospazio: la matrice chiede circa 469px e su uno
          schermo da 390px ne ha 244. Scorre dentro il proprio contenitore
          invece di trascinarsi dietro tutta la pagina. */}
      <TableContainer
        sx={{ overflowX: "auto" }}
        // Vedi TabellaBenchmark: un'area che scorre col mouse e non con la
        // tastiera tiene fuori portata proprio le colonne per cui scorre.
        tabIndex={0}
        role="region"
        aria-label="Matrice di sovrapposizione dei seed, scorrevole in orizzontale"
      >
        <Table
          data-testid="matrice-jaccard"
          size="small"
        sx={{
          "& .MuiTableCell-root": {
            border: "none",
            borderBottom: tokens.border.subtle,
            fontFamily: tokens.font.mono,
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell />
            {nomi.map((nome) => (
              <TableCell key={nome} align="center" sx={{ color: tokens.color.textMuted }}>
                {nome}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {nomi.map((riga) => (
            <TableRow key={riga}>
              {/* Intestazione di riga: in una matrice 6x6 e' l'unica cosa che
                  dice a quale coppia appartiene un valore. Resa come `td`, uno
                  screen reader leggeva sei numeri senza sapere di chi fossero -
                  cioe' tutto il contenuto della matrice, tranne il suo senso. */}
              <TableCell component="th" scope="row" sx={{ color: tokens.color.textMuted, fontWeight: 400 }}>
                {riga}
              </TableCell>
              {nomi.map((colonna) => {
                const valore = punteggio(riga, colonna);
                const identico = valore === 1;
                return (
                  <TableCell
                    key={colonna}
                    align="center"
                    sx={{
                      backgroundColor: identico ? tokens.color.softStone : "transparent",
                      color: tokens.color.textPrimary,
                      fontWeight: identico ? 700 : 400,
                    }}
                  >
                    {formatDecimal(valore, 2)}
                  </TableCell>
                );
              })}
            </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
