import { Box, Typography } from "@mui/material";
import type { InfluenceDemographics } from "../../../api/client.ts";
import { composizioneRaggiunti } from "../../../utils/influenceAnalysis.ts";
import { formatNumber, formatPercent } from "../../../utils/format.ts";
import { tokens } from "../../../theme.ts";

interface Props {
  demografia: InfluenceDemographics;
}

/**
 * Composizione dei nodi raggiunti dalla cascata: umani contro IA.
 *
 * Una barra orizzontale unica, non una torta: la torta invita a confrontare
 * fette fra loro quando qui c'e' un solo confronto che conta, umani contro IA,
 * e la barra lo rende come un'unica proporzione invece che come geometria
 * angolare da stimare a occhio. I colori sono gli stessi usati altrove nel
 * progetto per la stessa distinzione: `actionBlue` per gli account umani,
 * `coral` per gli account IA.
 */
export default function ComposizioneRaggiunti({ demografia }: Props) {
  const { quotaUmani, quotaIa } = composizioneRaggiunti(demografia);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          width: "100%",
          height: "28px",
          borderRadius: tokens.radius.sm,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${quotaUmani * 100}%`,
            backgroundColor: tokens.color.actionBlue,
          }}
        />
        <Box
          sx={{
            width: `${quotaIa * 100}%`,
            backgroundColor: tokens.color.coral,
          }}
        />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              backgroundColor: tokens.color.actionBlue,
            }}
          />
          <Typography sx={{ fontFamily: tokens.font.mono, fontSize: "13px", color: tokens.color.textPrimary }}>
            umani: {formatNumber(demografia.activated_human, { useGrouping: true })} (
            {formatPercent(quotaUmani * 100)})
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              backgroundColor: tokens.color.coral,
            }}
          />
          <Typography sx={{ fontFamily: tokens.font.mono, fontSize: "13px", color: tokens.color.textPrimary }}>
            IA: {formatNumber(demografia.activated_ai, { useGrouping: true })} (
            {formatPercent(quotaIa * 100)})
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
