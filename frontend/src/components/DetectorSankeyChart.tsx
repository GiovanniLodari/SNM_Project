import { ResponsiveSankey } from "@nivo/sankey";
import { Box, Paper, Typography } from "@mui/material";
import { tokens } from "../theme.ts";

export interface SankeyData {
  nodes: { id: string; nodeColor?: string }[];
  links: { source: string; target: string; value: number }[];
}

interface DetectorSankeyChartProps {
  data?: SankeyData;
}

const defaultSankeyData: SankeyData = {
  nodes: [
    { id: "FastDetectGPT", nodeColor: tokens.color.nearBlack },
    { id: "Binoculars", nodeColor: tokens.color.coral },
    { id: "Desklib AI", nodeColor: tokens.color.deepGreen },
    { id: "AdaDetectGPT", nodeColor: tokens.color.actionBlue },
    { id: "Unanime IA (4/4)", nodeColor: tokens.color.purple },
    { id: "Maggioranza IA (3/4)", nodeColor: tokens.color.deepGreen },
    { id: "Misto IA (2/4)", nodeColor: tokens.color.coral },
    { id: "Single Detector (1/4)", nodeColor: tokens.color.actionBlue },
    { id: "Unanime Umano (0/4)", nodeColor: tokens.color.textMuted },
  ],
  links: [
    { source: "FastDetectGPT", target: "Unanime IA (4/4)", value: 1011 },
    { source: "FastDetectGPT", target: "Maggioranza IA (3/4)", value: 3120 },
    { source: "FastDetectGPT", target: "Misto IA (2/4)", value: 12400 },
    { source: "FastDetectGPT", target: "Single Detector (1/4)", value: 35000 },
    { source: "Binoculars", target: "Unanime IA (4/4)", value: 1011 },
    { source: "Binoculars", target: "Maggioranza IA (3/4)", value: 2890 },
    { source: "Binoculars", target: "Misto IA (2/4)", value: 11200 },
    { source: "Binoculars", target: "Single Detector (1/4)", value: 28000 },
    { source: "Desklib AI", target: "Unanime IA (4/4)", value: 1011 },
    { source: "Desklib AI", target: "Maggioranza IA (3/4)", value: 2400 },
    { source: "Desklib AI", target: "Single Detector (1/4)", value: 14000 },
    { source: "AdaDetectGPT", target: "Unanime IA (4/4)", value: 1011 },
    { source: "AdaDetectGPT", target: "Maggioranza IA (3/4)", value: 2100 },
    { source: "AdaDetectGPT", target: "Misto IA (2/4)", value: 8900 },
    { source: "FastDetectGPT", target: "Unanime Umano (0/4)", value: 86692 },
  ],
};

/**
 * Componente Nivo Sankey per la visualizzazione dei flussi di consenso tra i 4 detector IA.
 * Conforme alle linee guida visive ed architetturali di DESIGN.md.
 */
export function DetectorSankeyChart({ data = defaultSankeyData }: DetectorSankeyChartProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3.5,
        borderRadius: tokens.radius.xl,
        border: tokens.border.subtle,
        backgroundColor: tokens.color.canvas,
        height: 480,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 600,
            fontSize: "20px",
            color: tokens.color.nearBlack,
            letterSpacing: "-0.32px",
          }}
        >
          Flusso di Consenso Multi-Modello (Sankey Flow Diagram)
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.color.textMuted, mt: 0.5 }}>
          Visualizzazione Nivo dei volumi di accordo e divergenza tra i modelli di detection sui post analizzati.
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, width: "100%", height: "100%" }}>
        <ResponsiveSankey
          data={data}
          margin={{ top: 20, right: 140, bottom: 20, left: 140 }}
          align="justify"
          colors={(node: any) => node.nodeColor || tokens.color.nearBlack}
          nodeOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeThickness={18}
          nodeSpacing={22}
          nodeBorderWidth={0}
          linkOpacity={0.4}
          linkHoverOthersOpacity={0.15}
          linkContract={1}
          enableLinkGradient={true}
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={16}
          labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
          theme={{
            labels: {
              text: {
                fontFamily: tokens.font.display,
                fontSize: 12,
                fontWeight: 600,
              },
            },
          }}
        />
      </Box>
    </Paper>
  );
}
