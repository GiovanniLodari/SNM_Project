import { Box, Chip, Grid, Typography } from "@mui/material";
import { SmartToy as BotIcon } from "@mui/icons-material";
import type { AccountsStats } from "../../../api/client.ts";
import Blocco from "../../dati/Blocco.tsx";
import SchedaCifra from "../../dati/SchedaCifra.tsx";
import ClassificaBarre, { type VoceClassifica } from "../../dati/ClassificaBarre.tsx";
import { TINTA_BOT, TINTA_BOT_INK, TINTA_UMANO } from "../../dati/tinte.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber, NON_DISPONIBILE } from "../../../utils/format.ts";

interface Props {
  stats: AccountsStats;
  onApriAccount: (id: number) => void;
}

/**
 * Quanto pubblico hanno questi account: mediana dei follower per categoria e i
 * dieci profili piu' seguiti.
 *
 * Chiude il capitolo perche' e' la cerniera con la propagazione: il Capitolo IV
 * sceglie da quali nodi far partire un contenuto, e il numero di follower e' la
 * prima approssimazione - grossolana - di quanto lontano puo' arrivare.
 *
 * Si usa la mediana e non la media: le distribuzioni di follower hanno una coda
 * lunghissima, e una manciata di profili molto seguiti sposterebbe la media
 * fino a farle descrivere un account che non esiste.
 */
export default function PesoNellaRete({ stats, onApriAccount }: Props) {
  const conDato = stats.followers_bot.accounts + stats.followers_human.accounts;
  const scartati = stats.followers_bot.scartati + stats.followers_human.scartati;
  const massimo = Math.max(
    stats.followers_bot.massimo ?? 0,
    stats.followers_human.massimo ?? 0,
  );

  const cifre = [
    {
      etichetta: "Mediana, bot dichiarati",
      valore:
        stats.followers_bot.mediana != null
          ? formatNumber(stats.followers_bot.mediana, { maximumFractionDigits: 0 })
          : NON_DISPONIBILE,
      nota: `follower su ${formatNumber(stats.followers_bot.accounts)} bot che dichiarano il dato`,
      accento: TINTA_BOT_INK,
    },
    {
      etichetta: "Mediana, non bot",
      valore:
        stats.followers_human.mediana != null
          ? formatNumber(stats.followers_human.mediana, { maximumFractionDigits: 0 })
          : NON_DISPONIBILE,
      nota: `follower su ${formatNumber(stats.followers_human.accounts)} account che dichiarano il dato`,
      accento: TINTA_UMANO,
    },
    {
      etichetta: "Profilo piu' seguito",
      valore: massimo > 0 ? formatNumber(massimo) : NON_DISPONIBILE,
      nota: "follower del profilo in cima alla classifica qui sotto",
      accento: tokens.color.nearBlack,
    },
    {
      etichetta: "Copertura del dato",
      valore: `${formatNumber(conDato)} / ${formatNumber(stats.accounts_total)}`,
      nota:
        scartati > 0
          ? `account con un valore dichiarato e plausibile (${formatNumber(scartati)} scartati)`
          : "account il cui profilo archiviato dichiara i follower",
      accento: tokens.color.actionBlue,
    },
  ];

  const seguiti: VoceClassifica[] = stats.piu_seguiti.map((account, indice) => ({
    chiave: String(account.id),
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
          onClick={() => onApriAccount(account.id)}
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
          {account.acct}
        </Box>
        {account.bot && (
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
    valore: `${formatNumber(account.followers)} follower`,
    segmenti: [
      {
        valore: account.followers,
        colore: account.bot ? TINTA_BOT : TINTA_UMANO,
        etichetta: `${account.acct}: follower dichiarati`,
      },
    ],
    nota: account.domain,
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
        occhiello="Classifica"
        titolo="I profili piu' seguiti dell'archivio"
        descrizione={
          "Il numero di follower e' quello che il profilo dichiara alla propria istanza, non il " +
          "conteggio degli archi di follow raccolti dal crawler: e' una misura piu' ampia, e vale " +
          "anche per la parte di rete che il progetto non ha percorso. Il nome apre il profilo " +
          "archiviato." +
          (scartati > 0
            ? ` ${formatNumber(scartati)} profili dichiarano valori impossibili - miliardi di ` +
              "follower, o l'esatto massimo di un intero a 32 bit - e sono esclusi da questa " +
              "pagina: sono guasti del dato, non account molto seguiti."
            : "")
        }
      >
        <ClassificaBarre
          voci={seguiti}
          totale={massimo}
          vuoto="Nessun profilo archiviato dichiara il numero di follower."
        />
      </Blocco>

      <Box sx={{ borderTop: tokens.border.subtle, pt: 3 }}>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, maxWidth: "70ch" }}>
          Avere molti follower non significa essere letti: il Capitolo IV mostra che la
          propagazione dipende dalla struttura delle connessioni piu&#39; che dal grado del singolo
          nodo, ed e&#39; il motivo per cui la scelta dei nodi di partenza non e&#39; semplicemente
          &laquo;i primi dieci di questa classifica&raquo;.
        </Typography>
      </Box>
    </>
  );
}
