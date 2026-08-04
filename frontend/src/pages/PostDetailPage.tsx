import { useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { api } from "../api/client";
import { useApi } from "../hooks/useApi";
import { EmptyState, ErrorState, LoadingState, Page } from "../components/States";

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const fetcher = useCallback(() => api.postDetail(postId), [postId]);
  const { data, loading, error } = useApi(fetcher);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  if (!data || !data.post) {
    return (
      <Page title="Post">
        <EmptyState>Post non trovato.</EmptyState>
      </Page>
    );
  }

  const { post, ai_score, fact_check } = data;

  return (
    <Page title={`Post #${post.id}`}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={1} direction="row" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body1" fontWeight={600}>
            {post.acct}@{post.domain}
          </Typography>
          {post.bot && <Chip label="bot dichiarato" color="warning" size="small" />}
          <Chip label={post.language ?? "n.d."} size="small" variant="outlined" />
        </Stack>
        <Typography paragraph sx={{ mb: 0 }}>
          {post.content}
        </Typography>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          AI detection
        </Typography>
        {ai_score ? (
          <Paper sx={{ p: 2 }}>
            <Typography>
              Probabilità IA: <strong>{ai_score.probability}</strong>
              {ai_score.model ? ` (modello ${ai_score.model})` : ""}
            </Typography>
          </Paper>
        ) : (
          <EmptyState>Nessun dato ancora disponibile.</EmptyState>
        )}
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Fact-check
        </Typography>
        {fact_check ? (
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography>
                <strong>Verdetto:</strong> {fact_check.verdict}
              </Typography>
              {fact_check.confidence != null && (
                <Chip label={`confidenza ${fact_check.confidence}`} size="small" variant="outlined" />
              )}
            </Stack>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {fact_check.reasoning || "Nessuna motivazione."}
            </Typography>
          </Paper>
        ) : (
          <EmptyState>Nessun dato ancora disponibile.</EmptyState>
        )}
      </Box>
    </Page>
  );
}