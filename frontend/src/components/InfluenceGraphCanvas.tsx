import { useState, useEffect, useMemo } from "react";
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
import ReactECharts from "echarts-for-react";
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
  maxStep?: number;
  onSelectNode?: (node: InfluenceGraphNode) => void;
  topSeeds?: InfluenceSeed[];
  selectedSeedId?: string;
  onSelectSeedId?: (seedId: string) => void;
}

export default function InfluenceGraphCanvas({
  nodes: rawNodes = [],
  links: rawLinks = [],
  maxStep = 11,
  onSelectNode,
  topSeeds = [],
  selectedSeedId = "66109",
  onSelectSeedId,
}: InfluenceGraphCanvasProps) {
  // Timeline Simulation Controls
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [layoutMode, setLayoutMode] = useState<"concentric" | "force">("concentric");

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

    const categories = [
      { name: "1. SEED BOT FOCUS", itemStyle: { color: tokens.color.coral } },
      { name: "2. NUOVO INFETTO", itemStyle: { color: tokens.color.activated } },
      { name: "3. ATTIVO CONTAGIATO", itemStyle: { color: tokens.color.accentCyan } },
      { name: "4. INATTIVO", itemStyle: { color: tokens.color.darkSlateDarker } },
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
      const isSeed = node.is_seed || node.id === selectedSeedId;
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
      const isSeed = node.is_seed || node.id === selectedSeedId;
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
          borderColor: isSeed ? tokens.color.canvas : isJustActivated ? tokens.color.canvas : "rgba(255,255,255,0.4)",
          shadowBlur: isSeed ? 20 : isJustActivated ? 15 : 0,
          shadowColor: isSeed ? tokens.color.coral : isJustActivated ? tokens.color.activated : "transparent",
        },
        label: {
          show: isSeed || isJustActivated,
          fontSize: isSeed ? 13 : 11,
          fontFamily: "Space Grotesk, Inter, monospace",
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

      let lineColor = "rgba(255, 255, 255, 0.04)";
      let lineWidth = 0.5;

      if (isCurrentWave) {
        lineColor = tokens.color.coral;
        lineWidth = 3;
      } else if (isFired) {
        lineColor = "rgba(0, 229, 255, 0.4)";
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
      backgroundColor: tokens.color.nearBlack,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(23, 23, 28, 0.94)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: { color: tokens.color.canvas, fontFamily: tokens.font.body },
        formatter: (params: EchartsCallbackParams) => {
          if (params.dataType === "node") {
            const raw = params.data?.rawNode;
            if (!raw) return params.name;
            const isSeed = raw.is_seed || raw.id === selectedSeedId;
            const step = raw.activation_step;
            const isAct = step !== null && step <= currentStep;
            return `
              <div style="padding: 4px;">
                <strong style="font-size: 14px; color: ${isSeed ? tokens.color.coral : isAct ? tokens.color.accentCyan : tokens.color.textFaint}">
                  @${raw.acct || raw.id}
                </strong><br/>
                <span style="font-size: 12px; color: ${tokens.color.textFaint};">ID: ${raw.id}</span><br/>
                <span style="font-size: 12px; color: ${tokens.color.canvas};">Followers: ${formatNumber(raw.followers ?? 0)}</span><br/>
                <span style="font-size: 12px; font-weight: bold; color: ${isSeed ? tokens.color.coral : isAct ? tokens.color.activated : tokens.color.textMuted}">
                  Stato: ${isSeed ? "SEED BOT ORIGINE" : isAct ? `CONTAGIATO a Step ${step}` : "INATTIVO"}
                </span>
              </div>
            `;
          }
          return "";
        },
      },
      legend: {
        data: categories.map((c) => c.name),
        textStyle: { color: tokens.color.textFaint, fontFamily: tokens.font.mono, fontSize: 11 },
        top: 16,
        right: 20,
      },
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
  }, [rawNodes, rawLinks, currentStep, selectedSeedId, layoutMode]);

  // Telemetry metrics
  const activeCount = rawNodes.filter(
    (n) => n.is_seed || n.id === selectedSeedId || (n.activation_step !== null && n.activation_step <= currentStep)
  ).length;

  const newInThisStep = rawNodes.filter((n) => n.activation_step === currentStep && currentStep > 0).length;
  const pctInfected = Math.round((activeCount / Math.max(1, rawNodes.length)) * 100);

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
        backgroundColor: tokens.color.nearBlack,
        color: tokens.color.canvas,
        position: "relative",
      }}
    >
      {/* Top Console Bar */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
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
              Grafo di Propagazione Apache ECharts
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: tokens.color.textFaint, fontFamily: tokens.font.mono, fontSize: "11px" }}
            >
              Simulazione WebGL/Canvas • Step {currentStep} / {maxStep} (Profondità max seed: Step {maxSeedStep})
            </Typography>
          </Box>

          {/* Seed Selector Dropdown */}
          {topSeeds.length > 0 && onSelectSeedId && (
            <Select
              value={selectedSeedId}
              onChange={(e) => onSelectSeedId(e.target.value)}
              size="small"
              sx={{
                ml: 2,
                color: tokens.color.coral,
                fontFamily: tokens.font.mono,
                fontWeight: 700,
                fontSize: "12px",
                backgroundColor: "rgba(255, 119, 89, 0.12)",
                borderRadius: "20px",
                border: "1px solid rgba(255, 119, 89, 0.4)",
                "& .MuiSelect-icon": { color: tokens.color.coral },
              }}
            >
              {topSeeds.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  Seed Bot: @{s.acct} ({s.direct_reached} nodi contagiati)
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
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: "10px",
            p: 0.5,
            "& .MuiToggleButton-root": {
              color: tokens.color.textFaint,
              border: "none",
              borderRadius: "6px",
              px: 1.5,
              py: 0.4,
              fontSize: "11px",
              fontFamily: tokens.font.mono,
              fontWeight: 600,
              "&.Mui-selected": {
                backgroundColor: tokens.color.coral,
                color: tokens.color.canvas,
              },
            },
          }}
        >
          <ToggleButton value="concentric">
            <TreeIcon sx={{ mr: 0.8, fontSize: 14 }} /> Radiale Onde
          </ToggleButton>
          <ToggleButton value="force">
            <GraphChartIcon sx={{ mr: 0.8, fontSize: 14 }} /> Forza Fisica
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Main ECharts View */}
      <Box sx={{ position: "relative", width: "100%", height: 560 }}>
        <ReactECharts
          option={getEChartsOption}
          style={{ width: "100%", height: "100%" }}
          onEvents={{ click: onChartClick }}
          notMerge={true}
          lazyUpdate={true}
        />

        {/* Live Contagion Telemetry Overlay Card */}
        <Paper
          elevation={0}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            p: 2,
            borderRadius: tokens.radius.lg,
            backgroundColor: "rgba(13, 13, 16, 0.85)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: tokens.color.canvas,
            minWidth: 240,
            pointerEvents: "none",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: tokens.color.coral,
              fontFamily: tokens.font.mono,
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            TELEMETRIA APACHE ECHARTS
          </Typography>

          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.color.canvas }}>
              Passo Attuale:{" "}
              <span style={{ color: tokens.color.accentCyan, fontFamily: "monospace" }}>
                STEP {currentStep} / {maxStep}
              </span>
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: currentStep > maxSeedStep ? tokens.color.coral : newInThisStep > 0 ? tokens.color.activated : tokens.color.textFaint,
                fontWeight: 600,
              }}
            >
              {currentStep > maxSeedStep
                ? `Cascata completata al Passo ${maxSeedStep}`
                : `Nodi Contagiati in questo step: +${newInThisStep}`}
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.color.textFaint }}>
              Popolazione Raggiunta:{" "}
              <strong>
                {activeCount} / {rawNodes.length} ({pctInfected}%)
              </strong>
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Bottom Step Scrubber & Play Console */}
      <Box
        sx={{
          px: 3,
          py: 2,
          backgroundColor: tokens.color.darkCanvas,
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          gap: 3,
          flexWrap: "wrap",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            onClick={() => setIsPlaying(!isPlaying)}
            sx={{
              backgroundColor: tokens.color.coral,
              color: tokens.color.canvas,
              "&:hover": { backgroundColor: tokens.color.coralDark },
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>

          <IconButton
            onClick={() => setCurrentStep(0)}
            sx={{ color: tokens.color.textFaint, "&:hover": { color: tokens.color.canvas } }}
          >
            <RestartAlt />
          </IconButton>

          <IconButton
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            sx={{ color: tokens.color.textFaint, "&:hover": { color: tokens.color.canvas } }}
          >
            <SkipPrevious />
          </IconButton>

          <IconButton
            onClick={() => setCurrentStep((prev) => Math.min(maxStep, prev + 1))}
            sx={{ color: tokens.color.textFaint, "&:hover": { color: tokens.color.canvas } }}
          >
            <SkipNext />
          </IconButton>
        </Stack>

        {/* Step Slider */}
        <Box sx={{ flexGrow: 1, minWidth: 200, px: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: tokens.color.textFaint, fontFamily: tokens.font.mono }}>
              SCRUBBER TEMPORALE DELLA CASCATA (Independent Cascade)
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
            sx={{
              color: tokens.color.accentCyan,
              "& .MuiSlider-thumb": {
                width: 16,
                height: 16,
                backgroundColor: tokens.color.canvas,
                boxShadow: "0 0 12px rgba(0, 229, 255, 0.9)",
              },
              "& .MuiSlider-track": {
                backgroundColor: tokens.color.accentCyan,
              },
              "& .MuiSlider-rail": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              },
            }}
          />
        </Box>

        {/* Speed Selector */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <SpeedIcon sx={{ color: tokens.color.textFaint, fontSize: 18 }} />
          <Select
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
            size="small"
            sx={{
              color: tokens.color.canvas,
              fontFamily: tokens.font.mono,
              fontSize: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
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
