import { Box, Typography } from "@mui/material";
import type { InfluenceDemographics } from "../../../api/client.ts";
import { composizioneRaggiunti } from "../../../utils/influenceAnalysis.ts";
import { formatNumber, formatPercent } from "../../../utils/format.ts";
import { tokens } from "../../../theme.ts";
import { TINTA_IA, TINTA_UMANO } from "../../dati/tinte.ts";

interface Props {
  demografia: InfluenceDemographics;
}

/**
 * Composizione dei nodi raggiunti dalla cascata: umani contro IA.
 *
 * Una barra orizzontale unica, non una torta: la torta invita a confrontare
 * fette fra loro quando qui c'e' un solo confronto che conta, umani contro IA,
 * e la barra lo rende come un'unica proporzione invece che come geometria
 * angolare da stimare a occhio.
 *
 * Le tinte vengono da `tinte.ts` e non sono scelte qui. Prima erano `coral`
 * per l'IA e `actionBlue` per gli umani, con un commento che dichiarava
 * fossero "gli stessi usati altrove nel progetto per la stessa distinzione":
 * non lo erano. `coral` significa "account che si dichiara bot" - lo dice la
 * legenda del grafo due blocchi piu' sotto, nello stesso atto - e
 * `actionBlue` e' la tinta dei link editoriali e di FastDetectGPT. Il coral
 * finiva cosi' per significare tre cose diverse nell'Atto III, che e'
 * esattamente il difetto per cui `tinte.ts` era stato scritto.
 */
export default function ComposizioneRaggiunti({ demografia }: Props) {
  const { quotaUmani, quotaIa } = composizioneRaggiunti(demografia);

  return (
    <Box>
      {/* `aria-hidden` e non `role="img"`: le due quote esatte stanno gia' nelle
          etichette qui sotto, in testo. Dare un nome anche alla barra farebbe
          leggere due volte gli stessi due numeri, che e' rumore, non accesso. */}
      <Box
        aria-hidden
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
            backgroundColor: TINTA_UMANO,
          }}
        />
        <Box
          sx={{
            width: `${quotaIa * 100}%`,
            backgroundColor: TINTA_IA,
          }}
        />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: "10px",
              height: "10px",
              borderRadius: tokens.radius.xs,
              backgroundColor: TINTA_UMANO,
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
              borderRadius: tokens.radius.xs,
              backgroundColor: TINTA_IA,
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
