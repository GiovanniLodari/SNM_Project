import { Box, Typography } from "@mui/material";
import type { InfluenceAlgorithmInfo } from "../../../api/client.ts";
import { scartoStimatore } from "../../../utils/influenceAnalysis.ts";
import { formatNumber } from "../../../utils/format.ts";
import { tokens } from "../../../theme.ts";

interface Props {
  algoritmi: Record<string, InfluenceAlgorithmInfo>;
}

interface RigaScarto {
  nome: string;
  stima: number;
  mc: number;
  /** Frazione con segno: negativo = sottostima, positivo = sovrastima. */
  scarto: number;
}

/**
 * Affidabilita' delle stime interne degli algoritmi rispetto allo spread
 * misurato in Monte Carlo.
 *
 * `degree` e `pagerank` non producono alcuna stima (`est_spread` e' `null`):
 * non sono baseline inaffidabili, sono semplicemente fuori tema per questo
 * componente, quindi non compaiono affatto. Includerli con uno scarto "zero"
 * li farebbe sembrare stimatori perfetti, il che sarebbe falso.
 *
 * Sottostima e sovrastima non sono rese con rosso/verde: nessuna delle due e'
 * un errore da penalizzare, sono solo due direzioni dello stesso scarto. La
 * barra e' quindi monocromatica e la direzione si legge dalla posizione
 * (a sinistra del centro = sottostima, a destra = sovrastima) e dal segno del
 * numero, non dal colore.
 */
export default function AffidabilitaStimatori({ algoritmi }: Props) {
  const righe: RigaScarto[] = Object.entries(algoritmi)
    .map(([nome, a]) => {
      const scarto = scartoStimatore(a);
      if (scarto === null || a.est_spread === null) return null;
      return { nome, stima: a.est_spread, mc: a.mc_spread, scarto };
    })
    .filter((r): r is RigaScarto => r !== null)
    .sort((x, y) => Math.abs(x.scarto) - Math.abs(y.scarto));

  if (righe.length === 0) return null;

  // Scala della barra ricavata dai dati stessi (lo scarto piu' ampio fra
  // quelli presenti occupa l'intera meta' disponibile): niente soglia scelta
  // a mano che domani, con altri numeri, potrebbe tagliare la barra.
  const scartoMassimo = Math.max(...righe.map((r) => Math.abs(r.scarto)));

  // Lo stimatore piu' fedele e' il primo dopo l'ordinamento per scarto
  // assoluto crescente.
  const piuFedele = righe[0];

  return (
    <Box>
      {/* L'esito prima delle barre, non dopo. Sotto, il componente si apriva a
          freddo su "CELF++ · stima 866,5 · MC 872,1 · -0,6%" e spiegava cosa
          si stesse guardando solo a lettura finita: chi scorreva incontrava
          quattro righe di numeri senza sapere quale domanda rispondessero. */}
      <Typography sx={{ color: tokens.color.textPrimary, mb: 3, lineHeight: 1.6 }}>
        Fra gli stimatori qui presenti, <strong>{piuFedele.nome}</strong> e' il piu'
        fedele allo spread Monte Carlo: il suo scarto e' del{" "}
        {formatNumber(piuFedele.scarto * 100, { maximumFractionDigits: 1, signDisplay: "exceptZero" })}%.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {righe.map((riga) => {
          const quotaBarra = scartoMassimo > 0 ? Math.abs(riga.scarto) / scartoMassimo : 0;
          const sottostima = riga.scarto < 0;
          return (
            <Box key={riga.nome} data-testid={`scarto-${riga.nome}`}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.5 }}>
                <Typography sx={{ fontFamily: tokens.font.display, fontSize: "16px", color: tokens.color.nearBlack }}>
                  {riga.nome}
                </Typography>
                <Typography sx={{ fontFamily: tokens.font.mono, fontSize: "14px", color: tokens.color.textPrimary }}>
                  stima {formatNumber(riga.stima, { maximumFractionDigits: 1 })} · MC{" "}
                  {formatNumber(riga.mc, { maximumFractionDigits: 1 })} ·{" "}
                  {formatNumber(riga.scarto * 100, { maximumFractionDigits: 1, signDisplay: "exceptZero" })}%
                </Typography>
              </Box>

              {/* Barra centrata sullo zero: meta' sinistra = sottostima, meta'
                  destra = sovrastima. Stesso colore in entrambe le direzioni.

                  `aria-hidden`: lo scarto col segno e' gia' nella riga di testo
                  qui sopra, quindi la barra non porta informazione che manchi -
                  la ripete in forma visiva. Nominarla la farebbe annunciare due
                  volte. */}
              <Box aria-hidden sx={{ display: "flex", alignItems: "center", height: "10px" }}>
                <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                  {sottostima && (
                    <Box
                      sx={{
                        width: `${quotaBarra * 100}%`,
                        height: "8px",
                        backgroundColor: tokens.color.nearBlack,
                        borderRadius: tokens.radius.sm,
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ width: "2px", height: "16px", backgroundColor: tokens.color.borderStrong }} />
                <Box sx={{ flex: 1 }}>
                  {!sottostima && (
                    <Box
                      sx={{
                        width: `${quotaBarra * 100}%`,
                        height: "8px",
                        backgroundColor: tokens.color.nearBlack,
                        borderRadius: tokens.radius.sm,
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
