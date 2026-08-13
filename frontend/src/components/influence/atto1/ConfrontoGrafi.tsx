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
  const rapporto = nodiSottografo / nodiCompleto;
  // L'area del rettangolo, non il lato, deve rendere il rapporto fra i due
  // grafi: un rettangolo con lato proporzionale a `rapporto` esagererebbe
  // visivamente quanto e' piccolo il sottografo.
  const larghezzaPercentuale = Math.sqrt(rapporto) * 100;
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

      <Box sx={{ mt: 3 }}>
        <Box
          sx={{
            position: "relative",
            height: 96,
            backgroundColor: tokens.color.softStone,
            borderRadius: tokens.radius.md,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${larghezzaPercentuale}%`,
              backgroundColor: tokens.color.actionBlue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: tokens.color.canvas,
                fontFamily: tokens.font.mono,
                fontWeight: 600,
                px: 1,
              }}
            >
              {formatPercent(rapporto * 100)}
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 1 }}>
          L'area colorata e' proporzionale ai nodi del sottografo rispetto al grafo completo,
          cosi' la differenza di scala si vede oltre che si legge.
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
