import {
  Box,
  ButtonBase,
  Chip,
  Grid,
  Pagination,
  Skeleton,
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
import type { InfluenceSeed, InfluenceTarget } from "../../../api/client.ts";
import Blocco from "../../narrativa/Blocco.tsx";
import { formatNumber, formatPercent } from "../../../utils/format.ts";
import { tokens } from "../../../theme.ts";

interface Props {
  seeds: InfluenceSeed[];
  seedsTotal: number;
  seedsLoading: boolean;
  seedsPage: number;
  onSeedsPageChange: (page: number) => void;
  seedsSearch: string;
  onSeedsSearchChange: (query: string) => void;
  seedsPageSize: number;
  /** Numero totale di seed del set (meta.seeds), per la didascalia: non e'
   * detto che coincida con `seedsTotal`, che e' gia' filtrato dalla ricerca. */
  totalSeedCount: number;
  selectedSeedId?: string;
  onSelectSeed: (seedId: string) => void;
  onSelectAccount: (id: string) => void;
  targets: InfluenceTarget[];
}

// Quanti bersagli umani mostrare nella seconda classifica: la lista dei
// bersagli non e' paginata come quella dei seed, mostra solo la testa.
const BERSAGLI_MOSTRATI = 10;

/**
 * Il nome di un account, come comando.
 *
 * Prima l'unico modo di agire su una riga era il suo `onClick`, senza
 * `tabIndex`, senza `role` e senza gestione dei tasti: da tastiera le due
 * classifiche erano inerti, e uno screen reader non aveva modo di sapere che
 * una riga fosse interattiva. Erano anche l'unico percorso esistente da una
 * classifica a un account.
 *
 * Il bersaglio nominato e' il nome, non la riga: e' cio' che chi ascolta si
 * aspetta di trovare in una cella di intestazione di riga. Il clic sulla riga
 * resta per il mouse, dove un bersaglio grande e' comodo, e questo bottone
 * ferma la propagazione perche' altrimenti l'azione partirebbe due volte.
 */
function NomeAccount({
  nome,
  descrizioneAzione,
  onAzione,
}: {
  nome: string;
  descrizioneAzione: string;
  onAzione: () => void;
}) {
  return (
    <ButtonBase
      onClick={(evento) => {
        evento.stopPropagation();
        onAzione();
      }}
      aria-label={descrizioneAzione}
      sx={{
        fontFamily: tokens.font.body,
        fontWeight: 600,
        fontSize: "13px",
        color: tokens.color.nearBlack,
        textAlign: "left",
        justifyContent: "flex-start",
        borderRadius: tokens.radius.xs,
        px: 0.5,
        mx: -0.5,
        transition: "background-color 0.15s ease",
        "&:hover": { backgroundColor: tokens.color.softStone },
      }}
    >
      {nome}
    </ButtonBase>
  );
}

/** Intestazione di colonna: apparato, quindi monospazio maiuscolo. */
const sxIntestazioni = {
  "& th": {
    borderBottom: `2px solid ${tokens.color.border}`,
    color: tokens.color.textMuted,
    fontWeight: 600,
    fontSize: "12px",
    fontFamily: tokens.font.mono,
  },
} as const;

/**
 * Le due classifiche dell'Atto III: i seed che hanno propagato di piu' e gli
 * account umani raggiunti con piu' follower.
 *
 * Le due tabelle vivono dentro un `Blocco` ciascuna. Prima ne ricostruivano la
 * forma a mano - `p: 4`, raggio `xl`, filetto tenue - due volte in questo
 * stesso file, e intitolavano a 18px mentre i quattro blocchi dell'Atto II
 * intitolavano a 24px: lo stesso ruolo in due misure nello stesso capitolo, che
 * e' il difetto che `Blocco` esiste per rendere scomodo da riprodurre.
 *
 * La logica di paginazione e ricerca resta di proprieta' del chiamante (query,
 * stato URL): questo componente e' solo la loro presentazione.
 */
export default function ClassificheSeed({
  seeds,
  seedsTotal,
  seedsLoading,
  seedsPage,
  onSeedsPageChange,
  seedsSearch,
  onSeedsSearchChange,
  seedsPageSize,
  totalSeedCount,
  selectedSeedId,
  onSelectSeed,
  onSelectAccount,
  targets,
}: Props) {
  const apriSeed = (id: string) => {
    onSelectSeed(id);
    onSelectAccount(id);
  };

  return (
    <Grid container spacing={4}>
      {/* Classifica dei seed bot */}
      <Grid item xs={12} md={7} sx={{ minWidth: 0 }}>
        <Blocco
          titolo="I seed che hanno propagato di piu'"
          descrizione={
            `I ${formatNumber(totalSeedCount, { useGrouping: true })} seed bot ordinati per ` +
            "impatto diretto: quanti nodi ciascuno attiva al primo passo, e quanti ne attiva " +
            "in rapporto ai propri follower. Sceglierne uno cambia la cascata disegnata sopra."
          }
          azione={
            <TextField
              placeholder="Cerca account o ID..."
              size="small"
              value={seedsSearch}
              // Il ritorno a pagina 1 lo fa gia' onSeedsSearchChange nel
              // chiamante, in un'unica scrittura URL: aggiungere qui un secondo
              // onSeedsPageChange(1) creerebbe una navigazione che sovrascrive
              // la ricerca (vedi OpzioniScrittura in useUrlState).
              onChange={(e) => onSeedsSearchChange(e.target.value)}
              // Sulla radice e non su InputProps: MUI passerebbe l'attributo al
              // FormControl e il campo resterebbe senza nome accessibile.
              inputProps={{ "aria-label": "Cerca fra i seed per nome account o ID" }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: tokens.color.textMuted, mr: 1, fontSize: 18 }} />,
              }}
              sx={{
                width: { xs: "100%", sm: 220 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: tokens.radius.pill,
                  backgroundColor: tokens.color.softStone,
                  fontSize: "13px",
                },
              }}
            />
          }
        >
          {/* `tabIndex` sul contenitore che scorre: quattro colonne numeriche
              non entrano in una colonna stretta, e un'area che scorre solo col
              mouse tiene le colonne oltre il bordo fuori portata da tastiera. */}
          <TableContainer
            tabIndex={0}
            role="region"
            aria-label="Classifica dei seed, scorrevole in orizzontale"
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={sxIntestazioni}>
                  <TableCell>ACCOUNT BOT</TableCell>
                  <TableCell align="right">FOLLOWER</TableCell>
                  <TableCell align="right">ATTIVATI AL PASSO 1</TableCell>
                  <TableCell align="right">EFFICIENZA</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {seedsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Skeleton variant="text" width={200} />
                    </TableCell>
                  </TableRow>
                ) : seeds.length > 0 ? (
                  seeds.map((s) => (
                    <TableRow
                      key={s.id}
                      hover
                      selected={s.id === selectedSeedId}
                      onClick={() => apriSeed(s.id)}
                      sx={{
                        cursor: "pointer",
                        "&.Mui-selected": {
                          backgroundColor: tokens.overlay.velaturaCoralTenue,
                        },
                      }}
                    >
                      {/* Intestazione di riga, non una cella qualunque: e' il
                          nome che identifica gli altri tre valori, e senza
                          `scope` uno screen reader legge quei numeri senza
                          poter dire di chi sono. */}
                      <TableCell component="th" scope="row" sx={{ fontWeight: 400 }}>
                        <NomeAccount
                          nome={s.acct}
                          descrizioneAzione={`Mostra la cascata di ${s.acct} e apri il suo profilo`}
                          onAzione={() => apriSeed(s.id)}
                        />
                        <Typography variant="caption" sx={{ display: "block", color: tokens.color.textMuted, fontFamily: tokens.font.mono }}>
                          ID: {s.id}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: tokens.font.mono, fontSize: "13px" }}>
                          {formatNumber(s.followers, { useGrouping: true })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${formatNumber(s.direct_reached, { useGrouping: true })} nodi`}
                          size="small"
                          sx={{
                            backgroundColor: tokens.overlay.velaturaCoral,
                            color: tokens.color.coralInk,
                            fontFamily: tokens.font.mono,
                            fontWeight: 700,
                            fontSize: "11px",
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.textMuted }}>
                          {formatPercent(s.efficiency * 100, 1)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: tokens.color.textMuted }}>
                      {/* Il vuoto da ricerca e il vuoto da set sono due cose
                          diverse e vanno dette diversamente: nel primo caso
                          chi legge deve sapere su quali campi filtra la
                          ricerca per correggere la query, nel secondo che non
                          c'e' niente da correggere. "Nessun risultato" li
                          confonde e non aiuta in nessuno dei due. */}
                      {seedsSearch
                        ? `Nessun seed corrisponde a «${seedsSearch}». La ricerca filtra sul nome dell'account e sull'ID, non sui numeri della classifica.`
                        : "La pipeline non ha prodotto seed per questo set: la classifica esiste ma e' vuota."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {seedsTotal > seedsPageSize && (
            <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
              <Pagination
                count={Math.ceil(seedsTotal / seedsPageSize)}
                page={seedsPage}
                onChange={(_, p) => onSeedsPageChange(p)}
                size="small"
                // Il selettore completo invece di `!important`: la sola classe
                // `.Mui-selected` perde di specificita' contro lo stile della
                // libreria, e la scorciatoia era forzarlo.
                sx={{
                  "& .MuiPaginationItem-root.Mui-selected": {
                    backgroundColor: tokens.color.nearBlack,
                    color: tokens.color.canvas,
                    "&:hover": { backgroundColor: tokens.color.nearBlackHover },
                  },
                }}
              />
            </Box>
          )}
        </Blocco>
      </Grid>

      {/* Classifica dei bersagli umani */}
      <Grid item xs={12} md={5} sx={{ minWidth: 0 }}>
        <Blocco
          titolo="Principali account umani raggiunti"
          descrizione={
            "Gli account umani con piu' follower fra quelli che la cascata attiva, e il passo in " +
            "cui vengono raggiunti: i primi passi arrivano piu' lontano dei successivi."
          }
        >
          <TableContainer
            tabIndex={0}
            role="region"
            aria-label="Classifica dei bersagli umani, scorrevole in orizzontale"
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={sxIntestazioni}>
                  <TableCell>ACCOUNT UMANO</TableCell>
                  <TableCell align="right">FOLLOWER</TableCell>
                  <TableCell align="right">PASSO DI ATTIVAZIONE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {targets.slice(0, BERSAGLI_MOSTRATI).map((t) => (
                  <TableRow
                    key={t.id}
                    hover
                    onClick={() => onSelectAccount(t.id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell component="th" scope="row" sx={{ fontWeight: 400 }}>
                      <NomeAccount
                        nome={t.acct}
                        descrizioneAzione={`Apri il profilo di ${t.acct}`}
                        onAzione={() => onSelectAccount(t.id)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: tokens.font.mono, fontSize: "13px" }}>
                        {formatNumber(t.followers, { useGrouping: true })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`passo ${t.activation_step}`}
                        size="small"
                        sx={{
                          backgroundColor: tokens.overlay.velaturaBlu,
                          color: tokens.color.actionBlue,
                          fontFamily: tokens.font.mono,
                          fontWeight: 600,
                          fontSize: "11px",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Blocco>
      </Grid>
    </Grid>
  );
}
