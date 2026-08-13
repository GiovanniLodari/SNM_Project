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
  const misurati = righe.filter((r) => r.statoTempo === "misurato");
  // Visivamente i punti "non affidabili" restano un unico stile (contorno
  // tratteggiato): la distinzione fra "sotto il pavimento" e "assente" e'
  // fatta a parole nella didascalia sotto, non nel grafico.
  const nonMisurati = righe.filter((r) => r.statoTempo !== "misurato");
  const sottoPavimento = nonMisurati.filter((r) => r.statoTempo === "sotto_pavimento");
  const assenti = nonMisurati.filter((r) => r.statoTempo === "assente");

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

      {/* Due didascalie distinte, non una: "sotto il pavimento" e "assente" sono
          affermazioni diverse. Confonderle userebbe un dato mancante come se
          fosse una misura sotto il decimo di secondo (vedi influenceAnalysis.ts). */}
      {sottoPavimento.length > 0 && (
        <Typography
          variant="caption"
          data-testid="didascalia-pavimento"
          sx={{ display: "block", color: tokens.color.textMuted, mt: 1, maxWidth: "70ch" }}
        >
          {sottoPavimento
            .map((r) => `${r.nome} (${formatDecimal(r.tempoS, 2)} s)`)
            .join(", ")}
          {sottoPavimento.length === 1 ? " ha un tempo" : " hanno un tempo"} reale sotto il
          pavimento rappresentabile su scala logaritmica ({formatDecimal(PAVIMENTO_TEMPO_LOG, 2)} s):
          {sottoPavimento.length === 1 ? " e' collocato" : " sono collocati"} li' per convenzione
          grafica e resi con contorno tratteggiato. Il tempo reale e' quello misurato fra
          parentesi, non il valore convenzionale usato per il grafico.
        </Typography>
      )}
      {assenti.length > 0 && (
        <Typography
          variant="caption"
          data-testid="didascalia-assente"
          sx={{ display: "block", color: tokens.color.textMuted, mt: 1, maxWidth: "70ch" }}
        >
          Per {assenti.map((r) => r.nome).join(", ")} il tempo di esecuzione non risulta
          registrato nei dati di questa run: e' un dato mancante, non un tempo vicino allo zero.
          {assenti.length === 1 ? " E' collocato" : " Sono collocati"} al valore convenzionale di{" "}
          {formatDecimal(PAVIMENTO_TEMPO_LOG, 2)} s solo per motivi grafici, con contorno
          tratteggiato.
        </Typography>
      )}
    </Box>
  );
}
