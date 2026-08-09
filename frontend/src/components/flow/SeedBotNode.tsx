import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Box, Typography, Chip } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";

export interface SeedBotNodeData {
  label: string;
  followers: number;
  is_ia: boolean;
  activation_step?: number;
  [key: string]: unknown;
}

/**
 * Nodo React Flow custom per gli Account Bot Seed IA.
 * Design conforme a DESIGN.md: Agent Console card style (#17171c, badge coral).
 */
export const SeedBotNode = memo(({ data }: NodeProps) => {
  const nodeData = data as SeedBotNodeData;
  const followersFormatted = nodeData.followers ? nodeData.followers.toLocaleString("it-IT") : "0";

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: "16px",
        backgroundColor: "#17171c",
        border: "2px solid #ff7759",
        color: "#ffffff",
        minWidth: 180,
        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#ff7759", width: 8, height: 8 }} />

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
          <SmartToyIcon sx={{ fontSize: 16, color: "#ff7759" }} />
          <Typography
            variant="caption"
            sx={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              fontWeight: 700,
              color: "#ff7759",
            }}
          >
            SEED IA BOT
          </Typography>
        </Box>
        <Chip
          label="STEP 0"
          size="small"
          sx={{
            height: 18,
            fontSize: "9px",
            fontFamily: "ui-monospace, monospace",
            fontWeight: 700,
            backgroundColor: "rgba(255,119,89,0.2)",
            color: "#ff7759",
          }}
        />
      </Box>

      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: "Space Grotesk, sans-serif",
          fontWeight: 700,
          color: "#ffffff",
          fontSize: "13px",
          mb: 0.5,
          wordBreak: "break-all",
        }}
      >
        {nodeData.label || "Seed_Bot"}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          fontFamily: "ui-monospace, monospace",
          color: "#93939f",
          fontSize: "11px",
          display: "block",
        }}
      >
        {followersFormatted} followers
      </Typography>

      <Handle type="source" position={Position.Bottom} style={{ background: "#ff7759", width: 8, height: 8 }} />
    </Box>
  );
});
