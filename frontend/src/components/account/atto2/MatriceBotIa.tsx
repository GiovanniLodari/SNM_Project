import { Box, Typography } from "@mui/material";
import { SmartToy as BotIcon, Person as HumanIcon } from "@mui/icons-material";
import type { AccountsStats } from "../../../api/client.ts";
import Blocco from "../../dati/Blocco.tsx";
import EtichettaMono from "../../narrativa/EtichettaMono.tsx";
import { COLONNE_MATRICE } from "../accountContent.ts";
import { TINTA_BOT, TINTA_IA, TINTA_NON_VALUTATO, TINTA_UMANO } from "../../dati/tinte.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber, formatPercent, NON_DISPONIBILE } from "../../../utils/format.ts";

interface Props {
  stats: AccountsStats;
}

interface Riga {
  chiave: string;
  titolo: string;
  icona: typeof BotIcon;
  tinta: string;
  totale: number;
  valutati: number;
  ia: number;
}

/**
 * La matrice fra cio' che un account dichiara di essere e cio' che il rilevatore
 * dice del suo testo.
 *
 * Prima erano due barre di avanzamento affiancate, e le due domande - quanti
 * bot ci sono, quanti account scrivono testo sintetico - restavano accostate
 * senza mai incrociarsi. Incrociarle e' il punto della pagina: le due
 * classificazioni non coincidono, e la casella "bot che non producono testo
 * sintetico" e' grande quanto quella che ci si aspetterebbe piena.
 *
 * La terza colonna e' l'onesta' della tabella: gli account su cui il rilevatore
 * non si e' pronunciato non sono account assolti, e tenerli visibili impedisce
 * di leggere le percentuali come se coprissero tutti.
 */
export default function MatriceBotIa({ stats }: Props) {
  const righe: Riga[] = [
    {
      chiave: "bot",
      titolo: "Si dichiarano bot",
      icona: BotIcon,
      tinta: TINTA_BOT,
      totale: stats.bot_total,
      valutati: stats.valutati_bot,
      ia: stats.ai_and_bot,
    },
    {
      chiave: "umani",
      titolo: "Non si dichiarano bot",
      icona: HumanIcon,
      tinta: TINTA_UMANO,
      totale: stats.nonbot_total,
      valutati: stats.valutati_human,
      ia: stats.ai_and_not_bot,
    },
  ];

  const quota = (parte: number, tutto: number): string =>
    tutto > 0 ? formatPercent((parte / tutto) * 100) : NON_DISPONIBILE;

  const tassoBot = stats.valutati_bot > 0 ? (stats.ai_and_bot / stats.valutati_bot) * 100 : null;
  const tassoUmano =
    stats.valutati_human > 0 ? (stats.ai_and_not_bot / stats.valutati_human) * 100 : null;

  const griglia = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", md: "minmax(150px, 1fr) repeat(3, 1.15fr)" },
    gap: { xs: 1.5, md: 0 },
  };

  return (
    <Blocco
      occhiello={`Rilevatore: ${stats.detector}`}
      titolo="Dichiararsi bot e scrivere come una macchina"
      descrizione={`Le righe sono cio' che l'account dichiara nel proprio profilo, le colonne cio' che ${stats.detector} dice dei suoi post: un account entra nella prima colonna quando la media dei punteggi dei suoi post supera ${formatPercent(stats.ai_threshold * 100, 0)}. Sono due classificazioni indipendenti, ed e' la loro distanza a essere interessante.`}
    >
      {/* Intestazione di colonna: solo da md, dove la tabella e' davvero una
          tabella. Sotto, ogni cella porta la propria etichetta. */}
      <Box sx={{ ...griglia, display: { xs: "none", md: "grid" }, mb: 1 }}>
        <Box />
        {COLONNE_MATRICE.map((colonna) => (
          <Box key={colonna.id} sx={{ px: 2 }}>
            <EtichettaMono taglia="micro">{colonna.titolo}</EtichettaMono>
            <Typography sx={{ ...tokens.type.micro, color: tokens.color.textMuted, mt: 0.5 }}>
              {colonna.spiegazione}
            </Typography>
          </Box>
        ))}
      </Box>

      {righe.map((riga) => {
        const valutatiNonIa = Math.max(0, riga.valutati - riga.ia);
        const nonValutati = Math.max(0, riga.totale - riga.valutati);
        const celle = [
          { id: "ia", valore: riga.ia, tinta: TINTA_IA, sfondo: tokens.color.surfacePurple },
          {
            id: "non-ia",
            valore: valutatiNonIa,
            tinta: tokens.color.nearBlack,
            sfondo: tokens.color.canvas,
          },
          {
            id: "non-valutato",
            valore: nonValutati,
            tinta: tokens.color.textMuted,
            sfondo: tokens.color.canvas,
          },
        ];

        return (
          <Box
            key={riga.chiave}
            sx={{
              ...griglia,
              borderTop: tokens.border.subtle,
              py: { xs: 2, md: 0 },
              alignItems: "stretch",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: { md: 3 }, pr: 2 }}>
              <riga.icona sx={{ fontSize: 20, color: riga.tinta }} />
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: "15px", color: tokens.color.nearBlack }}>
                  {riga.titolo}
                </Typography>
                <Typography sx={{ ...tokens.type.micro, color: tokens.color.textMuted }}>
                  {formatNumber(riga.totale)} account
                </Typography>
              </Box>
            </Box>

            {celle.map((cella, indice) => (
              <Box
                key={cella.id}
                sx={{
                  p: 2,
                  backgroundColor: cella.sfondo,
                  borderRadius: tokens.radius.sm,
                  borderLeft: { md: indice === 0 ? "none" : tokens.border.subtle },
                }}
              >
                <Box sx={{ display: { xs: "block", md: "none" }, mb: 0.5 }}>
                  <EtichettaMono taglia="micro">{COLONNE_MATRICE[indice].titolo}</EtichettaMono>
                </Box>
                <Typography
                  sx={{
                    fontFamily: tokens.font.display,
                    fontSize: "28px",
                    lineHeight: 1.1,
                    letterSpacing: "-0.32px",
                    color: cella.tinta,
                  }}
                >
                  {formatNumber(cella.valore)}
                </Typography>
                <Typography sx={{ ...tokens.type.micro, color: tokens.color.textMuted, mt: 0.5 }}>
                  {quota(cella.valore, riga.totale)} della riga
                </Typography>
              </Box>
            ))}
          </Box>
        );
      })}

      <Box
        sx={{
          mt: 4,
          p: 3,
          borderRadius: tokens.radius.lg,
          backgroundColor: tokens.color.softStone,
        }}
      >
        <EtichettaMono taglia="micro" sx={{ mb: 1 }}>
          Come si leggono
        </EtichettaMono>
        <Typography variant="body2" sx={{ color: tokens.color.textPrimary, lineHeight: 1.7 }}>
          Contando solo gli account su cui {stats.detector} si e&#39; pronunciato,{" "}
          <strong>{tassoBot != null ? formatPercent(tassoBot) : NON_DISPONIBILE}</strong> dei bot
          dichiarati scrive testo che il modello considera sintetico, contro{" "}
          <strong>{tassoUmano != null ? formatPercent(tassoUmano) : NON_DISPONIBILE}</strong> degli
          account che non si dichiarano tali. Le due cifre non si sommano e non descrivono lo stesso
          insieme: la prima e&#39; calcolata su {formatNumber(stats.valutati_bot)} account, la
          seconda su {formatNumber(stats.valutati_human)}.
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: tokens.color.textMuted, lineHeight: 1.7, mt: 1.5 }}
        >
          Nessuna delle due e&#39; una misura di accuratezza: senza account etichettati a mano non
          esiste un metro con cui dire quante di queste attribuzioni siano corrette.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 3, mt: 2, flexWrap: "wrap" }}>
        <Legenda colore={TINTA_IA} testo="Produce testo sintetico" />
        <Legenda colore={tokens.color.nearBlack} testo="Valutato, sotto soglia" />
        <Legenda colore={TINTA_NON_VALUTATO} testo="Nessun post valutato" />
      </Box>
    </Blocco>
  );
}

/** Pastiglia + testo, versione compatta senza cifra. */
function Legenda({ colore, testo }: { colore: string; testo: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: colore }} />
      <Typography sx={{ ...tokens.type.micro, color: tokens.color.textMuted }}>{testo}</Typography>
    </Box>
  );
}
