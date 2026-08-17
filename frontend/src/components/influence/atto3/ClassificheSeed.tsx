import {
  Box,
  Chip,
  Grid,
  Pagination,
  Paper,
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
 * Le due classifiche dell'Atto III: i seed che hanno propagato di piu' e gli
 * account umani raggiunti con piu' follower. Spostate qui da
 * `InfluenceMaximization.tsx` senza cambiare la logica di paginazione e
 * ricerca, che resta di proprieta' del chiamante (query, stato URL): questo
 * componente e' solo la loro presentazione.
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
  return (
    <Grid container spacing={4}>
      {/* Classifica dei seed bot */}
      <Grid item xs={12} md={7}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: tokens.radius.xl,
            backgroundColor: tokens.color.canvas,
            border: tokens.border.subtle,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography
                component="h3"
                variant="h6"
                sx={{ fontFamily: tokens.font.display, fontWeight: 600, fontSize: "18px", color: tokens.color.nearBlack }}
              >
                Leaderboard Top Seed Bot
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                Classifica dei {formatNumber(totalSeedCount, { useGrouping: true })} seed bot ordinati
                per impatto diretto di propagazione.
              </Typography>
            </Box>

            <TextField
              placeholder="Cerca account o ID..."
              size="small"
              value={seedsSearch}
              // Il ritorno a pagina 1 lo fa gia' onSeedsSearchChange nel
              // chiamante, in un'unica scrittura URL: aggiungere qui un secondo
              // onSeedsPageChange(1) creerebbe una navigazione che sovrascrive
              // la ricerca (vedi OpzioniScrittura in useUrlState).
              onChange={(e) => onSeedsSearchChange(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: tokens.color.textMuted, mr: 1, fontSize: 18 }} />,
              }}
              sx={{
                width: 220,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "24px",
                  backgroundColor: tokens.color.softStone,
                  fontSize: "13px",
                },
              }}
            />
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { borderBottom: `2px solid ${tokens.color.border}`, color: tokens.color.textMuted, fontWeight: 600, fontSize: "12px", fontFamily: tokens.font.mono } }}>
                  <TableCell>ACCOUNT BOT</TableCell>
                  <TableCell align="right">FOLLOWER</TableCell>
                  <TableCell align="right">ACTIVATED (t=1)</TableCell>
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
                      onClick={() => {
                        onSelectSeed(s.id);
                        onSelectAccount(s.id);
                      }}
                      sx={{
                        cursor: "pointer",
                        "&.Mui-selected": {
                          backgroundColor: "rgba(255, 119, 89, 0.08)",
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.color.nearBlack, fontSize: "13px" }}>
                          {s.acct}
                        </Typography>
                        <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontFamily: tokens.font.mono }}>
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
                            backgroundColor: "rgba(255, 119, 89, 0.15)",
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
                      Nessun seed trovato.
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
                sx={{
                  "& .Mui-selected": {
                    backgroundColor: `${tokens.color.nearBlack} !important`,
                    color: tokens.color.canvas,
                  },
                }}
              />
            </Box>
          )}
        </Paper>
      </Grid>

      {/* Classifica dei bersagli umani */}
      <Grid item xs={12} md={5}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: tokens.radius.xl,
            backgroundColor: tokens.color.canvas,
            border: tokens.border.subtle,
          }}
        >
          <Typography
            component="h3"
            variant="h6"
            sx={{ fontFamily: tokens.font.display, fontWeight: 600, fontSize: "18px", color: tokens.color.nearBlack, mb: 1 }}
          >
            Principali Account Umani Raggiunti
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.color.textMuted, display: "block", mb: 3 }}>
            Account umani con il maggior numero di follower penetrati nelle prime fasi della cascata.
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { borderBottom: `2px solid ${tokens.color.border}`, color: tokens.color.textMuted, fontWeight: 600, fontSize: "12px", fontFamily: tokens.font.mono } }}>
                  <TableCell>ACCOUNT UMANO</TableCell>
                  <TableCell align="right">FOLLOWER</TableCell>
                  <TableCell align="right">STEP ATTIVATO</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {targets.slice(0, BERSAGLI_MOSTRATI).map((t) => (
                  <TableRow key={t.id} hover onClick={() => onSelectAccount(t.id)} sx={{ cursor: "pointer" }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.color.nearBlack, fontSize: "13px" }}>
                        {t.acct}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: tokens.font.mono, fontSize: "13px" }}>
                        {formatNumber(t.followers, { useGrouping: true })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`t=${t.activation_step}`}
                        size="small"
                        sx={{
                          backgroundColor: "rgba(24, 99, 220, 0.12)",
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
        </Paper>
      </Grid>
    </Grid>
  );
}
