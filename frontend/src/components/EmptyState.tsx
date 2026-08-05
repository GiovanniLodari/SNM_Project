import { Box, Typography, Button, Paper } from "@mui/material";
import { SearchOff as EmptyIcon } from "@mui/icons-material";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title = "Nessun dato trovato",
  description = "Non ci sono elementi corrispondenti ai filtri o alla ricerca effettuata.",
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        textAlign: "center",
        borderRadius: "20px",
        backgroundColor: "#ffffff",
        border: "1px border-solid #e5e7eb",
        my: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: "#eeece7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2,
          color: "#75758a",
        }}
      >
        <EmptyIcon sx={{ fontSize: 28 }} />
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontFamily: "Space Grotesk, Inter, sans-serif",
          fontWeight: 600,
          color: "#17171c",
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: "#75758a",
          maxWidth: 400,
          mb: actionLabel && onAction ? 3 : 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          disableElevation
          sx={{
            borderRadius: "32px",
            backgroundColor: "#17171c",
            color: "#ffffff",
            textTransform: "none",
            fontWeight: 500,
            fontSize: "14px",
            px: 3,
            py: 1,
            "&:hover": {
              backgroundColor: "#212121",
            },
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
}
