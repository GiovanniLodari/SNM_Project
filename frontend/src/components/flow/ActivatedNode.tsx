import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Box, Typography, Chip } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";

export interface ActivatedNodeData {
  label: string;
  followers: number;
  is_ia: boolean;
  activation_step?: number;
  [key: string]: unknown;
}

/**
 * Nodo React Flow custom per gli Account Umani Attivati nel modello IC.
 * Superficie Soft Stone (#eeece7), raggio 14px, etichetta dello step di contagio.
 */
export const ActivatedNode = memo(({ data }: NodeProps) => {
  const nodeData = data as ActivatedNodeData;
  const followersFormatted = nodeData.followers ? nodeData.followers.toLocaleString("it-IT") : "0";
  const step = nodeData.activation_step ?? 1;

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: "14px",
        backgroundColor: "#eeece7",
        border: "1px solid #d9d9dd",
        color: "#17171c",
        minWidth: 150,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#1863dc", width: 6, height: 6 }} />

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <PersonIcon sx={{ fontSize: 14, color: "#1863dc" }} />
          <Typography
            variant="caption"
            sx={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "10px",
              fontWeight: 600,
              color: "#75758a",
            }}
          >
            TARGET
          </Typography>
        </Box>
        <Chip
          label={`STEP ${step}`}
          size="small"
          sx={{
            height: 16,
            fontSize: "8px",
            fontFamily: "ui-monospace, monospace",
            fontWeight: 700,
            backgroundColor: "#f1f5ff",
            color: "#1863dc",
          }}
        />
      </Box>

      <Typography
        variant="subtitle2"
        sx={{
          fontFamily: "Space Grotesk, sans-serif",
          fontWeight: 600,
          color: "#17171c",
          fontSize: "12px",
          wordBreak: "break-all",
        }}
      >
        {nodeData.label || "Target_User"}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          fontFamily: "ui-monospace, monospace",
          color: "#75758a",
          fontSize: "10px",
          display: "block",
        }}
      >
        {followersFormatted} followers
      </Typography>

      <Handle type="source" position={Position.Bottom} style={{ background: "#1863dc", width: 6, height: 6 }} />
    </Box>
  );
});
