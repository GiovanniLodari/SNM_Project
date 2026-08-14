import { Box, Grid, Skeleton, Typography } from "@mui/material";
import type { CorpusResponse } from "../../../api/client.ts";
import SchedaCifra from "../../dati/SchedaCifra.tsx";
import Blocco from "../../dati/Blocco.tsx";
import BarraQuota from "../../dati/BarraQuota.tsx";
import ClassificaBarre, { type VoceClassifica } from "../../dati/ClassificaBarre.tsx";
import LegendaVoce from "../../dati/LegendaVoce.tsx";
import { TINTA_BOT, TINTA_UMANO } from "../../dati/tinte.ts";
import { nomeLingua } from "../corpusContent.ts";
import { tokens } from "../../../theme.ts";
import { formatDate, formatNumber, formatPercent, NON_DISPONIBILE } from "../../../utils/format.ts";

interface Props {
  dati?: CorpusResponse;
}

/** Giorni fra il primo e l'ultimo post, quando entrambe le date esistono. */
function giorniCoperti(primo: string | null, ultimo: string | null): number | null {
  if (!primo || !ultimo) return null;
  const inizio = new Date(primo).getTime();
  const fine = new Date(ultimo).getTime();
  if (Number.isNaN(inizio) || Number.isNaN(fine)) return null;
  return Math.max(1, Math.round((fine - inizio) / 86_400_000));
}

/**
 * Le dimensioni del corpus: volumi, arco temporale, lingue, istanze.
 *
 * Apre il capitolo perche' l'elenco dei post, da solo, non dice di che cosa sia
 * un campione: mille post possono venire da mille account o da tre, coprire un
 * anno o un pomeriggio, ed e' una differenza che cambia la lettura di tutto
 * quello che segue.
 */
export default function ComposizioneCorpus({ dati }: Props) {
  if (!dati) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={6} md={3} key={i}>
            <Skeleton
              variant="rectangular"
              height={140}
              sx={{ borderRadius: tokens.radius.sm, backgroundColor: tokens.color.softStone }}
            />
          </Grid>
        ))}
        <Grid item xs={12} md={6}>
          <Skeleton
            variant="rectangular"
            height={320}
            sx={{ borderRadius: tokens.radius.xl, backgroundColor: tokens.color.surfaceStone }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Skeleton
            variant="rectangular"
            height={320}
            sx={{ borderRadius: tokens.radius.xl, backgroundColor: tokens.color.surfaceStone }}
          />
        </Grid>
      </Grid>
    );
  }

  const giorni = giorniCoperti(dati.first_post_at, dati.last_post_at);
  const postPerAutore = dati.authors_total > 0 ? dati.posts_total / dati.authors_total : null;

  const cifre = [
    {
      etichetta: "Post archiviati",
      valore: formatNumber(dati.posts_total),
      nota: "Post non cancellati, l'unita' di misura di tutto il progetto",
      accento: tokens.color.nearBlack,
    },
    {
      etichetta: "Account autori",
      valore: formatNumber(dati.authors_total),
      nota:
        postPerAutore != null
          ? `${formatNumber(postPerAutore, { maximumFractionDigits: 1 })} post a testa in media`
          : "Nessun autore nel corpus",
      accento: tokens.color.actionBlue,
    },
    {
      etichetta: "Istanze di origine",
      valore: formatNumber(dati.instances_total),
      nota: "Server Mastodon distinti da cui il crawler ha raccolto",
      accento: TINTA_UMANO,
    },
    {
      etichetta: "Arco coperto",
      valore: giorni != null ? `${formatNumber(giorni)} gg` : NON_DISPONIBILE,
      nota:
        giorni != null
          ? `dal ${formatDate(dati.first_post_at)} al ${formatDate(dati.last_post_at)}`
          : "I post archiviati non portano una data",
      accento: TINTA_BOT,
    },
  ];

  const lingue: VoceClassifica[] = dati.lingue.map((voce) => ({
    chiave: voce.lang,
    etichetta: (
      <>
        <Typography
          component="span"
          sx={{ fontFamily: tokens.font.mono, fontSize: "13px", color: tokens.color.nearBlack }}
        >
          {voce.lang.toUpperCase()}
        </Typography>
        <Typography component="span" variant="body2" sx={{ color: tokens.color.textMuted }}>
          {nomeLingua(voce.lang)}
        </Typography>
      </>
    ),
    valore: `${formatNumber(voce.posts)} · ${formatPercent((voce.posts / dati.posts_total) * 100)}`,
    segmenti: [
      { valore: voce.posts, colore: tokens.color.nearBlack, etichetta: `${voce.posts} post` },
    ],
  }));

  const istanze: VoceClassifica[] = dati.istanze.map((voce) => ({
    chiave: voce.domain,
    etichetta: (
      <Typography
        component="span"
        sx={{
          fontFamily: tokens.font.body,
          fontWeight: 500,
          fontSize: "14px",
          color: tokens.color.nearBlack,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {voce.domain}
      </Typography>
    ),
    valore: `${formatNumber(voce.posts)} post`,
    segmenti: [
      { valore: voce.posts - voce.bot_posts, colore: TINTA_UMANO, etichetta: "Post di account non bot" },
      { valore: voce.bot_posts, colore: TINTA_BOT, etichetta: "Post di account dichiarati bot" },
    ],
    nota: `${formatNumber(voce.accounts)} account · ${formatPercent(
      voce.posts > 0 ? (voce.bot_posts / voce.posts) * 100 : 0,
    )} da bot dichiarati`,
  }));

  return (
    <>
      <Grid container spacing={3}>
        {cifre.map((cifra) => (
          <Grid item xs={6} md={3} key={cifra.etichetta}>
            <SchedaCifra {...cifra} />
          </Grid>
        ))}
      </Grid>

      <Blocco
        occhiello="Chi scrive"
        titolo="Bot dichiarati e tutti gli altri"
        descrizione="La bandierina 'bot' e' una dichiarazione che l'account fa nel proprio profilo: nessuno la verifica, e non dice nulla su come il testo sia stato scritto. E' il metro con cui il Capitolo II si confrontera'."
      >
        <BarraQuota
          altezza={14}
          totale={dati.posts_total}
          segmenti={[
            {
              valore: dati.posts_human,
              colore: TINTA_UMANO,
              etichetta: "Post di account che non si dichiarano bot",
            },
            {
              valore: dati.posts_bot,
              colore: TINTA_BOT,
              etichetta: "Post di account dichiarati bot",
            },
          ]}
        />
        <Box sx={{ display: "flex", gap: 4, mt: 2, flexWrap: "wrap" }}>
          <LegendaVoce
            colore={TINTA_UMANO}
            titolo={`${formatNumber(dati.posts_human)} post`}
            testo={`${formatPercent(
              dati.posts_total > 0 ? (dati.posts_human / dati.posts_total) * 100 : 0,
            )} da account che non si dichiarano bot`}
          />
          <LegendaVoce
            colore={TINTA_BOT}
            titolo={`${formatNumber(dati.posts_bot)} post`}
            testo={`${formatPercent(
              dati.posts_total > 0 ? (dati.posts_bot / dati.posts_total) * 100 : 0,
            )} da account dichiarati bot`}
          />
        </Box>
      </Blocco>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={6}>
          <Blocco
            occhiello="Distribuzione"
            titolo="Le lingue del corpus"
            descrizione={
              dati.posts_senza_lingua > 0
                ? `La lingua e' quella dichiarata dall'istanza. ${formatNumber(
                    dati.posts_senza_lingua,
                  )} post non ne dichiarano alcuna e restano fuori da questa classifica.`
                : "La lingua e' quella dichiarata dall'istanza, non un riconoscimento automatico."
            }
          >
            <ClassificaBarre voci={lingue} totale={dati.posts_total} vuoto="Nessuna lingua dichiarata." />
          </Blocco>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Blocco
            occhiello="Provenienza"
            titolo="Le istanze piu' rappresentate"
            descrizione="Ogni barra e' divisa fra account che si dichiarano bot e tutti gli altri: la composizione cambia molto da un server all'altro."
          >
            <ClassificaBarre voci={istanze} totale={dati.posts_total} vuoto="Nessuna istanza nel corpus." />
          </Blocco>
        </Grid>
      </Grid>
    </>
  );
}
