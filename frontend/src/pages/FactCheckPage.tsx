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

export function FactCheckPage() {
  const [verdicts, setVerdicts] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const fetcher = useCallback(() => api.factCheck(verdicts, page), [verdicts, page]);
  const { data, loading, error } = useApi(fetcher);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState>Nessun dato ancora disponibile.</EmptyState>;

  const pctDone = data.eligible > 0 ? ((100 * data.done) / data.eligible).toFixed(1) : null;
  const toggleVerdict = (v: string) => {
    setVerdicts((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
    setPage(1);
  };

  return (
    <Page title="Risultati Fact-Check">
      {pctDone != null && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {data.done} / {data.eligible} post processati ({pctDone}%)
        </Typography>
      )}

      {data.done > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Verdetti
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableBody>
                {Object.entries(data.verdicts).map(([verdict, count]) => (
                  <TableRow key={verdict}>
                    <TableCell>{verdict}</TableCell>
                    <TableCell align="right">{count}</TableCell>
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
                Verdetto {verdicts.length > 0 && `(${verdicts.length})`}
              </Typography>
              <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap" }}>
                {data.verdict_options.map((v) => (
                  <FormControlLabel
                    key={v}
                    control={
                      <Checkbox
                        size="small"
                        checked={verdicts.includes(v)}
                        onChange={() => toggleVerdict(v)}
                      />
                    }
                    label={v}
                    sx={{ mr: 0, minWidth: 120 }}
                  />
                ))}
              </Stack>
            </Box>
            <Button variant="contained" onClick={() => setPage(1)} disabled={verdicts.length === 0}>
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
                      <TableCell>verdetto</TableCell>
                      <TableCell>confidenza</TableCell>
                      <TableCell>motivazione</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.page_rows.map(({ post, row }) => (
                      <TableRow key={post.id} hover>
                        <TableCell>
                          <Link component={RouterLink} to={`/posts/${post.id}`}>
                            {post.id}
                          </Link>
                        </TableCell>
                        <TableCell>{row.verdict}</TableCell>
                        <TableCell>{row.confidence ?? "—"}</TableCell>
                        <TableCell>
                          {row.reasoning.length > 120
                            ? `${row.reasoning.slice(0, 120)}…`
                            : row.reasoning}
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