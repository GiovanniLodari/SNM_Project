import { Box, Chip, Typography } from "@mui/material";
import { SmartToy as BotIcon } from "@mui/icons-material";
import type { ProduttoreIa } from "../../../api/client.ts";
import Blocco from "../../dati/Blocco.tsx";
import ClassificaBarre, { type VoceClassifica } from "../../dati/ClassificaBarre.tsx";
import { TINTA_BOT, TINTA_IA } from "../../dati/tinte.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber, formatPercent } from "../../../utils/format.ts";

interface Props {
  produttori: readonly ProduttoreIa[];
  detector: string;
  /** Apre il profilo dell'account: la classifica porta solo un id e un nome. */
  onApriAccount: (id: number) => void;
}

/**
 * I dieci account con piu' post marcati come sintetici.
 *
 * E' il passaggio dalle percentuali ai profili: una quota aggregata non dice se
 * dietro ci sia un bollettino meteo automatico o una persona che si fa aiutare
 * a scrivere, e la differenza si vede solo aprendo il profilo - il che e' anche
 * il motivo per cui ogni riga e' un bottone.
 *
 * L'ordinamento e' per numero di post marcati e non per media: con la media in
 * testa alla classifica finirebbe chi ha un solo post valutato, molto sopra
 * soglia, che non e' il maggior produttore di alcunche'.
 */
export default function ProduttoriIa({ produttori, detector, onApriAccount }: Props) {
  // Denominatore comune: il piu' prolifico fra i valutati. Con un denominatore
  // per riga ogni barra risulterebbe piena e il confronto sparirebbe.
  const massimo = produttori.reduce((max, voce) => Math.max(max, voce.posts_scored), 0);

  const voci: VoceClassifica[] = produttori.map((produttore, indice) => ({
    chiave: String(produttore.id),
    etichetta: (
      <>
        <Typography
          component="span"
          sx={{ fontFamily: tokens.font.mono, fontSize: "12px", color: tokens.color.textMuted }}
        >
          {String(indice + 1).padStart(2, "0")}
        </Typography>
        <Box
          component="button"
          type="button"
          onClick={() => onApriAccount(produttore.id)}
          sx={{
            border: "none",
            background: "none",
            p: 0,
            cursor: "pointer",
            fontFamily: tokens.font.body,
            fontWeight: 600,
            fontSize: "15px",
            color: tokens.color.actionBlue,
            textDecoration: "underline",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: { xs: "160px", sm: "none" },
          }}
        >
          {produttore.acct}
        </Box>
        {produttore.bot && (
          <Chip
            icon={<BotIcon style={{ fontSize: 13, color: tokens.color.canvas }} />}
            label="BOT"
            size="small"
            sx={{
              height: 20,
              fontSize: "11px",
              fontWeight: 600,
              backgroundColor: TINTA_BOT,
              color: tokens.color.canvas,
            }}
          />
        )}
      </>
    ),
    valore: `${formatNumber(produttore.ai_posts)} / ${formatNumber(produttore.posts_scored)}`,
    segmenti: [
      {
        valore: produttore.ai_posts,
        colore: TINTA_IA,
        etichetta: `${produttore.acct}: post marcati come sintetici`,
      },
      {
        valore: Math.max(0, produttore.posts_scored - produttore.ai_posts),
        colore: tokens.color.softStone,
        etichetta: `${produttore.acct}: post valutati e sotto soglia`,
      },
    ],
    nota: `${produttore.domain} · media ${formatPercent(produttore.mean_prob * 100)}${
      produttore.followers != null ? ` · ${formatNumber(produttore.followers)} follower` : ""
    }`,
  }));

  return (
    <Blocco
      occhiello="Classifica"
      titolo="Chi ne produce di piu'"
      descrizione={`I dieci account con piu' post marcati da ${detector}. La parte colorata di ogni barra sono i post sopra soglia, quella chiara i post valutati e lasciati passare: la lunghezza totale dice quanto quell'account e' stato letto dal modello. Il nome apre il profilo archiviato.`}
    >
      <ClassificaBarre
        voci={voci}
        totale={massimo}
        vuoto="Nessun account supera la soglia: il rilevatore non ha ancora prodotto punteggi, oppure nessuna media li supera."
      />
    </Blocco>
  );
}
