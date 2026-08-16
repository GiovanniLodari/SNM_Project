import { Box, Grid, Typography } from "@mui/material";
import type { AccountsStats } from "../../../api/client.ts";
import SchedaCifra from "../../dati/SchedaCifra.tsx";
import Blocco from "../../dati/Blocco.tsx";
import BarraQuota from "../../dati/BarraQuota.tsx";
import ClassificaBarre, { type VoceClassifica } from "../../dati/ClassificaBarre.tsx";
import LegendaVoce from "../../dati/LegendaVoce.tsx";
import { TINTA_BOT, TINTA_BOT_INK, TINTA_UMANO } from "../../dati/tinte.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber, formatPercent } from "../../../utils/format.ts";

interface Props {
  stats: AccountsStats;
}

/**
 * Quanti account ci sono, quanti si dichiarano bot, dove stanno e quanti di
 * loro hanno davvero pubblicato qualcosa.
 *
 * L'ultima cifra e' quella che mancava: il crawler archivia anche gli account
 * incontrati come estremo di un arco di follow, che nel corpus non hanno scritto
 * un solo post. Contarli insieme agli autori gonfiava ogni percentuale
 * successiva.
 */
export default function PopolazioneAccount({ stats }: Props) {
  const totale = stats.accounts_total;
  const quotaBot = totale > 0 ? (stats.bot_total / totale) * 100 : 0;
  const postTotali = stats.posts_bot + stats.posts_human;
  const quotaConPost = totale > 0 ? (stats.accounts_con_post / totale) * 100 : 0;

  const cifre = [
    {
      etichetta: "Account archiviati",
      valore: formatNumber(totale),
      nota: "Profili incontrati dal crawler, autori o soltanto seguiti",
      accento: tokens.color.nearBlack,
    },
    {
      etichetta: "Bot dichiarati",
      valore: formatNumber(stats.bot_total),
      nota: `${formatPercent(quotaBot)} degli account si marca come automatizzato`,
      accento: TINTA_BOT_INK,
    },
    {
      etichetta: "Hanno pubblicato",
      valore: formatNumber(stats.accounts_con_post),
      nota: `${formatPercent(quotaConPost)} ha almeno un post nel corpus`,
      accento: TINTA_UMANO,
    },
    {
      etichetta: "Post per autore",
      valore:
        stats.accounts_con_post > 0
          ? formatNumber(postTotali / stats.accounts_con_post, { maximumFractionDigits: 1 })
          : "n/d",
      nota: `${formatNumber(postTotali)} post divisi fra chi ha davvero scritto`,
      accento: tokens.color.actionBlue,
    },
  ];

  const istanze: VoceClassifica[] = stats.istanze.map((voce) => ({
    chiave: voce.domain,
    etichetta: (
      <Typography
        component="span"
        sx={{
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
    valore: `${formatNumber(voce.accounts)} account`,
    segmenti: [
      {
        valore: voce.accounts - voce.bot_accounts,
        colore: TINTA_UMANO,
        etichetta: "Account che non si dichiarano bot",
      },
      { valore: voce.bot_accounts, colore: TINTA_BOT, etichetta: "Account dichiarati bot" },
    ],
    nota: `${formatNumber(voce.bot_accounts)} bot dichiarati · ${formatPercent(
      voce.accounts > 0 ? (voce.bot_accounts / voce.accounts) * 100 : 0,
    )} dell'istanza`,
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

      <Grid container spacing={4}>
        <Grid item xs={12} lg={5}>
          <Blocco
            occhiello="Composizione"
            titolo="Chi si dichiara automatizzato"
            descrizione="La bandierina 'bot' e' un campo del profilo che ogni account compila da se'. Nessuno la verifica, e non dice nulla su chi abbia scritto il testo."
          >
            <BarraQuota
              altezza={14}
              totale={totale}
              segmenti={[
                {
                  valore: stats.nonbot_total,
                  colore: TINTA_UMANO,
                  etichetta: "Account che non si dichiarano bot",
                },
                { valore: stats.bot_total, colore: TINTA_BOT, etichetta: "Account dichiarati bot" },
              ]}
            />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2.5 }}>
              <LegendaVoce
                colore={TINTA_UMANO}
                titolo={formatNumber(stats.nonbot_total)}
                testo={`account che non si dichiarano bot (${formatPercent(100 - quotaBot)})`}
              />
              <LegendaVoce
                colore={TINTA_BOT}
                titolo={formatNumber(stats.bot_total)}
                testo={`account dichiarati bot (${formatPercent(quotaBot)})`}
              />
            </Box>

            <Box sx={{ mt: 3, pt: 3, borderTop: tokens.border.subtle }}>
              <Typography variant="body2" sx={{ color: tokens.color.textMuted, lineHeight: 1.6 }}>
                I bot dichiarati hanno scritto {formatNumber(stats.posts_bot)} post,{" "}
                {formatPercent(postTotali > 0 ? (stats.posts_bot / postTotali) * 100 : 0)} del
                corpus: una quota diversa da quella che occupano come account, perche&#39; un bot
                pubblica con una frequenza che una persona non ha.
              </Typography>
            </Box>
          </Blocco>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Blocco
            occhiello="Provenienza"
            titolo="Le istanze piu' popolate"
            descrizione="Ogni barra e' l'intera popolazione di quell'istanza, divisa fra chi si dichiara bot e chi no. La quota cambia molto da un server all'altro: alcune istanze ospitano quasi solo automi."
          >
            <ClassificaBarre voci={istanze} totale={totale} vuoto="Nessuna istanza archiviata." />
          </Blocco>
        </Grid>
      </Grid>
    </>
  );
}
