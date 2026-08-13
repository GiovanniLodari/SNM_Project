import { useEffect } from "react";
import {
  Typography,
  Box,
  Button,
  LinearProgress,
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
import { usePostsQuery } from "../api/queries.ts";
import { SmartToy as BotIcon, ArrowBack as PrevIcon, ArrowForward as NextIcon } from "@mui/icons-material";
import { tokens } from "../theme.ts";
import { EmptyState } from "../components/States.tsx";
import { formatDateTime } from "../utils/format.ts";
import { useUrlList, useUrlNumber } from "../hooks/useUrlState.ts";

export default function Posts() {
  // Filtri nella URL: la vista diventa condivisibile e il tasto Indietro
  // ripercorre i filtri invece di uscire dalla pagina.
  const [selectedLangs, setSelectedLangs] = useUrlList("lang");
  const [page, setPage] = useUrlNumber("page", 1);
  const [pageSize, setPageSize] = useUrlNumber("size", 10);

  const {
    data,
    isLoading: loading,
    isError,
    isFetching,
    isPlaceholderData,
  } = usePostsQuery(selectedLangs, page, pageSize);
  const error = isError ? "Impossibile caricare l'elenco dei post." : null;

  // Vero mentre arriva una pagina nuova con quella vecchia ancora a schermo:
  // basta un filetto di avanzamento e un velo, non uno spinner che sostituisce
  // tutto (DESIGN.md non usa spinner: superfici piatte e filetti sottili).
  const staAggiornando = isFetching && isPlaceholderData;

  // Lo scroll in cima e' un effetto collaterale del cambio pagina, non del
  // caricamento dei dati: resta un effect, ma non fa piu' da fetch.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, selectedLangs, pageSize]);

  const handleLangToggle = (langCode: string) => {
    const next = selectedLangs.includes(langCode)
      ? selectedLangs.filter((l) => l !== langCode)
      : [...selectedLangs, langCode];
    setSelectedLangs(next);
    setPage(1);
  };

  const formatTime = formatDateTime;

  // Lo scheletro ricalca le due colonne della pagina vera: cosi' al primo
  // caricamento il contenuto si sostituisce senza far saltare il layout.
  if (loading && !data) {
    return (
      <Box>
        <Box sx={{ mb: 6 }}>
          <Skeleton variant="text" width={340} height={56} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={520} height={24} />
        </Box>
        <Grid container spacing={4}>
          <Grid item xs={12} md={3}>
            <Skeleton
              variant="rectangular"
              height={260}
              sx={{ borderRadius: tokens.radius.lg, backgroundColor: "#f9f8f6" }}
            />
          </Grid>
          <Grid item xs={12} md={9}>
            <Stack spacing={0} sx={{ borderRadius: tokens.radius.lg, overflow: "hidden", border: tokens.border.subtle }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Box key={i} sx={{ p: 3, borderBottom: i < 5 ? tokens.border.subtle : "none" }}>
                  <Skeleton variant="text" width="35%" height={22} sx={{ mb: 1.5 }} />
                  <Skeleton variant="text" width="60%" height={18} sx={{ mb: 1.5 }} />
                  <Skeleton variant="text" width="100%" height={18} />
                  <Skeleton variant="text" width="80%" height={18} />
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 6 }}>

        <Typography
          variant="h2"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 400,
            fontSize: { xs: "32px", md: "48px" },
            color: tokens.color.nearBlack,
            mb: 1,
          }}
        >
          Archivio dei post
        </Typography>
        <Typography variant="body1" sx={{ color: tokens.color.textMuted }}>
          I post raccolti dalle istanze Mastodon individuate, filtrabili per lingua.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Left Side Filters */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas }}>
            <Typography variant="caption" sx={{ color: tokens.color.textMuted, mb: 2, fontWeight: 700, letterSpacing: "0.5px", display: "block" }}>
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
                        backgroundColor: isChecked ? tokens.color.surfaceCoral : "transparent",
                        border: isChecked ? `1px solid ${tokens.color.coralLight}` : "1px solid transparent",
                        transition: "all 0.15s ease",
                        "&:hover": { backgroundColor: "#f9f8f6" },
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container onClick
                        style={{ cursor: "pointer", accentColor: tokens.color.coral }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: tokens.font.mono,
                          fontWeight: isChecked ? 700 : 500,
                          fontSize: "13px",
                          color: isChecked ? tokens.color.coral : tokens.color.nearBlack,
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
                    sx={{ color: tokens.color.coral, textTransform: "none", fontSize: "12px", alignSelf: "flex-start", mt: 1 }}
                  >
                    Reset filtri ({selectedLangs.length})
                  </Button>
                )}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
                Nessuna lingua disponibile.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Post list */}
        <Grid item xs={12} md={9}>
          {error || !data || data.posts.length === 0 ? (
            <EmptyState message="Nessun post corrisponde ai filtri selezionati." />
          ) : (
            <Box>
              <Paper sx={{ borderRadius: tokens.radius.lg, border: tokens.border.subtle, overflow: "hidden", mb: 4, backgroundColor: tokens.color.canvas }}>
                {/* Filetto di avanzamento: occupa lo spazio anche da fermo, cosi'
                    comparendo non fa scorrere l'elenco di due pixel. */}
                <Box sx={{ height: 2 }}>
                  {staAggiornando && (
                    <LinearProgress
                      sx={{
                        height: 2,
                        backgroundColor: "transparent",
                        "& .MuiLinearProgress-bar": { backgroundColor: tokens.color.nearBlack },
                      }}
                    />
                  )}
                </Box>
                <List
                  sx={{
                    p: 0,
                    opacity: staAggiornando ? 0.55 : 1,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  {data.posts.map((post, idx) => (
                    <div key={post.id}>
                      <ListItem
                        sx={{
                          p: 3,
                          alignItems: "flex-start",
                          transition: "background-color 0.15s ease",
                          "&:hover": {
                            backgroundColor: tokens.color.surfaceBlue, // Pale Blue Wash
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: tokens.color.nearBlack }}>
                                    {post.acct}
                                  </Typography>
                                  <Chip
                                    label={post.domain}
                                    size="small"
                                    sx={{
                                      borderRadius: tokens.radius.md,
                                      fontSize: "11px",
                                      backgroundColor: tokens.color.softStone,
                                      color: tokens.color.textPrimary,
                                    }}
                                  />
                                  {post.language && (
                                    <Chip
                                      label={post.language.toUpperCase()}
                                      size="small"
                                      sx={{
                                        borderRadius: tokens.radius.md,
                                        fontSize: "11px",
                                        backgroundColor: tokens.color.coral, // Coral Chip
                                        color: tokens.color.canvas,
                                        fontFamily: tokens.font.mono,
                                      }}
                                    />
                                  )}
                                  {post.bot && (
                                    <Chip
                                      icon={<BotIcon style={{ fontSize: 14, color: tokens.color.canvas }} />}
                                      label="BOT"
                                      size="small"
                                      sx={{
                                        borderRadius: tokens.radius.md,
                                        fontSize: "11px",
                                        backgroundColor: tokens.color.nearBlack,
                                        color: tokens.color.canvas,
                                      }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="caption" sx={{ color: tokens.color.textFaint }}>
                                  {formatTime(post.created_at)}
                                </Typography>
                              </Box>

                              {/* 4 AI Detectors Scores Row */}
                              <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
                                <Chip
                                  size="small"
                                  label={`FastDetectGPT: ${post.fastdetect_prob != null ? (post.fastdetect_prob * 100).toFixed(1) + "%" : "N/D"}`}
                                  sx={{
                                    fontFamily: tokens.font.mono,
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    backgroundColor: post.fastdetect_prob != null && post.fastdetect_prob >= 0.5 ? tokens.color.surfaceCoral : tokens.color.surfaceBlue,
                                    color: post.fastdetect_prob != null && post.fastdetect_prob >= 0.5 ? tokens.color.coral : tokens.color.actionBlue,
                                    border: "1px solid",
                                    borderColor: post.fastdetect_prob != null && post.fastdetect_prob >= 0.5 ? tokens.color.coralLight : tokens.color.chipBorderHuman,
                                  }}
                                />
                                <Chip
                                  size="small"
                                  label={`Binoculars: ${post.binoculars_prob != null ? (post.binoculars_prob * 100).toFixed(1) + "%" : "N/D"}`}
                                  sx={{
                                    fontFamily: tokens.font.mono,
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    backgroundColor: post.binoculars_prob != null && post.binoculars_prob >= 0.5 ? "#edfce9" : tokens.color.surfaceBlue,
                                    color: post.binoculars_prob != null && post.binoculars_prob >= 0.5 ? tokens.color.deepGreen : tokens.color.actionBlue,
                                    border: "1px solid",
                                    borderColor: post.binoculars_prob != null && post.binoculars_prob >= 0.5 ? tokens.color.chipBorderHumanGreen : tokens.color.chipBorderHuman,
                                  }}
                                />
                                <Chip
                                  size="small"
                                  label={`Desklib: ${post.desklib_prob != null ? (post.desklib_prob * 100).toFixed(1) + "%" : "N/D"}`}
                                  sx={{
                                    fontFamily: tokens.font.mono,
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    backgroundColor: post.desklib_prob != null && post.desklib_prob >= 0.5 ? tokens.color.surfaceCoral : tokens.color.surfaceBlue,
                                    color: post.desklib_prob != null && post.desklib_prob >= 0.5 ? tokens.color.coral : tokens.color.actionBlue,
                                    border: "1px solid",
                                    borderColor: post.desklib_prob != null && post.desklib_prob >= 0.5 ? tokens.color.coralLight : tokens.color.chipBorderHuman,
                                  }}
                                />
                                <Chip
                                  size="small"
                                  label={`AdaDetect: ${post.ada_prob != null ? (post.ada_prob * 100).toFixed(1) + "%" : "N/D"}`}
                                  sx={{
                                    fontFamily: tokens.font.mono,
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    backgroundColor: post.ada_prob != null && post.ada_prob >= 0.5 ? tokens.color.surfacePurple : tokens.color.surfaceBlue,
                                    color: post.ada_prob != null && post.ada_prob >= 0.5 ? tokens.color.purple : tokens.color.actionBlue,
                                    border: "1px solid",
                                    borderColor: post.ada_prob != null && post.ada_prob >= 0.5 ? tokens.color.borderPurple : tokens.color.chipBorderHuman,
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
                                  color: tokens.color.textPrimary,
                                }}
                              >
                                {post.content}
                              </Typography>
                              <Link
                                to={`/posts/${post.id}`}
                                style={{
                                  color: tokens.color.actionBlue,
                                  textDecoration: "underline",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                }}
                              >
                                Vedi il dettaglio &rarr;
                              </Link>
                            </Box>
                          }
                        />
                      </ListItem>
                      {idx < data.posts.length - 1 && <Divider sx={{ borderColor: tokens.color.border }} />}
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
                  sx={{ borderRadius: tokens.radius.pill, textTransform: "none", fontSize: "13px" }}
                >
                  Indietro
                </Button>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontWeight: 500 }}>
                    Pagina {page}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
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
                        borderRadius: tokens.radius.sm,
                        border: "1px solid #d1d5db",
                        fontSize: "12px",
                        fontFamily: tokens.font.body,
                        cursor: "pointer",
                        backgroundColor: tokens.color.canvas,
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
                  sx={{ borderRadius: tokens.radius.pill, textTransform: "none", fontSize: "13px" }}
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
