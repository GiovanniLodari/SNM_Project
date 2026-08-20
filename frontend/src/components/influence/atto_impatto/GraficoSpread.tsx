import { Box, Typography } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import type { MisinfoGruppoStats } from "../../../api/client.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";

const ETICHETTE: Record<string, string> = {
  vero_ai:    "Vero · AI",
  vero_human: "Vero · Umano",
  falso_ai:   "Falso · AI",
  falso_human: "Falso · Umano",
};

// AI = coral, Human = actionBlue; falso più saturo di vero
const COLORI: Record<string, string> = {
  vero_ai:    tokens.color.coralLight,
  vero_human: "#93b4f0",
  falso_ai:   tokens.color.coral,
  falso_human: tokens.color.actionBlue,
};

interface Props {
  groups: Record<string, MisinfoGruppoStats>;
}

interface TooltipPayload {
  payload: { gruppo: string; mean: number; std: number; sem: number; median: number; n: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <Box
      sx={{
        backgroundColor: tokens.color.canvas,
        border: tokens.border.subtle,
        borderRadius: tokens.radius.md,
        p: 1.5,
        minWidth: 160,
      }}
    >
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 700, mb: 0.5, color: tokens.color.nearBlack }}>
        {ETICHETTE[d.gruppo] ?? d.gruppo}
      </Typography>
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted }}>
        n = {formatNumber(d.n)}
      </Typography>
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted }}>
        media = {d.mean?.toFixed(1)}
      </Typography>
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted }}>
        mediana = {d.median?.toFixed(1)}
      </Typography>
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted }}>
        ±SEM = {d.sem?.toFixed(3)}
      </Typography>
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted }}>
        std = {d.std?.toFixed(1)}
      </Typography>
    </Box>
  );
}

const GRUPPI = ["vero_ai", "vero_human", "falso_ai", "falso_human"] as const;

export default function GraficoSpread({ groups }: Props) {
  const dati = GRUPPI.map((g) => {
    const s = groups[g] ?? { n: 0 };
    const n = s.n ?? 0;
    const std = s.std ?? 0;
    return {
      gruppo: g,
      etichetta: ETICHETTE[g],
      mean: s.mean ?? 0,
      std,
      sem: n > 0 ? std / Math.sqrt(n) : 0,
      median: s.median ?? 0,
      n,
    };
  }).filter((d) => d.n > 0);

  if (dati.length === 0) {
    return (
      <Typography sx={{ color: tokens.color.textMuted, fontFamily: tokens.font.mono, fontSize: 13 }}>
        Nessun dato disponibile per questo topic.
      </Typography>
    );
  }

  return (
    <Box>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={dati} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke={tokens.color.border} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="etichetta"
            tick={{ fontSize: 12, fill: tokens.color.textMuted, fontFamily: tokens.font.mono }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, "auto"]}
            tick={{ fontSize: 12, fill: tokens.color.textMuted, fontFamily: tokens.font.mono }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "boost medi per post",
              angle: -90,
              position: "insideLeft",
              offset: 8,
              style: { fontSize: 11, fill: tokens.color.textMuted, fontFamily: tokens.font.mono },
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: tokens.color.softStone }} />
          <Bar dataKey="mean" radius={[4, 4, 0, 0]} maxBarSize={72}>
            {dati.map((d) => (
              <Cell key={d.gruppo} fill={COLORI[d.gruppo] ?? tokens.color.nearBlack} />
            ))}
            <ErrorBar dataKey="sem" width={4} strokeWidth={2} stroke={tokens.color.textMuted} direction="y" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legenda manuale: coral = AI, blu = umano */}
      <Box sx={{ display: "flex", gap: 3, mt: 1, flexWrap: "wrap" }}>
        {[
          { color: tokens.color.coral, label: "Generato da AI" },
          { color: tokens.color.actionBlue, label: "Generato da umano" },
          { color: tokens.color.coralLight, label: "Tinta chiara = vero, scura = falso" },
        ].map(({ color, label }) => (
          <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: color, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
