import { Box, Typography } from "@mui/material";
import { tokens } from "../../../theme.ts";
import { formatNumber, formatPercent } from "../../../utils/format.ts";

interface ConfrontoGrafiProps {
  nodiCompleto: number;
  archiCompleto: number;
  nodiSottografo: number;
  archiSottografo: number;
  candidati: number;
  kRichiesto: number;
}

/**
 * Confronta i due grafi su cui girano gli esperimenti: il grafo completo, che
 * definisce il problema, e il sottografo snowball, su cui girano davvero gli
 * algoritmi confrontati nell'Atto II. Senza questo confronto esplicito chi
 * legge crede che i numeri successivi vengano tutti dalla stessa rete.
 */
export default function ConfrontoGrafi({
  nodiCompleto,
  archiCompleto,
  nodiSottografo,
  archiSottografo,
  candidati,
  kRichiesto,
}: ConfrontoGrafiProps) {
  const rapportoNodi = nodiSottografo / nodiCompleto;
  // Il rapporto sugli ARCHI e' calcolato a parte perche' e' un'affermazione
  // distinta da quella sui nodi, non la stessa cifra riformulata: in un
  // problema di influence maximization sono gli archi a governare costo e
  // propagazione, e sugli archi il sottografo pesa cinque volte di piu' che
  // sui nodi (15,8% contro 3,1% con questi dati). Tacere la base del calcolo
  // ("il 3,1% di che cosa?") lascerebbe credere che valga anche per gli archi.
  const rapportoArchi = archiSottografo / archiCompleto;
  // Il quadrato interno deve avere un'AREA proporzionale a `rapportoNodi`, non
  // un lato proporzionale a `rapportoNodi`. Per un quadrato Area = lato^2,
  // quindi se si vuole Area_interna / Area_esterna = rapportoNodi occorre
  // scalare il LATO di sqrt(rapportoNodi): (sqrt(rapportoNodi) * lato)^2 =
  // rapportoNodi * lato^2. Scalare il lato direttamente di `rapportoNodi` (o,
  // peggio, farlo su una sola dimensione come la larghezza di una barra ad
  // altezza fissa) produce un'area proporzionale a rapportoNodi^2 nel primo
  // caso o a sqrt(rapportoNodi) nel secondo: con questi dati (3,13%) una
  // barra a larghezza sqrt(rapportoNodi) occuperebbe visivamente il 17,7%,
  // quasi sei volte il vero rapporto. Il quadrato resta calibrato sui nodi:
  // e' la proporzione che la didascalia dichiara esplicitamente qui sotto.
  const latoPercentuale = Math.sqrt(rapportoNodi) * 100;
  const budgetInsufficiente = candidati < kRichiesto;

  return (
    <Box
      sx={{
        backgroundColor: tokens.color.canvas,
        border: tokens.border.subtle,
        borderRadius: tokens.radius.xl,
        p: 3,
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 3,
        }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              fontFamily: tokens.font.mono,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: tokens.color.textMuted,
              mb: 1,
            }}
          >
            Grafo completo
          </Typography>
          <Typography sx={{ fontFamily: tokens.font.display, fontSize: "28px", color: tokens.color.nearBlack }}>
            {formatNumber(nodiCompleto)}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
            nodi, {formatNumber(archiCompleto)} archi
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 1 }}>
            La rete intera: e' il grafo su cui il problema e' definito, ma non quello su cui gli
            algoritmi vengono confrontati.
          </Typography>
        </Box>

        <Box>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              fontFamily: tokens.font.mono,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: tokens.color.textMuted,
              mb: 1,
            }}
          >
            Sottografo snowball
          </Typography>
          <Typography sx={{ fontFamily: tokens.font.display, fontSize: "28px", color: tokens.color.nearBlack }}>
            {formatNumber(nodiSottografo)}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
            nodi, {formatNumber(archiSottografo)} archi, {formatNumber(candidati)} candidati IA
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 1 }}>
            Il campione su cui girano davvero gli esperimenti dell'Atto II: piu' piccolo, piu'
            trattabile.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 3, display: "flex", alignItems: "center", gap: 3 }}>
        <Box
          sx={{
            position: "relative",
            width: 140,
            height: 140,
            flexShrink: 0,
            backgroundColor: tokens.color.softStone,
            borderRadius: tokens.radius.md,
          }}
        >
          {/* L'etichetta resta fuori dal quadrato interno: al 3,1% il lato e'
              circa il 17,7% del contenitore, troppo piccolo per ospitare
              testo leggibile. */}
          <Box
            data-testid="quadrato-interno"
            style={{ width: `${latoPercentuale}%`, height: `${latoPercentuale}%` }}
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: tokens.color.actionBlue,
              borderRadius: "2px",
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
          Il quadrato blu, in scala, e' il sottografo: la sua area rende il rapporto sui NODI dei
          due grafi, il {formatPercent(rapportoNodi * 100)} del totale (e' l'area a rendere il
          rapporto, non il lato). Sugli ARCHI — che nell'influence maximization governano costo e
          propagazione — il sottografo pesa di piu': il {formatPercent(rapportoArchi * 100)} degli
          archi totali.
        </Typography>
      </Box>

      {budgetInsufficiente && (
        <Box
          data-testid="avviso-budget"
          sx={{
            mt: 3,
            p: 2,
            backgroundColor: tokens.color.surfaceCoral,
            border: tokens.border.subtle,
            borderRadius: tokens.radius.md,
          }}
        >
          <Typography variant="body2" sx={{ color: tokens.color.textPrimary }}>
            {/* useGrouping: true perche' l'ICU di Node/browser non raggruppa le migliaia
                sotto 10.000 in it-IT (1000 -> "1000" senza punto): qui il valore va sempre
                separato, anche per numeri a quattro cifre. */}
            Si richiedono k = {formatNumber(kRichiesto, { useGrouping: true })} seed ma i
            candidati disponibili nel sottografo sono meno: il vincolo di budget non e' attivo,
            perche' un algoritmo puo' al piu' selezionare tutti i candidati disponibili.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
