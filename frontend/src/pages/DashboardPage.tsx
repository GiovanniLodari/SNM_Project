import { useCallback } from "react";
import { Grid } from "@mui/material";
import { api } from "../api/client";
import { useApi } from "../hooks/useApi";
import { EmptyState, ErrorState, LoadingState, Page } from "../components/States";
import { StatCard, formatNumber } from "../components/StatCard";

export function DashboardPage() {
  const fetchStats = useCallback(() => api.dashboard(), []);
  const { data, loading, error } = useApi(fetchStats);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState>Nessun dato ancora disponibile.</EmptyState>;

  const aiPct = data.ai_eligible > 0 ? (100 * data.ai_done) / data.ai_eligible : null;
  const aiClassPct = data.ai_done > 0 ? (100 * data.ai_classified) / data.ai_done : null;
  const fcPct = data.fact_check_eligible > 0 ? (100 * data.fact_check_done) / data.fact_check_eligible : null;

  return (
    <Page title="Stato pipeline">
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="Post raccolti" value={formatNumber(data.posts_total)} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Etichettati IA (processati)"
            value={aiPct != null ? `${aiPct.toFixed(1)}%` : "—"}
            sub={
              aiPct != null
                ? `${formatNumber(data.ai_done)} / ${formatNumber(data.ai_eligible)}`
                : "nessun dato ancora disponibile"
            }
            progress={aiPct ?? undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label={`Classificati come IA (soglia ${data.ai_threshold})`}
            value={data.ai_done > 0 ? formatNumber(data.ai_classified) : "—"}
            sub={
              data.ai_done > 0
                ? `${aiClassPct!.toFixed(1)}% dei processati`
                : "nessun dato ancora disponibile"
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Fact-checkati"
            value={fcPct != null ? `${fcPct.toFixed(1)}%` : "—"}
            sub={
              fcPct != null
                ? `${formatNumber(data.fact_check_done)} / ${formatNumber(data.fact_check_eligible)}`
                : "nessun dato ancora disponibile"
            }
            progress={fcPct ?? undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="Relazioni follow" value={formatNumber(data.follows_total)} />
        </Grid>
      </Grid>
    </Page>
  );
}
