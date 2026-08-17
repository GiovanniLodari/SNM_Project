import { Box, Typography } from "@mui/material";
import { tokens } from "../../../theme.ts";
import { formatDecimal, formatNumber } from "../../../utils/format.ts";
import { MODELLO_IC, PROBLEMA } from "../influenceContent.ts";
import type { ParametriRun } from "../../../api/client.ts";

interface SchedaProblemaProps {
  params: ParametriRun | null;
}

/** Una riga "etichetta: valore" della sezione parametri, separata da un filetto. */
function RigaParametro({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        py: 1,
        borderBottom: tokens.border.subtle,
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Typography variant="body2" sx={{ color: tokens.color.textMuted, fontFamily: tokens.font.mono }}>
        {etichetta}
      </Typography>
      <Typography variant="body2" sx={{ color: tokens.color.textPrimary, fontFamily: tokens.font.mono }}>
        {valore}
      </Typography>
    </Box>
  );
}

/**
 * Enuncia il problema di Influence Maximization e il modello Independent
 * Cascade che lo istanzia, poi dichiara i parametri della run corrente - o la
 * loro assenza, quando la run non li ha registrati.
 */
export default function SchedaProblema({ params }: SchedaProblemaProps) {
  return (
    <Box sx={{ maxWidth: "70ch" }}>
      <Typography sx={{ color: tokens.color.textPrimary, lineHeight: 1.6, mb: 2 }}>
        {PROBLEMA.enunciato}
      </Typography>
      <Typography sx={{ color: tokens.color.textMuted, lineHeight: 1.6, mb: 3 }}>
        {PROBLEMA.perche_difficile}
      </Typography>

      <Box
        sx={{
          backgroundColor: tokens.color.softStone,
          borderRadius: tokens.radius.md,
          p: 2.5,
          mb: 3,
        }}
      >
        <Typography
          sx={{
            fontFamily: tokens.font.mono,
            fontSize: "15px",
            color: tokens.color.textPrimary,
          }}
        >
          {MODELLO_IC.formula}
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 1.5 }}>
          {MODELLO_IC.spiegazione}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 1,
            fontFamily: tokens.font.mono,
            color: tokens.color.textMuted,
          }}
        >
          Fonte: {MODELLO_IC.sorgente}
        </Typography>
      </Box>

      <Typography
        component="h3"
        variant="h6"
        sx={{ fontFamily: tokens.font.display, fontSize: "16px", color: tokens.color.nearBlack, mb: 1 }}
      >
        Parametri della run
      </Typography>

      {params === null ? (
        <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
          Parametri non registrati in questa esecuzione
        </Typography>
      ) : (
        <Box>
          <RigaParametro etichetta="n_sub" valore={formatNumber(params.n_sub)} />
          <RigaParametro etichetta="k" valore={formatNumber(params.k)} />
          <RigaParametro etichetta="theta" valore={formatDecimal(params.theta, 4)} />
          <RigaParametro etichetta="num_rr" valore={formatNumber(params.num_rr)} />
          <RigaParametro etichetta="mc_runs_celf" valore={formatNumber(params.mc_runs_celf)} />
          <RigaParametro etichetta="eval_runs" valore={formatNumber(params.eval_runs)} />
          <RigaParametro etichetta="random_seed" valore={formatNumber(params.random_seed)} />
          <RigaParametro etichetta="ic_p0" valore={formatDecimal(params.ic_p0, 4)} />
          <RigaParametro etichetta="ic_cap" valore={formatDecimal(params.ic_cap, 4)} />
          <RigaParametro etichetta="ic_method" valore={params.ic_method} />
        </Box>
      )}
    </Box>
  );
}
