import { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter.tsx";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: ReactNode;
  progress?: number;
}

/**
 * Componente StatCard conforme alle linee guida visive di DESIGN.md.
 * Include animazioni Framer Motion per ingressi ed incremento numerico.
 */
export function StatCard({ label, value, sub, progress }: StatCardProps) {
  const numericVal = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ""));
  const isNumeric = !isNaN(numericVal) && (typeof value === "number" || !isNaN(Number(value)));

  return (
    <Paper
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      elevation={0}
      sx={{
        p: 3,
        borderRadius: "16px",
        backgroundColor: "#eeece7",
        border: "1px solid #d9d9dd",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        justify: "space-between",
      }}
    >
      <Box>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            color: "#75758a",
            letterSpacing: "0.28px",
            textTransform: "uppercase",
            display: "block",
            mb: 0.5,
          }}
        >
          {label}
        </Typography>

        <Typography
          variant="h4"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 600,
            fontSize: "28px",
            color: "#17171c",
            letterSpacing: "-0.32px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {isNumeric ? <AnimatedCounter value={numericVal} /> : value}
        </Typography>

        {sub != null && (
          <Typography
            variant="caption"
            sx={{
              color: "#75758a",
              mt: 0.5,
              display: "block",
              fontSize: "12px",
            }}
          >
            {sub}
          </Typography>
        )}
      </Box>

      {progress != null && (
        <Box sx={{ mt: 1.5, height: 6, bgcolor: "#d9d9dd", borderRadius: 3, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: "100%",
              backgroundColor: "#17171c",
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
