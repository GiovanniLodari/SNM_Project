import { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Skeleton,
  Stack,
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
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = (langs: string[], pg: number, ps: number) => {
    setLoading(true);
    api.posts(langs, pg, ps)
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
    fetchPosts(selectedLangs, page, pageSize);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, selectedLangs, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLangToggle = (langCode: string) => {
    const next = selectedLangs.includes(langCode)
      ? selectedLangs.filter((l) => l !== langCode)
      : [...selectedLangs, langCode];
    setSelectedLangs(next);
    setPage(1);
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
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 2, borderRadius: "12px" }} />
        <Skeleton variant="rectangular" width="40%" height={40} sx={{ mb: 4, borderRadius: "12px" }} />
        <Stack spacing={2}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: "16px", backgroundColor: "#f9f8f6" }} />
          ))}
        </Stack>
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
          Fediverse Status Archive
        </Typography>
        <Typography variant="body1" sx={{ color: "#75758a" }}>
          Inspect raw posts collected from discovered Mastodon instances with language filtering.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Left Side Filters */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
            <Typography variant="caption" sx={{ color: "#75758a", mb: 2, fontWeight: 700, letterSpacing: "0.5px", display: "block" }}>
              FILTRA PER LINGUA
            </Typography>
            {data && data.available_langs.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {data.available_langs.map((langCode) => {
                  const isChecked = selectedLangs.includes(langCode);
                  return (
                    <Box
                      key={langCode}
                      onClick={() => handleLangToggle(langCode)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1,
                        borderRadius: "10px",
                        cursor: "pointer",
                        backgroundColor: isChecked ? "#fff0ec" : "transparent",
                        border: isChecked ? "1px solid #ffad9b" : "1px solid transparent",
                        transition: "all 0.15s ease",
                        "&:hover": { backgroundColor: "#f9f8f6" },
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container onClick
                        style={{ cursor: "pointer", accentColor: "#ff7759" }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "ui-monospace, monospace",
                          fontWeight: isChecked ? 700 : 500,
                          fontSize: "13px",
                          color: isChecked ? "#ff7759" : "#17171c",
                        }}
                      >
                        {langCode.toUpperCase()}
                      </Typography>
                    </Box>
                  );
                })}

                {selectedLangs.length > 0 && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setSelectedLangs([]);
                      setPage(1);
                    }}
                    sx={{ color: "#ff7759", textTransform: "none", fontSize: "12px", alignSelf: "flex-start", mt: 1 }}
                  >
                    Reset filtri ({selectedLangs.length})
                  </Button>
                )}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: "#75758a" }}>
                Nessuna lingua disponibile.
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
                            <Box>
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

                              {/* 4 AI Detectors Scores Row */}
                              <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
                                <Chip
                                  size="small"
                                  label={`FastDetectGPT: ${post.fastdetect_prob != null ? (post.fastdetect_prob * 100).toFixed(1) + "%" : "N/D"}`}
                                  sx={{
                                    fontFamily: "ui-monospace, monospace",
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    backgroundColor: post.fastdetect_prob != null && post.fastdetect_prob >= 0.5 ? "#fff0ec" : "#f1f5ff",
                                    color: post.fastdetect_prob != null && post.fastdetect_prob >= 0.5 ? "#ff7759" : "#1863dc",
                                    border: "1px solid",
                                    borderColor: post.fastdetect_prob != null && post.fastdetect_prob >= 0.5 ? "#ffad9b" : "#c6d7ff",
                                  }}
                                />
                                <Chip
                                  size="small"
                                  label={`Binoculars: ${post.binoculars_prob != null ? (post.binoculars_prob * 100).toFixed(1) + "%" : "N/D"}`}
                                  sx={{
                                    fontFamily: "ui-monospace, monospace",
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    backgroundColor: post.binoculars_prob != null && post.binoculars_prob >= 0.5 ? "#edfce9" : "#f1f5ff",
                                    color: post.binoculars_prob != null && post.binoculars_prob >= 0.5 ? "#003c33" : "#1863dc",
                                    border: "1px solid",
                                    borderColor: post.binoculars_prob != null && post.binoculars_prob >= 0.5 ? "#a8eb99" : "#c6d7ff",
                                  }}
                                />
                                <Chip
                                  size="small"
                                  label={`Desklib: ${post.desklib_prob != null ? (post.desklib_prob * 100).toFixed(1) + "%" : "N/D"}`}
                                  sx={{
                                    fontFamily: "ui-monospace, monospace",
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    backgroundColor: post.desklib_prob != null && post.desklib_prob >= 0.5 ? "#fff0ec" : "#f1f5ff",
                                    color: post.desklib_prob != null && post.desklib_prob >= 0.5 ? "#ff7759" : "#1863dc",
                                    border: "1px solid",
                                    borderColor: post.desklib_prob != null && post.desklib_prob >= 0.5 ? "#ffad9b" : "#c6d7ff",
                                  }}
                                />
                                <Chip
                                  size="small"
                                  label={`AdaDetect: ${post.ada_prob != null ? (post.ada_prob * 100).toFixed(1) + "%" : "N/D"}`}
                                  sx={{
                                    fontFamily: "ui-monospace, monospace",
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    backgroundColor: post.ada_prob != null && post.ada_prob >= 0.5 ? "#f5f3ff" : "#f1f5ff",
                                    color: post.ada_prob != null && post.ada_prob >= 0.5 ? "#7c3aed" : "#1863dc",
                                    border: "1px solid",
                                    borderColor: post.ada_prob != null && post.ada_prob >= 0.5 ? "#ddd6fe" : "#c6d7ff",
                                  }}
                                />
                              </Box>
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

              {/* Pagination & Page Size Control */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<PrevIcon />}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  sx={{ borderRadius: "32px", textTransform: "none", fontSize: "13px" }}
                >
                  Indietro
                </Button>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="caption" sx={{ color: "#75758a", fontWeight: 500 }}>
                    Pagina {page}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" sx={{ color: "#75758a" }}>
                      Post per pagina:
                    </Typography>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "12px",
                        fontFamily: "Inter, sans-serif",
                        cursor: "pointer",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  endIcon={<NextIcon />}
                  disabled={!data.has_next}
                  onClick={() => setPage(page + 1)}
                  sx={{ borderRadius: "32px", textTransform: "none", fontSize: "13px" }}
                >
                  Avanti
                </Button>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
