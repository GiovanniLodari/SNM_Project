import { Box, Skeleton, Typography } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useInfluenceResultComparisonQuery } from "../../../api/queries.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";
import type { ResultAlgo } from "../../../api/client.ts";

const COLORI: Record<string, string> = {
  "RIS-greedy": tokens.color.coral,
  CELF: tokens.color.actionBlue,
  PMIA: "#8d9ab3",
};

function colorOf(algo: string) {
  return COLORI[algo] ?? tokens.color.softStone;
}

function GraficoBarre({
  data,
  field,
  label,
  formatter,
}: {
  data: ResultAlgo[];
  field: "spread" | "time_s";
  label: string;
  formatter: (v: number) => string;
}) {
  const rows = [...data].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
  return (
    <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.06em", color: tokens.color.textMuted, mb: 1.5 }}>
        {label}
      </Typography>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 0, right: 60, bottom: 0, left: 4 }}
        >
          <CartesianGrid horizontal={false} stroke={tokens.color.border} />
          <XAxis
            type="number"
            tickFormatter={formatter}
            tick={{ fontFamily: tokens.font.mono, fontSize: 10, fill: tokens.color.textMuted }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="algo"
            width={80}
            tick={{ fontFamily: tokens.font.mono, fontSize: 11, fill: tokens.color.nearBlack }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => [typeof v === "number" ? formatter(v) : String(v), label]}
            contentStyle={{
              fontFamily: tokens.font.mono,
              fontSize: 11,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.color.border}`,
              backgroundColor: tokens.color.canvas,
            }}
          />
          <Bar dataKey={field} radius={[0, 4, 4, 0]} maxBarSize={28}>
            <LabelList
              dataKey={field}
              position="right"
              formatter={(v: unknown) => typeof v === "number" ? formatter(v) : String(v ?? "")}
              style={{ fontFamily: tokens.font.mono, fontSize: 10, fill: tokens.color.textMuted }}
            />
            {rows.map((r) => (
              <Cell key={r.algo} fill={colorOf(r.algo)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default function ConfrontoIM() {
  const { data, isLoading, isError } = useInfluenceResultComparisonQuery();
  const algos = data?.algorithms ?? [];

  if (isLoading) {
    return <Skeleton variant="rectangular" height={200} sx={{ borderRadius: tokens.radius.xl }} />;
  }
  if (isError || algos.length === 0) {
    return (
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.textMuted }}>
        Risultati algoritmi non disponibili.
      </Typography>
    );
  }

  const meta = algos[0];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography sx={{ fontFamily: tokens.font.display, fontWeight: 700, fontSize: 16,
          color: tokens.color.nearBlack, mb: 0.5 }}>
          Confronto algoritmi — grafo completo
        </Typography>
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted, maxWidth: "80ch" }}>
          Spread MC (1 000 simulazioni) e tempo di selezione dei {meta.k_max} seed su
          {" "}{meta.graph_nodes ? formatNumber(meta.graph_nodes) : "—"} nodi e
          {" "}{meta.graph_edges ? formatNumber(meta.graph_edges) : "—"} archi.
          {" "}SKIM è rinominato <strong>RIS-greedy</strong> (implementazione Borgs et al. SODA 2014).
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <GraficoBarre
          data={algos}
          field="spread"
          label="Spread (nodi attivati)"
          formatter={(v) => formatNumber(Math.round(v))}
        />
        <GraficoBarre
          data={algos}
          field="time_s"
          label="Tempo di selezione (s)"
          formatter={(v) => v >= 60 ? `${(v / 60).toFixed(0)} min` : `${v.toFixed(0)} s`}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", pt: 1 }}>
        {algos.map((a) => (
          <Box key={a.algo} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: colorOf(a.algo), flexShrink: 0 }} />
            <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted }}>
              {a.algo}
              {a.spread != null && ` · ${formatNumber(Math.round(a.spread))} spread`}
              {a.time_s != null && ` · ${a.time_s >= 60 ? `${(a.time_s / 60).toFixed(0)} min` : `${a.time_s.toFixed(0)} s`}`}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
