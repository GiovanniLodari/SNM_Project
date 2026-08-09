import { useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, Paper, Typography } from "@mui/material";
import { SeedBotNode } from "./SeedBotNode.tsx";
import { ActivatedNode } from "./ActivatedNode.tsx";
import { InfluenceGraphNode, InfluenceGraphLink } from "../../api/client.ts";

const nodeTypes = {
  seedBot: SeedBotNode,
  activatedUser: ActivatedNode,
};

interface InfluenceReactFlowProps {
  nodesData: InfluenceGraphNode[];
  linksData: InfluenceGraphLink[];
  onNodeClick?: (nodeId: string) => void;
}

/**
 * Componente React Flow per la visualizzazione interattiva dei nodi
 * e dei flussi di propagazione Independent Cascade (Sprint 4).
 */
export function InfluenceReactFlow({ nodesData, linksData, onNodeClick }: InfluenceReactFlowProps) {
  // Trasformazione nodi per React Flow
  const nodes: Node[] = useMemo(() => {
    const total = nodesData.length;
    const cols = Math.ceil(Math.sqrt(total));

    return nodesData.map((n, i) => {
      const isSeed = n.is_seed || n.activation_step === 0;
      const col = i % cols;
      const row = Math.floor(i / cols);

      // Posizionamento a griglia distanziata
      const x = isSeed ? col * 260 + 100 : col * 220;
      const y = isSeed ? 50 : (n.activation_step || 1) * 160 + row * 80;

      return {
        id: String(n.id),
        type: isSeed ? "seedBot" : "activatedUser",
        position: { x, y },
        data: {
          label: n.acct || `Node_${n.id}`,
          followers: n.followers || 0,
          is_ia: Boolean(n.is_ia),
          activation_step: n.activation_step,
        },
      };
    });
  }, [nodesData]);

  // Trasformazione archi per React Flow con stile ed animazione
  const edges: Edge[] = useMemo(() => {
    return linksData.map((l, i) => ({
      id: `e-${l.source}-${l.target}-${i}`,
      source: String(l.source),
      target: String(l.target),
      animated: true,
      style: {
        stroke: l.step === 1 ? "#ff7759" : "#1863dc",
        strokeWidth: 2,
      },
    }));
  }, [linksData]);

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        height: 520,
        borderRadius: "22px",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 10 }}>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            color: "#75758a",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(6px)",
            px: 1.5,
            py: 0.5,
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
          }}
        >
          REACT FLOW • INTERACTIVE PROPAGATION CANVAS
        </Typography>
      </Box>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick && onNodeClick(node.id)}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls style={{ borderRadius: "12px", border: "1px solid #e5e7eb" }} />
        <MiniMap
          style={{ height: 100, borderRadius: "12px", border: "1px solid #e5e7eb" }}
          zoomable
          pannable
          nodeColor={(node) => (node.type === "seedBot" ? "#ff7759" : "#eeece7")}
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
      </ReactFlow>
    </Paper>
  );
}
