import { Box, Typography } from "@mui/material";
import InfluenceGraphCanvas from "../../InfluenceGraphCanvas.tsx";
import type { InfluenceGraphLink, InfluenceGraphNode, InfluenceSeed } from "../../../api/client.ts";
import { tokens } from "../../../theme.ts";

interface Props {
  nodes: InfluenceGraphNode[];
  links: InfluenceGraphLink[];
  onSelectAccount: (id: string) => void;
  seedSelezionato?: string;
  onSelectSeed: (seedId: string) => void;
  /** Inoltrati cosi' come sono a InfluenceGraphCanvas: numero di step per lo
   * scrubber e lista per il selettore del seed. Non fanno parte del
   * contratto minimo di questa cornice, ma il canvas li sa usare se ci sono. */
  maxStep?: number;
  topSeeds?: InfluenceSeed[];
}

// Limiti applicati dal backend nella costruzione del sottografo per il
// canvas (webapp/influence.py): i primi N seed per raggiungimento diretto,
// e per ciascuno al piu' M bersagli, per restare intorno ai ~400 nodi che
// ECharts puo' disegnare senza perdere fluidita'. Nominati qui invece che
// scritti a mano nel JSX sotto, cosi' un cambio di soglia sul backend si
// aggiorna in un punto solo.
const SEED_DISEGNATI = 60;
const BERSAGLI_PER_SEED = 6;

const LEGENDA = [
  { colore: tokens.color.coral, etichetta: "seed bot di origine" },
  { colore: tokens.color.activated, etichetta: "nodo appena attivato nello step corrente" },
  { colore: tokens.color.accentCyan, etichetta: "nodo attivo, contagiato in uno step precedente" },
  { colore: tokens.color.darkSlateDarker, etichetta: "nodo non ancora raggiunto" },
];

/**
 * Cornice attorno a `InfluenceGraphCanvas`: titolo, avvertenza su cosa si sta
 * guardando e legenda leggibile da uno screen reader (la legenda interna a
 * ECharts e' testo disegnato su canvas, non DOM).
 *
 * L'avvertenza esiste perche' il canvas non disegna gli 80.943 nodi
 * raggiunti dalla cascata: disegna un sottografo dei seed piu' efficaci e di
 * una parte dei loro bersagli diretti. Senza dirlo esplicitamente, chi guarda
 * il canvas puo' credere di vedere l'intera propagazione descritta
 * nell'Atto III, quando ne vede solo un campione pensato per restare
 * renderizzabile.
 *
 * Non modifica `InfluenceGraphCanvas.tsx`: si limita a inoltrargli le props.
 */
export default function CanvasCascata({
  nodes,
  links,
  onSelectAccount,
  seedSelezionato,
  onSelectSeed,
  maxStep,
  topSeeds,
}: Props) {
  return (
    <Box>
      <Typography
        sx={{
          fontFamily: tokens.font.display,
          fontWeight: 400,
          fontSize: "24px",
          color: tokens.color.nearBlack,
          mb: 1,
        }}
      >
        Estratto del grafo: primi {SEED_DISEGNATI} seed e fino a {BERSAGLI_PER_SEED} bersagli ciascuno
      </Typography>

      <Typography
        data-testid="avvertenza-sottografo"
        sx={{ color: tokens.color.textMuted, maxWidth: "70ch", mb: 3, lineHeight: 1.6 }}
      >
        Questo canvas non disegna l'intera cascata: mostra i primi{" "}
        {SEED_DISEGNATI} seed per raggiungimento diretto e, per ciascuno, fino
        a {BERSAGLI_PER_SEED} bersagli, un sottografo scelto per restare
        leggibile a schermo. Il conteggio dei nodi raggiunti riportato
        nell'Atto III si riferisce alla cascata completa, non a quanto e'
        disegnato qui.
      </Typography>

      <InfluenceGraphCanvas
        nodes={nodes}
        links={links}
        maxStep={maxStep}
        onSelectNode={(node) => onSelectAccount(node.id)}
        topSeeds={topSeeds}
        selectedSeedId={seedSelezionato}
        onSelectSeedId={onSelectSeed}
      />

      <Box
        data-testid="legenda-canvas"
        sx={{ display: "flex", flexWrap: "wrap", gap: 3, mt: 2 }}
      >
        {LEGENDA.map((voce) => (
          <Box key={voce.etichetta} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: voce.colore,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
              {voce.etichetta}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
