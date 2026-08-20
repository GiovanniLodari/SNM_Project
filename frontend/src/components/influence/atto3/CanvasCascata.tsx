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
  /** Numero di passi della cascata: fondo scala dello scrubber del canvas. */
  maxStep: number;
  topSeeds?: InfluenceSeed[];
}

// L'unica legenda del grafo: quella interna a ECharts e' spenta, perche' due
// legende per gli stessi quattro stati costringevano chi guarda a riconciliare
// due vocabolari prima di poter leggere il disegno. Sopravvive questa perche' e'
// DOM, quindi raggiungibile da uno screen reader.
//
// "Attivato" e non "contagiato": il lessico epidemico e' un'inquadratura che
// il capitolo non prende altrove, e le stesse parole stanno ora anche nei
// nomi delle categorie dentro `InfluenceGraphCanvas`.
const LEGENDA = [
  { colore: tokens.color.coral, etichetta: "seed bot di origine" },
  { colore: tokens.color.activated, etichetta: "nodo attivato in questo passo" },
  { colore: tokens.color.accentCyan, etichetta: "nodo attivato in un passo precedente" },
  { colore: tokens.color.darkSlateDarker, etichetta: "nodo non ancora raggiunto" },
];

/**
 * Cornice attorno a `InfluenceGraphCanvas`: gli inoltra le props e gli
 * consegna la legenda, che il pannello rende al proprio interno.
 *
 * Titolo e avvertenza su cosa si sta guardando non stanno piu' qui: sono la
 * testa del `Blocco` che avvolge questo componente nella pagina, come per ogni
 * altro artefatto del capitolo. Prima erano un titolo da 24px reso come
 * paragrafo, quindi una sezione senza intestazione in un atto che non ne aveva
 * nessuna.
 *
 * La legenda invece resta qui e viene passata al canvas perche' vada sul fondo
 * scuro: le quattro tinte sono tinte da superficie scura, e sul canvas bianco
 * della pagina tre su quattro scendevano sotto il contrasto minimo richiesto a
 * un segno che porta informazione.
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
  const legenda = (
    <Box
      data-testid="legenda-canvas"
      component="ul"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 3,
        listStyle: "none",
        p: 0,
        m: 0,
      }}
    >
      {LEGENDA.map((voce) => (
        <Box
          key={voce.etichetta}
          component="li"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <Box
            sx={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: voce.colore,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" sx={{ color: tokens.color.textOnDark }}>
            {voce.etichetta}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  return (
    <InfluenceGraphCanvas
      nodes={nodes}
      links={links}
      maxStep={maxStep}
      onSelectNode={(node) => onSelectAccount(node.id)}
      topSeeds={topSeeds}
      selectedSeedId={seedSelezionato}
      onSelectSeedId={onSelectSeed}
      legenda={legenda}
    />
  );
}
