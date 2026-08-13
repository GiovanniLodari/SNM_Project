import { Box, Typography } from "@mui/material";
import {
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { InfluenceAlgorithmInfo } from "../../../api/client.ts";
import {
  PAVIMENTO_TEMPO_LOG,
  rapportoCostoBeneficio,
} from "../../../utils/influenceAnalysis.ts";
import { tokens } from "../../../theme.ts";
import { formatDecimal } from "../../../utils/format.ts";

interface Props {
  algoritmi: Record<string, InfluenceAlgorithmInfo>;
}

/**
 * Il grafico che rende visibile l'argomento dell'Atto II: tempo in ascissa su
 * scala logaritmica, spread in ordinata. CELF++ finisce all'estrema destra alla
 * stessa altezza di `degree` all'estrema sinistra, e lo scarto irrilevante fra i
 * due si vede senza leggere una tabella.
 */
export default function GraficoCostoBeneficio({ algoritmi }: Props) {
  const righe = rapportoCostoBeneficio(algoritmi);
  const misurati = righe.filter((r) => !r.tempoNonMisurato);
  const nonMisurati = righe.filter((r) => r.tempoNonMisurato);

  return (
    <Box>
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 20, right: 40, bottom: 48, left: 16 }}>
          <CartesianGrid stroke={tokens.color.border} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="tempoPerGrafico"
            scale="log"
            domain={[PAVIMENTO_TEMPO_LOG, "auto"]}
            tick={{ fontSize: 12, fill: tokens.color.textMuted }}
            label={{
              value: "tempo di esecuzione (s, scala logaritmica)",
              position: "insideBottom",
              offset: -16,
              style: { fontSize: 12, fill: tokens.color.textMuted },
            }}
          />
          <YAxis
            type="number"
            dataKey="spreadMc"
            domain={["dataMin - 100", "dataMax + 100"]}
            tick={{ fontSize: 12, fill: tokens.color.textMuted }}
            label={{
              value: "spread Monte Carlo",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: tokens.color.textMuted },
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            // Recharts 3 tipizza il formatter su ValueType | undefined (non solo
            // number): qui il valore e' sempre un numero (tempoPerGrafico o
            // spreadMc), ma il narrowing va reso esplicito per il type-checker.
            formatter={(valore, nome) => [
              typeof valore === "number" ? valore.toFixed(2) : String(valore),
              String(nome),
            ]}
          />

          {/* Due serie distinte: i tempi non misurati non devono avere lo stesso
              aspetto di quelli misurati, altrimenti il valore convenzionale
              usato per l'asse logaritmico passa per una misura. */}
          <Scatter name="tempo misurato" data={misurati} fill={tokens.color.nearBlack}>
            <LabelList
              dataKey="nome"
              position="top"
              style={{ fontSize: 12, fill: tokens.color.nearBlack }}
            />
          </Scatter>
          <Scatter
            name="tempo non misurato"
            data={nonMisurati}
            fill="none"
            stroke={tokens.color.textMuted}
            strokeDasharray="3 2"
          >
            <LabelList
              dataKey="nome"
              position="top"
              style={{ fontSize: 12, fill: tokens.color.textMuted }}
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {nonMisurati.length > 0 && (
        <Typography
          variant="caption"
          data-testid="didascalia-pavimento"
          sx={{ display: "block", color: tokens.color.textMuted, mt: 1, maxWidth: "70ch" }}
        >
          {nonMisurati.map((r) => r.nome).join(", ")}
          {nonMisurati.length === 1 ? " risulta" : " risultano"} a 0,00 s nei dati:
          lo zero non e' rappresentabile su scala logaritmica, quindi
          {nonMisurati.length === 1 ? " e' collocato" : " sono collocati"} al valore
          convenzionale di {formatDecimal(PAVIMENTO_TEMPO_LOG, 2)} s e resi con contorno
          tratteggiato. Il tempo reale e' inferiore a 0,1 s, non pari a quel valore.
        </Typography>
      )}
    </Box>
  );
}
