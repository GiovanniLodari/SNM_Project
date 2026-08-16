import { Box, Typography } from "@mui/material";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { InfluenceStepStat } from "../../../api/client.ts";
import { formatNumber } from "../../../utils/format.ts";
import { tokens } from "../../../theme.ts";

interface Props {
  stepStats: InfluenceStepStat[];
}

/**
 * Andamento della cascata per step: nodi appena raggiunti (barre) e nodi
 * cumulativi (area, asse secondario).
 *
 * Lo step 0 non e' propagazione: sono i seed di partenza, gia' presenti prima
 * che la cascata inizi a muoversi. Per questo la sua barra usa un colore
 * diverso (`textMuted`, spento) da quello degli step di propagazione veri
 * (`actionBlue`) ed e' etichettato "seed" invece che "step 0" sull'asse: chi
 * legge il grafico non deve poter scambiare il punto di partenza per il primo
 * risultato della propagazione.
 */
export default function AndamentoStep({ stepStats }: Props) {
  const dati = stepStats
    .slice()
    .sort((a, b) => a.step - b.step)
    .map((s) => ({
      step: s.step,
      etichetta: s.step === 0 ? "seed" : `step ${s.step}`,
      nuoviNodi: s.new_nodes,
      cumulativi: s.cumulative_nodes,
      eSeed: s.step === 0,
    }));

  return (
    <Box>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={dati} margin={{ top: 16, right: 24, bottom: 16, left: 8 }}>
          <CartesianGrid stroke={tokens.color.border} strokeDasharray="3 3" />
          <XAxis
            dataKey="etichetta"
            tick={{ fontSize: 12, fill: tokens.color.textMuted }}
          />
          <YAxis
            yAxisId="nuovi"
            tick={{ fontSize: 12, fill: tokens.color.textMuted }}
            label={{
              value: "nodi per step",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: tokens.color.textMuted },
            }}
          />
          <YAxis
            yAxisId="cumulativi"
            orientation="right"
            tick={{ fontSize: 12, fill: tokens.color.textMuted }}
            label={{
              value: "nodi cumulativi",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 12, fill: tokens.color.textMuted },
            }}
          />
          <Tooltip
            formatter={(valore, nome) => [
              typeof valore === "number"
                ? formatNumber(valore, { useGrouping: true })
                : String(valore),
              String(nome),
            ]}
          />

          <Bar yAxisId="nuovi" dataKey="nuoviNodi" name="nodi appena raggiunti" radius={[4, 4, 0, 0]}>
            {dati.map((d) => (
              <Cell
                key={d.step}
                fill={d.eSeed ? tokens.color.textMuted : tokens.color.actionBlue}
              />
            ))}
          </Bar>

          <Area
            yAxisId="cumulativi"
            type="monotone"
            dataKey="cumulativi"
            name="nodi cumulativi"
            stroke={tokens.color.coralInk}
            fill={tokens.color.surfaceCoral}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <Typography
        variant="caption"
        sx={{ display: "block", color: tokens.color.textMuted, mt: 1, maxWidth: "70ch" }}
      >
        La barra piu' chiara sotto "seed" non e' un risultato della
        propagazione: sono i nodi di partenza. Le barre in blu sono gli step in
        cui la cascata si e' effettivamente propagata sulla rete.
      </Typography>
    </Box>
  );
}
