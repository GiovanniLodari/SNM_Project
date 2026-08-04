import { useCallback, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Chip,
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
import { api, Post } from "../api/client";
import { useApi } from "../hooks/useApi";
import { EmptyState, ErrorState, LoadingState, Page } from "../components/States";

export function PostsPage() {
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const fetcher = useCallback(() => api.posts(selectedLangs, page), [selectedLangs, page]);
  const { data, loading, error } = useApi(fetcher);

  const toggleLang = (lang: string) => {
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
    setPage(1);
  };

  const contentPreview = useMemo(
    () => (p: Post) => (p.content.length > 80 ? `${p.content.slice(0, 80)}…` : p.content),
    []
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState>Nessun post ancora disponibile.</EmptyState>;

  return (
    <Page title="Post">
      <Paper sx={{ p: 2, mb: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Lingua {selectedLangs.length > 0 && `(${selectedLangs.length})`}
          </Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap" }}>
            {data.available_langs.map((l) => (
              <FormControlLabel
                key={l}
                control={
                  <Checkbox
                    size="small"
                    checked={selectedLangs.includes(l)}
                    onChange={() => toggleLang(l)}
                  />
                }
                label={l}
                sx={{ mr: 0, minWidth: 60 }}
              />
            ))}
          </Stack>
        </Box>
        <Button
          variant="contained"
          onClick={() => setPage(1)}
          disabled={selectedLangs.length === 0}
        >
          Filtra
        </Button>
        {selectedLangs.length > 0 && (
          <Chip
            label={`${selectedLangs.length} selezionati`}
            onDelete={() => {
              setSelectedLangs([]);
              setPage(1);
            }}
            size="small"
          />
        )}
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>id</TableCell>
              <TableCell>lingua</TableCell>
              <TableCell>testo</TableCell>
              <TableCell>account</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.posts.map((post) => (
              <TableRow key={post.id} hover>
                <TableCell>
                  <Link component={RouterLink} to={`/posts/${post.id}`}>
                    {post.id}
                  </Link>
                </TableCell>
                <TableCell>{post.language ?? "—"}</TableCell>
                <TableCell>{contentPreview(post) || "—"}</TableCell>
                <TableCell>{`${post.acct}@${post.domain}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {data.posts.length === 0 && (
        <Box sx={{ mt: 2 }}>
          <EmptyState>Nessun post ancora disponibile per questo filtro.</EmptyState>
        </Box>
      )}

      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Pagination
          page={page}
          count={page + (data.has_next ? 1 : 0)}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>
    </Page>
  );
}