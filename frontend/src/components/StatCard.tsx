import { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";

interface StatCardProps {
  label: string;
  value: string;
  sub?: ReactNode;
  progress?: number;
}

export function StatCard({ label, value, sub, progress }: StatCardProps) {
  return (
    <Paper sx={{ p: 2, minHeight: 110 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
      {sub != null && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          {sub}
        </Typography>
      )}
      {progress != null && (
        <Box sx={{ mt: 1, height: 6, bgcolor: "divider", borderRadius: 3, overflow: "hidden" }}>
          <Box
            sx={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: "100%",
              bgcolor: "primary.main",
              borderRadius: 3,
            }}
          />
        </Box>
      )}
    </Paper>
  );
}

export function formatNumber(n: number): string {
  return n.toLocaleString("it-IT");
}
