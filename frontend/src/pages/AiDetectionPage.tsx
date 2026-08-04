import { useCallback, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { api } from "../api/client";
import { useApi } from "../hooks/useApi";
import { EmptyState, ErrorState, LoadingState, Page } from "../components/States";
import { formatNumber } from "../components/StatCard";

export function AiDetectionPage() {
  const [buckets, setBuckets] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const fetcher = useCallback(() => api.aiDetection(buckets, page), [buckets, page]);
  const { data, loading, error } = useApi(fetcher);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState>Nessun dato ancora disponibile.</EmptyState>;

  const maxHist = Math.max(1, ...Object.values(data.histogram));
  const pctDone = data.eligible > 0 ? ((100 * data.done) / data.eligible).toFixed(1) : null;

  const toggleBucket = (b: string) => {
    setBuckets((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
    setPage(1);
  };

  return (
    <Page title="Risultati AI Detection">
      {pctDone != null && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {data.done} / {data.eligible} post processati ({pctDone}%)
        </Typography>
      )}
      {data.done > 0 && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>{formatNumber(data.ai_classified)}</strong> classificati come generati da IA
          (soglia probabilità &gt; {data.ai_threshold},{" "}
          {((100 * data.ai_classified) / data.done).toFixed(1)}% dei processati) — la probabilità
          grezza da sola (es. 0.2) non basta a dire "generato da IA", serve superare questa soglia.
        </Typography>
      )}

      {data.done > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Distribuzione probabilità
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableBody>
                {Object.entries(data.histogram).map(([bucket, count]) => (
                  <TableRow key={bucket}>
                    <TableCell sx={{ width: 160 }}>{bucket}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          height: 14,
                          width: `${Math.max(2, (count / maxHist) * 100)}%`,
                          bgcolor: "primary.main",
                          borderRadius: 1,
                          minWidth: 4,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 80 }} align="right">
                      {count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" sx={{ mb: 1 }}>
            Post analizzati
          </Typography>
          <Paper sx={{ p: 2, mb: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Probabilità {buckets.length > 0 && `(${buckets.length})`}
              </Typography>
              <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap" }}>
                {data.prob_buckets.map((b) => (
                  <FormControlLabel
                    key={b}
                    control={
                      <Checkbox
                        size="small"
                        checked={buckets.includes(b)}
                        onChange={() => toggleBucket(b)}
                      />
                    }
                    label={`${b}%`}
                    sx={{ mr: 0, minWidth: 70 }}
                  />
                ))}
              </Stack>
            </Box>
            <Button variant="contained" onClick={() => setPage(1)} disabled={buckets.length === 0}>
              Filtra
            </Button>
          </Paper>

          {data.page_rows.length > 0 ? (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>id</TableCell>
                      <TableCell>probabilità</TableCell>
                      <TableCell>testo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.page_rows.map(({ post, probability }) => (
                      <TableRow key={post.id} hover>
                        <TableCell>
                          <Link component={RouterLink} to={`/posts/${post.id}`}>
                            {post.id}
                          </Link>
                        </TableCell>
                        <TableCell>{probability.toFixed(3)}</TableCell>
                        <TableCell>
                          {post.content.length > 80 ? `${post.content.slice(0, 80)}…` : post.content}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  page={page}
                  count={page + (data.has_next ? 1 : 0)}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            </>
          ) : (
            <EmptyState>Nessun post in questa pagina.</EmptyState>
          )}
        </>
      )}

      {data.done === 0 && <EmptyState>Nessun dato ancora disponibile.</EmptyState>}
    </Page>
  );
}