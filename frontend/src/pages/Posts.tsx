import { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Chip,
  Grid,
} from "@mui/material";
import { Link } from "react-router-dom";
import { api, PostsResponse } from "../api/client.ts";
import { SmartToy as BotIcon, ArrowBack as PrevIcon, ArrowForward as NextIcon } from "@mui/icons-material";

export default function Posts() {
  const [data, setData] = useState<PostsResponse | null>(null);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = (langs: string[], pg: number) => {
    setLoading(true);
    api.posts(langs, pg)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossibile caricare l'elenco dei post.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPosts(selectedLangs, page);
  }, [page]);

  const handleLangChange = (lang: string) => {
    const nextLangs = selectedLangs.includes(lang)
      ? selectedLangs.filter((l) => l !== lang)
      : [...selectedLangs, lang];
    setSelectedLangs(nextLangs);
    setPage(1);
    fetchPosts(nextLangs, 1);
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "";
    try {
      const d = new Date(timeStr);
      return d.toLocaleString("it-IT");
    } catch {
      return timeStr;
    }
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 6 }}>
        <Chip
          label="STATUS CORPUS"
          sx={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            color: "#75758a",
            backgroundColor: "#eeece7",
            mb: 2,
            px: 1,
          }}
        />
        <Typography
          variant="h2"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 400,
            fontSize: { xs: "32px", md: "48px" },
            color: "#17171c",
            mb: 1,
          }}
        >
          Fediverse Status Archive.
        </Typography>
        <Typography variant="body1" sx={{ color: "#75758a" }}>
          Inspect raw posts collected from discovered Mastodon instances with language filtering.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Left Side Filters */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
            <Typography variant="caption" sx={{ color: "#75758a", mb: 2, display: "block" }}>
              LANGUAGE TAXONOMY
            </Typography>
            {data && data.available_langs.length > 0 ? (
              <FormGroup>
                {data.available_langs.map((lang) => (
                  <FormControlLabel
                    key={lang}
                    control={
                      <Checkbox
                        checked={selectedLangs.includes(lang)}
                        onChange={() => handleLangChange(lang)}
                        sx={{
                          color: "#93939f",
                          "&.Mui-checked": {
                            color: "#ff7759", // Coral Checkbox
                          },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ textTransform: "uppercase", fontFamily: "ui-monospace, monospace", fontSize: "12px", color: "#212121" }}>
                        {lang}
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>
            ) : (
              <Typography variant="body2" sx={{ color: "#75758a" }}>
                No languages available.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Post list */}
        <Grid item xs={12} md={9}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : error || !data || data.posts.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: "16px", border: "1px solid #e5e7eb" }}>
              <Typography variant="body1" sx={{ color: "#75758a" }}>No posts matched the selected filters.</Typography>
            </Paper>
          ) : (
            <Box>
              <Paper sx={{ borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden", mb: 4, backgroundColor: "#ffffff" }}>
                <List sx={{ p: 0 }}>
                  {data.posts.map((post, idx) => (
                    <div key={post.id}>
                      <ListItem
                        sx={{
                          p: 3,
                          alignItems: "flex-start",
                          transition: "background-color 0.15s ease",
                          "&:hover": {
                            backgroundColor: "#f1f5ff", // Pale Blue Wash
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#17171c" }}>
                                  {post.acct}
                                </Typography>
                                <Chip
                                  label={post.domain}
                                  size="small"
                                  sx={{
                                    borderRadius: "12px",
                                    fontSize: "11px",
                                    backgroundColor: "#eeece7",
                                    color: "#212121",
                                  }}
                                />
                                {post.language && (
                                  <Chip
                                    label={post.language.toUpperCase()}
                                    size="small"
                                    sx={{
                                      borderRadius: "12px",
                                      fontSize: "11px",
                                      backgroundColor: "#ff7759", // Coral Chip
                                      color: "#ffffff",
                                      fontFamily: "ui-monospace, monospace",
                                    }}
                                  />
                                )}
                                {post.bot && (
                                  <Chip
                                    icon={<BotIcon style={{ fontSize: 14, color: "#ffffff" }} />}
                                    label="BOT"
                                    size="small"
                                    sx={{
                                      borderRadius: "12px",
                                      fontSize: "11px",
                                      backgroundColor: "#17171c",
                                      color: "#ffffff",
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography variant="caption" sx={{ color: "#93939f" }}>
                                {formatTime(post.created_at)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  whiteSpace: "pre-wrap",
                                  mb: 2,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  color: "#212121",
                                }}
                              >
                                {post.content}
                              </Typography>
                              <Link
                                to={`/posts/${post.id}`}
                                style={{
                                  color: "#1863dc",
                                  textDecoration: "underline",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                }}
                              >
                                View Detailed Inspection &rarr;
                              </Link>
                            </Box>
                          }
                        />
                      </ListItem>
                      {idx < data.posts.length - 1 && <Divider sx={{ borderColor: "#e5e7eb" }} />}
                    </div>
                  ))}
                </List>
              </Paper>

              {/* Pagination */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button
                  variant="outlined"
                  startIcon={<PrevIcon />}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  sx={{ borderRadius: "32px" }}
                >
                  Previous
                </Button>
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  Page {page}
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<NextIcon />}
                  disabled={!data.has_next}
                  onClick={() => setPage(page + 1)}
                  sx={{ borderRadius: "32px" }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
