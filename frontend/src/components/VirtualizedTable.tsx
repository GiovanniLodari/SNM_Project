import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: number | string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  rowHeight?: number;
  maxHeight?: number | string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

/**
 * Componente VirtualizedTable per la virtualizzazione delle tabelle big-data
 * (TanStack Virtual + MUI), conforme al design system di DESIGN.md.
 * Renderizza unicamente le righe visibili nella finestra di scroll a 60 FPS.
 */
export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 54,
  maxHeight = 480,
  emptyMessage = "Nessun dato disponibile.",
  onRowClick,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  if (data.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: "center",
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          backgroundColor: "#ffffff",
        }}
      >
        <Typography variant="body2" sx={{ color: "#75758a" }}>
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer
      ref={parentRef}
      sx={{
        maxHeight,
        overflow: "auto",
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: "#fafafa" }}>
            {columns.map((col) => (
              <TableCell
                key={col.id}
                align={col.align || "left"}
                sx={{
                  fontWeight: 700,
                  fontSize: "12px",
                  fontFamily: "Inter, sans-serif",
                  color: "#17171c",
                  backgroundColor: "#fafafa",
                  width: col.width,
                  borderBottom: "2px solid #e5e7eb",
                }}
              >
                {col.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody
          sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = data[virtualRow.index];
            return (
              <TableRow
                key={virtualRow.key}
                onClick={() => onRowClick && onRowClick(row)}
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "table",
                  tableLayout: "fixed",
                  borderBottom: "1px solid #e5e7eb",
                  cursor: onRowClick ? "pointer" : "default",
                  "&:hover": {
                    backgroundColor: "#f9fafb",
                  },
                }}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align || "left"}
                    sx={{ borderBottom: "none", py: 1.5, px: 2 }}
                  >
                    {col.accessor ? col.accessor(row) : (row as any)[col.id]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
