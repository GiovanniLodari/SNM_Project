import { useCallback } from "react";
import { Grid, Paper, Table, TableBody, TableCell, TableContainer, TableRow, Typography } from "@mui/material";
import { api } from "../api/client";
import { useApi } from "../hooks/useApi";
import { EmptyState, ErrorState, LoadingState, Page } from "../components/States";
import { StatCard } from "../components/StatCard";

export function AccountsPage() {
  const fetchStats = useCallback(() => api.accounts(), []);
  const { data, loading, error } = useApi(fetchStats);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState>Nessun dato ancora disponibile.</EmptyState>;

  return (
    <Page title="Account e bot">
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <StatCard label="Account bot dichiarati" value={String(data.bot_total)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard label="Account non bot" value={String(data.nonbot_total)} />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Incrocio bot × contenuto IA
      </Typography>
      {data.ai_producers_total > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Account che producono contenuto IA (soglia 0.5)</TableCell>
                <TableCell align="right">{data.ai_producers_total}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>...di cui bot dichiarati</TableCell>
                <TableCell align="right">{data.ai_and_bot}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>...di cui non bot</TableCell>
                <TableCell align="right">{data.ai_and_not_bot}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState>
          Nessun dato ancora disponibile (AI detection non ancora partita o senza risultati sopra
          soglia).
        </EmptyState>
      )}
    </Page>
  );
}