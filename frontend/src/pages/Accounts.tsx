import type { ReactNode } from "react";
import { Box, Grid, Skeleton, Typography } from "@mui/material";
import { useAccountsQuery } from "../api/queries.ts";
import AccountDetailModal from "../components/AccountDetailModal.tsx";
import PaginaCapitolo, { Sezione } from "../components/narrativa/PaginaCapitolo.tsx";
import BandaScura from "../components/narrativa/BandaScura.tsx";
import { useAttoInVista } from "../components/narrativa/useAttoInVista.ts";
import PopolazioneAccount from "../components/account/atto1/PopolazioneAccount.tsx";
import MatriceBotIa from "../components/account/atto2/MatriceBotIa.tsx";
import ProduttoriIa from "../components/account/atto2/ProduttoriIa.tsx";
import PesoNellaRete from "../components/account/atto3/PesoNellaRete.tsx";
import { ATTI_ACCOUNT } from "../components/account/accountContent.ts";
import { ErrorState } from "../components/States.tsx";
import { useDettaglioAccount } from "../hooks/useDettaglioAccount.ts";
import { CAPITOLO_CORPUS } from "../navigazione.ts";
import { tokens } from "../theme.ts";
import { formatNumber, formatPercent } from "../utils/format.ts";

const [ATTO_POPOLAZIONE, ATTO_DICHIARAZIONE, ATTO_PESO] = ATTI_ACCOUNT;

/**
 * Il capitolo su chi ha scritto il corpus, in tre atti: quanti sono e dove
 * stanno, quanto la loro dichiarazione coincide col giudizio del rilevatore, e
 * quanta voce hanno nella rete.
 *
 * Erano due riquadri con cinque numeri e due barre di avanzamento: dicevano
 * quanti bot ci sono e quanti account producono testo sintetico, ma non
 * incrociavano mai le due cose - che e' l'unica domanda interessante - e non
 * dicevano nemmeno quale rilevatore avesse emesso quei giudizi.
 */
export default function Accounts() {
  const { data: stats, isLoading, isError } = useAccountsQuery();
  const dettaglio = useDettaglioAccount();

  // Le sezioni entrano nel DOM solo con i dati: prima di allora non c'e' niente
  // da osservare per l'indice laterale.
  const attoAttivo = useAttoInVista(ATTI_ACCOUNT, Boolean(stats));

  const guscio = (contenuto: ReactNode) => (
    <PaginaCapitolo
      numero={CAPITOLO_CORPUS.numero}
      capitolo={CAPITOLO_CORPUS.etichetta}
      titolo="Chi ha scritto i post del corpus"
      guida="Quanti account si dichiarano automatizzati, quanti pubblicano testo che il rilevatore marca come sintetico, e quanto le due categorie si sovrappongono. Sono due cose diverse, ed e' proprio la loro distanza a essere interessante."
      atti={ATTI_ACCOUNT}
      attoAttivo={attoAttivo}
    >
      {contenuto}
    </PaginaCapitolo>
  );

  if (isError) {
    return guscio(
      <ErrorState message="Impossibile caricare le statistiche sugli account. Verificare che il backend sia in esecuzione." />,
    );
  }

  if (isLoading || !stats) {
    return guscio(
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
        <Grid item xs={12}>
          <Skeleton
            variant="rectangular"
            height={380}
            sx={{ borderRadius: tokens.radius.xl, backgroundColor: tokens.color.surfaceStone }}
          />
        </Grid>
      </Grid>,
    );
  }

  const valutati = stats.valutati_bot + stats.valutati_human;
  const tassoBot = stats.valutati_bot > 0 ? (stats.ai_and_bot / stats.valutati_bot) * 100 : null;
  const tassoUmano =
    stats.valutati_human > 0 ? (stats.ai_and_not_bot / stats.valutati_human) * 100 : null;
  const quotaBotFraProduttori =
    stats.ai_producers_total > 0 ? (stats.ai_and_bot / stats.ai_producers_total) * 100 : null;

  return (
    <>
      {guscio(
        <>
          <Sezione atto={ATTO_POPOLAZIONE}>
            <PopolazioneAccount stats={stats} />
          </Sezione>

          {/* La cifra che apre l'atto seguente: quanti account producono testo
              sintetico, e quanti di loro non lo avevano dichiarato. */}
          {quotaBotFraProduttori != null && (
            <BandaScura
              larghezza="colonna"
              occhiello="Il punto della questione"
              titolo={`${formatNumber(stats.ai_and_not_bot)} account scrivono come una macchina senza dirlo`}
              testo={
                `Su ${formatNumber(stats.ai_producers_total)} account i cui post ${stats.detector} ` +
                "marca in media come sintetici, meno della meta' si dichiara automatizzato. La " +
                "bandierina 'bot' e il giudizio di un rilevatore misurano cose diverse, e chi " +
                "volesse usare la prima per stimare il secondo sbaglierebbe di questo scarto."
              }
              cifre={[
                {
                  valore: formatNumber(stats.ai_producers_total),
                  etichetta: "Account che producono testo sintetico",
                },
                {
                  valore: formatPercent(quotaBotFraProduttori),
                  etichetta: "Di questi, si dichiara bot",
                },
                {
                  valore: formatNumber(valutati),
                  etichetta: "Account con almeno un post valutato",
                },
              ]}
            />
          )}

          <Sezione atto={ATTO_DICHIARAZIONE}>
            <MatriceBotIa stats={stats} />
            <ProduttoriIa
              produttori={stats.top_produttori}
              detector={stats.detector}
              onApriAccount={dettaglio.apri}
            />
          </Sezione>

          <Sezione atto={ATTO_PESO}>
            <PesoNellaRete stats={stats} onApriAccount={dettaglio.apri} />
          </Sezione>

          {/* Chiusura del capitolo: cosa queste cifre non dimostrano. */}
          <Box sx={{ borderTop: tokens.border.subtle, pt: 4 }}>
            <Typography variant="body2" sx={{ color: tokens.color.textMuted, maxWidth: "70ch" }}>
              I giudizi di questa pagina vengono da un solo rilevatore, {stats.detector}, applicato
              alla media dei post di ciascun account: un account con un post molto sopra soglia e
              venti sotto non compare fra i produttori, e uno con due soli post valutati puo&#39;
              comparirvi. Il Capitolo II mostra quanto i quattro rilevatori divergano fra loro
              {tassoBot != null && tassoUmano != null
                ? `, il che vale anche per lo scarto fra ${formatPercent(
                    tassoBot,
                  )} e ${formatPercent(tassoUmano)} riportato qui sopra`
                : ""}
              .
            </Typography>
          </Box>
        </>,
      )}

      <AccountDetailModal
        open={dettaglio.aperto}
        onClose={dettaglio.chiudi}
        account={dettaglio.account}
        loading={dettaglio.caricamento}
        error={dettaglio.errore}
      />
    </>
  );
}
