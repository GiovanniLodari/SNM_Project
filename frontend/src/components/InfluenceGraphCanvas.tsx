import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useMovimentoRidotto } from "../hooks/useMovimentoRidotto.ts";
import {
  Box,
  Typography,
  IconButton,
  Slider,
  Paper,
  Stack,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  PlayArrow,
  Pause,
  RestartAlt,
  SkipNext,
  SkipPrevious,
  Speed as SpeedIcon,
  FlashOn as PulseIcon,
  BubbleChart as GraphChartIcon,
  AccountTree as TreeIcon,
} from "@mui/icons-material";
import ReactECharts from "../utils/echarts.tsx";
import { escapeHtml } from "../utils/html.ts";
import { InfluenceGraphNode, InfluenceGraphLink, InfluenceSeed } from "../api/client.ts";

/**
 * Forma dei nodi e degli archi passati a ECharts. La libreria accetta oggetti
 * liberi, ma qui erano dichiarati `any[]`: le due strutture centrali del
 * componente non avevano alcun tipo. `rawNode` e' il nostro dato originale,
 * che i callback rileggono dal payload dell'evento.
 */
interface EchartsNode {
  id: string;
  name: string;
  symbolSize: number;
  x: number;
  y: number;
  category: number;
  itemStyle: Record<string, unknown>;
  label: Record<string, unknown>;
  rawNode: InfluenceGraphNode;
}

interface EchartsLink {
  source: string;
  target: string;
  lineStyle: Record<string, unknown>;
}

/** Payload dei callback ECharts, ridotto ai campi effettivamente letti. */
interface EchartsCallbackParams {
  dataType?: "node" | "edge";
  data?: { rawNode?: InfluenceGraphNode };
  name?: string;
  value?: number;
}
import { tokens } from "../theme.ts";
import { formatNumber } from "../utils/format.ts";

interface InfluenceGraphCanvasProps {
  nodes: InfluenceGraphNode[];
  links: InfluenceGraphLink[];
  /**
   * Numero di passi della cascata: e' il fondo scala dello scrubber.
   *
   * Obbligatoria, e prima non lo era: il default era `11`, il numero di passi
   * di *questa* run. Su un'altra lo scrubber avrebbe mostrato undici passi di
   * una cascata che ne ha altri, senza che nulla lo segnalasse.
   */
  maxStep: number;
  onSelectNode?: (node: InfluenceGraphNode) => void;
  topSeeds?: InfluenceSeed[];
  /**
   * Seed di cui mostrare la cascata. Quando manca si usa il primo di
   * `topSeeds`, che e' il piu' efficace: il default era `"66109"`, cioe'
   * l'identificativo di un account in *questo* database - su un altro non
   * esiste, e il canvas avrebbe disegnato un estratto che non corrisponde a
   * niente senza dirlo.
   */
  selectedSeedId?: string;
  onSelectSeedId?: (seedId: string) => void;
  /**
   * Legenda delle quattro categorie di nodo, resa dentro il pannello scuro.
   *
   * Arriva da fuori perche' le parole sono del capitolo, non dello strumento;
   * ma va renderizzata qui perche' le tinte dei nodi sono pensate per il fondo
   * `darkCanvas` e sul canvas bianco della pagina tre su quattro scendono sotto
   * il contrasto minimo (il ciano da' 1,5:1).
   */
  legenda?: ReactNode;
}

export default function InfluenceGraphCanvas({
  nodes: rawNodes = [],
  links: rawLinks = [],
  maxStep,
  onSelectNode,
  topSeeds = [],
  selectedSeedId,
  onSelectSeedId,
  legenda,
}: InfluenceGraphCanvasProps) {
  // Il seed effettivamente in evidenza: quello scelto, o il primo per
  // raggiungimento diretto se nessuno lo e' ancora. Un valore ricavato dai dati,
  // non un identificativo scritto a mano.
  const seedInEvidenza = selectedSeedId ?? topSeeds[0]?.id;
  /**
   * A movimento ridotto la cascata non parte da sola.
   *
   * E' l'animazione piu' insistente dell'applicazione: si avvia da sola, dura
   * quanto la pagina resta aperta e riparte da capo in continuazione. Chi ha
   * chiesto meno movimento riceve invece il fotogramma che conta - la cascata
   * arrivata alla fine, con tutti i nodi raggiunti - e lo scrubber per
   * ripercorrerla al proprio passo, o il comando di avvio se la vuole vedere
   * scorrere davvero.
   */
  const riduciMovimento = useMovimentoRidotto();

  // Timeline Simulation Controls
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(!riduciMovimento);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [layoutMode, setLayoutMode] = useState<"concentric" | "force">("concentric");

  /**
   * La preferenza fissa lo stato di partenza: cascata ferma sull'esito
   * completo.
   *
   * Sta in un effect suo, con la sola preferenza fra le dipendenze, perche'
   * altrimenti annullerebbe anche le azioni esplicite: mettendo la stessa
   * condizione dentro il ciclo di riproduzione, chi ha la preferenza attiva e
   * preme "Avvia la cascata" vedeva lo stato tornare indietro all'istante e il
   * comando restava inerte. La regola e' "non parte da sola", non "non parte":
   * se lo si chiede, l'animazione si guarda.
   */
  useEffect(() => {
    if (!riduciMovimento) return;
    setIsPlaying(false);
    // L'ultimo passo, non il primo: fermarsi a zero mostrerebbe i soli seed,
    // cioe' il fotogramma che dice meno di tutti.
    setCurrentStep(maxStep);
  }, [riduciMovimento, maxStep]);

  // Timer loop for step playback
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(300, 1500 / speedMultiplier);
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= maxStep) return 0;
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speedMultiplier, maxStep]);

  // Build ECharts Options based on currentStep and layoutMode
  const getEChartsOption = useMemo(() => {
    if (!rawNodes || rawNodes.length === 0) return {};

    // Le stesse quattro categorie della legenda DOM di `CanvasCascata`, con le
    // stesse parole: la legenda ECharts e' spenta, ma questi nomi restano i
    // nomi dei dati e finivano per divergere da quelli mostrati. "Attivato" e
    // non "infetto" o "contagiato": il capitolo evita il lessico epidemico
    // ovunque, e non c'e' ragione per cui il grafo faccia eccezione.
    const categories = [
      { name: "1. Seed bot di origine", itemStyle: { color: tokens.color.coral } },
      { name: "2. Attivato in questo passo", itemStyle: { color: tokens.color.activated } },
      { name: "3. Attivato in un passo precedente", itemStyle: { color: tokens.color.accentCyan } },
      { name: "4. Non ancora raggiunto", itemStyle: { color: tokens.color.darkSlateDarker } },
    ];

    // Group nodes for concentric radial layout
    const stepGroups: Record<string, InfluenceGraphNode[]> = {
      seed: [],
      step1: [],
      step2: [],
      step3: [],
      inactive: [],
    };

    rawNodes.forEach((node) => {
      const isSeed = node.is_seed || node.id === seedInEvidenza;
      if (isSeed) {
        stepGroups.seed.push(node);
      } else if (node.activation_step === 1) {
        stepGroups.step1.push(node);
      } else if (node.activation_step === 2) {
        stepGroups.step2.push(node);
      } else if (node.activation_step !== null && node.activation_step >= 3) {
        stepGroups.step3.push(node);
      } else {
        stepGroups.inactive.push(node);
      }
    });

    // Helper to calculate radial coordinates
    const getPos = (group: InfluenceGraphNode[], idx: number, r: number) => {
      const total = Math.max(1, group.length);
      const angle = (idx / total) * Math.PI * 2 + r * 0.003;
      const jitterR = ((idx * 17) % 30) - 15;
      const finalR = r + jitterR;
      return {
        x: Math.cos(angle) * finalR,
        y: Math.sin(angle) * finalR,
      };
    };

    // Prepare ECharts Node Objects
    const echartsNodes: EchartsNode[] = [];
    const nodePosMap = new Map<string, { x: number; y: number }>();

    rawNodes.forEach((node) => {
      const isSeed = node.is_seed || node.id === seedInEvidenza;
      const step = node.activation_step;
      const isActivated = step !== null && step <= currentStep;
      const isJustActivated = step === currentStep && currentStep > 0;

      let categoryIdx = 3; // Inactive
      let symbolSize = 10;
      let opacity = 0.35;

      if (isSeed) {
        categoryIdx = 0;
        symbolSize = 34;
        opacity = 1.0;
      } else if (isJustActivated) {
        categoryIdx = 1;
        symbolSize = 22;
        opacity = 1.0;
      } else if (isActivated) {
        categoryIdx = 2;
        symbolSize = 14;
        opacity = 0.9;
      }

      // Position logic
      let posX = 0;
      let posY = 0;

      if (isSeed) {
        posX = 0;
        posY = 0;
      } else if (step === 1) {
        const p = getPos(stepGroups.step1, stepGroups.step1.indexOf(node), 220);
        posX = p.x; posY = p.y;
      } else if (step === 2) {
        const p = getPos(stepGroups.step2, stepGroups.step2.indexOf(node), 380);
        posX = p.x; posY = p.y;
      } else if (step !== null && step >= 3) {
        const p = getPos(stepGroups.step3, stepGroups.step3.indexOf(node), 540);
        posX = p.x; posY = p.y;
      } else {
        const p = getPos(stepGroups.inactive, stepGroups.inactive.indexOf(node), 700);
        posX = p.x; posY = p.y;
      }

      nodePosMap.set(node.id, { x: posX, y: posY });

      echartsNodes.push({
        id: node.id,
        name: isSeed ? `@${node.acct}` : node.acct || `Node_${node.id}`,
        x: posX,
        y: posY,
        symbolSize,
        category: categoryIdx,
        itemStyle: {
          opacity,
          borderWidth: isSeed ? 3 : isJustActivated ? 2 : 1,
          borderColor:
            isSeed || isJustActivated ? tokens.color.canvas : tokens.overlay.bordoNodoSpento,
          // Il bagliore resta ai soli seed, che sono sessanta e non cambiano
          // fra un passo e l'altro. Ce l'avevano anche i nodi appena attivati,
          // che a ogni passo sono decine o centinaia: `shadowBlur` e'
          // l'operazione piu' costosa del canvas 2D, e ridisegnarla su tutti
          // loro tre volte al secondo era il grosso del costo della
          // riproduzione. Il passo corrente resta comunque distinguibile per
          // tinta, per dimensione (22px contro 14) e per bordo bianco: tre
          // canali, nessuno dei quali e' il bagliore.
          shadowBlur: isSeed ? 20 : 0,
          shadowColor: isSeed ? tokens.color.coral : "transparent",
        },
        label: {
          show: isSeed || isJustActivated,
          fontSize: isSeed ? 13 : 11,
          // Il corpo, non il display: questi sono valori di dato, e DESIGN.md
          // tiene Space Grotesk fuori dai dati. La catena di prima mescolava
          // anche due sans e un monospazio, quindi le etichette cambiavano
          // disegno a seconda di quale carattere fosse caricato.
          fontFamily: tokens.font.body,
          fontWeight: isSeed ? "bold" : "normal",
          color: isSeed ? tokens.color.coral : isJustActivated ? tokens.color.activated : tokens.color.canvas,
        },
        // Custom Payload Data for Tooltip
        rawNode: node,
      });
    });

    // Prepare ECharts Links Objects
    const echartsLinks: EchartsLink[] = [];

    rawLinks.forEach((link) => {
      const step = link.step;
      const isFired = step <= currentStep;
      const isCurrentWave = step === currentStep && currentStep > 0;

      let lineColor = tokens.overlay.arcoSpento;
      let lineWidth = 0.5;

      if (isCurrentWave) {
        lineColor = tokens.color.coral;
        lineWidth = 3;
      } else if (isFired) {
        lineColor = tokens.overlay.arcoAttivato;
        lineWidth = 1.2;
      }

      echartsLinks.push({
        source: link.source,
        target: link.target,
        lineStyle: {
          color: lineColor,
          width: lineWidth,
          curveness: 0.12,
        },
      });
    });

    return {
      // Il fondo della cascata e' `darkCanvas`, la piu' profonda delle quattro
      // superfici scure, dichiarata in DESIGN.md proprio per far risaltare i
      // nodi attivati. Prima era `nearBlack`, che e' il nero *di marchio* -
      // il colore dei bottoni e della voce di navigazione attiva - e usarlo
      // come superficie faceva sembrare questo riquadro di un altro progetto.
      // A movimento ridotto il grafico non anima: `animation` non era dichiarata
      // affatto, quindi restava il default di ECharts (attiva, 1000 ms) e chi
      // aveva chiesto meno movimento vedeva comunque i nodi animarsi a ogni
      // passo dello scrubber. La preferenza governava solo l'avvio automatico.
      animation: !riduciMovimento,
      backgroundColor: tokens.color.darkCanvas,
      tooltip: {
        trigger: "item",
        backgroundColor: tokens.color.nearBlack,
        borderColor: tokens.overlay.filettoSuScuroMarcato,
        textStyle: { color: tokens.color.canvas, fontFamily: tokens.font.body },
        formatter: (params: EchartsCallbackParams) => {
          if (params.dataType === "node") {
            const raw = params.data?.rawNode;
            if (!raw) return params.name;
            const isSeed = raw.is_seed || raw.id === seedInEvidenza;
            const step = raw.activation_step;
            const isAct = step !== null && step <= currentStep;
            // `acct` e `id` passano da escapeHtml: ECharts rende questa stringa
            // come markup, e i due campi arrivano dalle istanze Mastodon
            // remote. Sono l'unico dato non fidato dell'applicazione che
            // finisce in HTML.
            const nome = escapeHtml(raw.acct || raw.id);
            const identificativo = escapeHtml(raw.id);
            return `
              <div style="padding: 4px;">
                <strong style="font-size: 14px; color: ${isSeed ? tokens.color.coral : isAct ? tokens.color.accentCyan : tokens.color.textOnDark}">
                  @${nome}
                </strong><br/>
                <span style="font-size: 12px; color: ${tokens.color.textOnDark};">ID: ${identificativo}</span><br/>
                <span style="font-size: 12px; color: ${tokens.color.canvas};">Follower: ${formatNumber(raw.followers ?? 0)}</span><br/>
                <span style="font-size: 12px; font-weight: bold; color: ${isSeed ? tokens.color.coral : isAct ? tokens.color.activated : tokens.color.textMuted}">
                  Stato: ${isSeed ? "seed bot di origine" : isAct ? `attivato al passo ${step}` : "non ancora raggiunto"}
                </span>
              </div>
            `;
          }
          return "";
        },
      },
      // Nessuna legenda ECharts: `CanvasCascata` ne passa una in DOM, resa qui
      // sotto il grafo, con le stesse quattro categorie spiegate per esteso.
      // Tenerle entrambe metteva a schermo due vocabolari per gli stessi
      // stati - "NUOVO INFETTO" qui, "nodo appena attivato nello step
      // corrente" li' - e chi guarda doveva riconciliarli prima di poter
      // leggere il grafo. Sopravvive quella in DOM perche' e' l'unica che una
      // tecnologia assistiva puo' raggiungere.
      legend: { show: false },
      series: [
        {
          type: "graph",
          layout: layoutMode === "force" ? "force" : "none",
          data: echartsNodes,
          links: echartsLinks,
          categories: categories,
          roam: true, // Enable Pan & Zoom
          scaleLimit: { min: 0.4, max: 3 },
          label: {
            position: "right",
            formatter: "{b}",
          },
          lineStyle: {
            color: "source",
            curveness: 0.15,
          },
          force: {
            repulsion: 220,
            edgeLength: 100,
            gravity: 0.1,
            // A movimento ridotto il layout si calcola prima del primo disegno
            // invece di assestarsi a vista. Il risultato e' lo stesso grafo:
            // cambia che non lo si guarda mentre si sistema. Senza questo, "a
            // forze" restava una simulazione fisica che muoveva il disegno da
            // sola, cioe' l'unica animazione che la preferenza non fermava.
            layoutAnimation: !riduciMovimento,
          },
          emphasis: {
            focus: "adjacency",
            lineStyle: {
              width: 4,
            },
          },
        },
      ],
    };
  }, [rawNodes, rawLinks, currentStep, seedInEvidenza, layoutMode, riduciMovimento]);

  // Telemetry metrics
  const activeCount = rawNodes.filter(
    (n) => n.is_seed || n.id === seedInEvidenza || (n.activation_step !== null && n.activation_step <= currentStep)
  ).length;

  const newInThisStep = rawNodes.filter((n) => n.activation_step === currentStep && currentStep > 0).length;

  // Il denominatore e' `rawNodes`, cioe' il sottografo effettivamente
  // disegnato qui, non la rete completa: il nome lo dice per non farlo
  // raccontare come una quota di rete da chi lo legge dopo. La percentuale
  // sulla rete intera e' un'altra cifra, e vive nella banda del capitolo.
  const pctSottografoDisegnato = Math.round((activeCount / Math.max(1, rawNodes.length)) * 100);

  // Click handler on ECharts node
  const onChartClick = (params: EchartsCallbackParams) => {
    if (params.dataType === "node" && params.data?.rawNode && onSelectNode) {
      onSelectNode(params.data.rawNode);
    }
  };

  // Calculate max step reached by current seed cascade
  const maxSeedStep = useMemo(() => {
    const steps = (rawNodes || [])
      .map((n) => n.activation_step)
      .filter((s): s is number => s !== null && s !== undefined);
    return steps.length > 0 ? Math.max(...steps) : 1;
  }, [rawNodes]);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: tokens.radius.xl,
        overflow: "hidden",
        border: tokens.border.subtle,
        backgroundColor: tokens.color.darkCanvas,
        color: tokens.color.canvas,
        position: "relative",
      }}
    >
      {/* Top Console Bar */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${tokens.overlay.filettoSuScuro}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          backgroundColor: tokens.color.darkCanvas,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <PulseIcon sx={{ color: tokens.color.coral, fontSize: 24 }} />
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: tokens.font.display,
                fontSize: "16px",
                fontWeight: 600,
                color: tokens.color.canvas,
              }}
            >
              La cascata, passo per passo
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: tokens.color.textOnDark, fontFamily: tokens.font.mono, fontSize: "11px" }}
            >
              Passo {currentStep} di {maxStep} • la cascata di questo seed si ferma al passo {maxSeedStep}
            </Typography>
          </Box>

          {/* Seed Selector Dropdown */}
          {topSeeds.length > 0 && onSelectSeedId && (
            <Select
              value={seedInEvidenza ?? ""}
              onChange={(e) => onSelectSeedId(e.target.value)}
              size="small"
              // Sulla radice e non su InputProps, come per i campi di ricerca:
              // MUI passerebbe l'attributo al FormControl e il controllo
              // resterebbe senza nome. Senza, uno screen reader annuncia una
              // combobox anonima nel punto in cui si scegli cosa guardare.
              inputProps={{ "aria-label": "Seed di cui mostrare la cascata" }}
              sx={{
                ml: 2,
                color: tokens.color.coral,
                fontFamily: tokens.font.mono,
                fontWeight: 700,
                fontSize: "12px",
                backgroundColor: tokens.overlay.velaturaCoral,
                borderRadius: tokens.radius.pill,
                border: `1px solid ${tokens.overlay.bordoCoral}`,
                "& .MuiSelect-icon": { color: tokens.color.coral },
              }}
            >
              {topSeeds.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  @{s.acct} — {s.direct_reached} nodi attivati
                </MenuItem>
              ))}
            </Select>
          )}
        </Box>

        {/* Layout Mode Switcher (Concentric vs Force) */}
        <ToggleButtonGroup
          value={layoutMode}
          exclusive
          onChange={(_, val) => val && setLayoutMode(val)}
          size="small"
          sx={{
            backgroundColor: tokens.overlay.velaturaSuScuro,
            borderRadius: tokens.radius.sm,
            p: 0.5,
            "& .MuiToggleButton-root": {
              color: tokens.color.textOnDark,
              border: "none",
              borderRadius: tokens.radius.xs,
              px: 1.5,
              py: 0.4,
              fontSize: "11px",
              fontFamily: tokens.font.mono,
              fontWeight: 600,
              "&.Mui-selected": {
                backgroundColor: tokens.color.coral,
                color: tokens.color.nearBlack,
              },
            },
          }}
        >
          <ToggleButton value="concentric">
            <TreeIcon sx={{ mr: 0.8, fontSize: 14 }} /> Radiale
          </ToggleButton>
          <ToggleButton value="force">
            <GraphChartIcon sx={{ mr: 0.8, fontSize: 14 }} /> A forze
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Main ECharts View */}
      {/* L'altezza cede su schermo stretto: 560px fissi su un telefono da 844
          occupavano due terzi dell'altezza utile per un grafo che a quella
          larghezza si legge comunque peggio. */}
      <Box sx={{ position: "relative", width: "100%", height: { xs: 380, sm: 460, md: 560 } }}>
        {/* Il grafo ECharts e' un canvas: opaco alle tecnologie assistive
            esattamente come quello dei follow. Il ruolo e il nome stanno sul
            contenitore perche' la libreria non espone l'elemento interno. */}
        <Box
          role="img"
          aria-label={
            rawNodes.length === 0
              ? "Cascata di influenza, in attesa di dati."
              : `Cascata di influenza al passo ${currentStep} di ${maxStep}: ` +
                `${formatNumber(activeCount)} ${
                  activeCount === 1 ? "account raggiunto" : "account raggiunti"
                } su ${formatNumber(rawNodes.length)}, ` +
                `pari al ${pctSottografoDisegnato} per cento del sottografo disegnato qui, ` +
                `non della rete completa.`
          }
          sx={{ width: "100%", height: "100%" }}
        >
          <ReactECharts
            option={getEChartsOption}
            style={{ width: "100%", height: "100%" }}
            onEvents={{ click: onChartClick }}
            // Niente `notMerge`: fra un passo e l'altro la struttura della serie
            // non cambia - stessi nodi, stessi archi, stessi identificativi - e
            // cambiano solo tinte, dimensioni e opacita'. `notMerge` diceva a
            // ECharts di buttare via lo stato e ricostruire tutto da zero a
            // ogni tick del timer (fino a tre volte al secondo a 4.0x), e per
            // costruzione disabilitava anche le sue transizioni interne: era il
            // motivo per cui la cascata saltava fra i passi invece di scorrere.
            lazyUpdate={true}
          />
        </Box>

        {/* Il passo corrente detto a parole, ma solo a cascata ferma: in
            riproduzione il passo cambia ogni 300-1500 ms e l'annuncio sarebbe
            un torrente di frasi sovrapposte, peggio del silenzio. Quando il
            comando e' in mano a chi guarda - pausa, frecce, scrubber - ogni
            passo viene detto. */}
        <Box
          aria-live="polite"
          sx={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
          }}
        >
          {!isPlaying && rawNodes.length > 0
            ? `Passo ${currentStep} di ${maxStep}: ${formatNumber(activeCount)} ${
                activeCount === 1 ? "account raggiunto" : "account raggiunti"
              }, ${pctSottografoDisegnato} per cento del sottografo disegnato.`
            : ""}
        </Box>
      </Box>

      {/* La legenda, sul fondo che descrive.
          Stava sotto il pannello, sul canvas bianco della pagina, dove tre
          delle sue quattro tinte sono tinte da superficie scura: il ciano dava
          1,5:1, il verde 2,2:1, il coral 2,6:1, tutte sotto il 3:1 che WCAG
          chiede a un segno che porta informazione. Le etichette accanto
          salvavano il significato ma non il legame fra tinta e significato, che
          e' l'unico mestiere di una legenda. Qui le stesse quattro tinte sono
          quelle giuste (coral 7,4:1) perche' sono a casa loro. */}
      {legenda && (
        <Box
          sx={{
            px: 3,
            py: 2,
            backgroundColor: tokens.color.darkCanvas,
            borderTop: `1px solid ${tokens.overlay.filettoSuScuro}`,
          }}
        >
          {legenda}
        </Box>
      )}

      {/* Bottom Step Scrubber & Play Console */}
      <Box
        sx={{
          px: 3,
          py: 2,
          backgroundColor: tokens.color.darkCanvas,
          borderTop: `1px solid ${tokens.overlay.filettoSuScuro}`,
          display: "flex",
          alignItems: "center",
          gap: 3,
          flexWrap: "wrap",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            onClick={() => setIsPlaying(!isPlaying)}
            // Il nome cambia con lo stato invece di descrivere l'icona: chi
            // ascolta deve sapere cosa fa il comando adesso, non che disegno
            // porta.
            aria-label={isPlaying ? "Metti in pausa la cascata" : "Avvia la cascata"}
            sx={{
              backgroundColor: tokens.color.coral,
              color: tokens.color.nearBlack,
              "&:hover": { backgroundColor: tokens.color.coralDark },
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>

          <IconButton
            onClick={() => setCurrentStep(0)}
            aria-label="Torna al passo zero"
            sx={{ color: tokens.color.textOnDark, "&:hover": { color: tokens.color.canvas } }}
          >
            <RestartAlt />
          </IconButton>

          <IconButton
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            aria-label="Passo precedente"
            disabled={currentStep === 0}
            sx={{
              color: tokens.color.textOnDark,
              "&:hover": { color: tokens.color.canvas },
              "&.Mui-disabled": { color: tokens.overlay.disabilitatoSuScuro },
            }}
          >
            <SkipPrevious />
          </IconButton>

          <IconButton
            onClick={() => setCurrentStep((prev) => Math.min(maxStep, prev + 1))}
            aria-label="Passo successivo"
            disabled={currentStep >= maxStep}
            sx={{
              color: tokens.color.textOnDark,
              "&:hover": { color: tokens.color.canvas },
              "&.Mui-disabled": { color: tokens.overlay.disabilitatoSuScuro },
            }}
          >
            <SkipNext />
          </IconButton>
        </Stack>

        {/* Step Slider */}
        <Box sx={{ flexGrow: 1, minWidth: 200, px: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            {/* Qui viveva l'etichetta "SCRUBBER TEMPORALE DELLA CASCATA
                (Independent Cascade)", che ripeteva il titolo della sezione e
                non diceva niente sullo stato. Al suo posto sta l'unica
                informazione che l'overlay di telemetria rimosso portava
                davvero: quanti nodi si sono accesi in questo passo, e quando
                la cascata finisce. Le altre due cifre di quell'overlay erano
                gia' qui accanto e nella banda del capitolo. */}
            <Typography variant="caption" sx={{ color: tokens.color.textOnDark, fontFamily: tokens.font.mono }}>
              {currentStep > maxSeedStep
                ? `CASCATA COMPLETATA AL PASSO ${maxSeedStep}`
                : `+${newInThisStep} NODI ATTIVATI IN QUESTO PASSO`}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: tokens.color.accentCyan, fontFamily: tokens.font.mono, fontWeight: 700 }}
            >
              PASSO {currentStep} DI {maxStep}
            </Typography>
          </Stack>
          <Slider
            value={currentStep}
            min={0}
            max={maxStep}
            step={1}
            onChange={(_, val) => setCurrentStep(val as number)}
            aria-label="Passo della cascata"
            // Senza, uno screen reader legge "7" - un numero senza unita' ne'
            // scala. Con, legge "passo 7 di 11".
            getAriaValueText={(valore) => `Passo ${valore} di ${maxStep}`}
            sx={{
              color: tokens.color.accentCyan,
              "& .MuiSlider-thumb": {
                width: 20,
                height: 20,
                // Su un puntatore grosso - un dito - il pollice diventa 28px:
                // e' il comando piu' preciso della pagina, e a 16px stava sotto
                // il minimo di 24px richiesto a un bersaglio tattile.
                "@media (pointer: coarse)": { width: 28, height: 28 },
                backgroundColor: tokens.color.canvas,
                // Nessun bagliore: DESIGN.md ammette due sole eccezioni alla
                // regola del piatto per difetto, e il pollice di uno slider
                // non e' nessuna delle due.
                boxShadow: "none",
                "&:hover, &.Mui-focusVisible": { boxShadow: "none" },
              },
              "& .MuiSlider-track": {
                backgroundColor: tokens.color.accentCyan,
              },
              "& .MuiSlider-rail": {
                backgroundColor: tokens.overlay.filettoSuScuroMarcato,
              },
            }}
          />
        </Box>

        {/* Speed Selector */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <SpeedIcon sx={{ color: tokens.color.textOnDark, fontSize: 18 }} />
          <Select
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
            size="small"
            // L'icona accanto e' decorativa, quindi qui non c'era nemmeno un
            // contesto visivo da cui dedurre cosa scegliesse questo controllo.
            inputProps={{ "aria-label": "Velocita' di riproduzione della cascata" }}
            sx={{
              color: tokens.color.canvas,
              fontFamily: tokens.font.mono,
              fontSize: "12px",
              backgroundColor: tokens.overlay.velaturaSuScuro,
              borderRadius: tokens.radius.sm,
              "& .MuiSelect-icon": { color: tokens.color.canvas },
            }}
          >
            <MenuItem value={0.5}>0.5x</MenuItem>
            <MenuItem value={1}>1.0x (Normale)</MenuItem>
            <MenuItem value={2}>2.0x (Veloce)</MenuItem>
            <MenuItem value={4}>4.0x (Rapido)</MenuItem>
          </Select>
        </Stack>
      </Box>
    </Paper>
  );
}
