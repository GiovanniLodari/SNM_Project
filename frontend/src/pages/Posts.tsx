import { useEffect } from "react";
import {
  Typography,
  Box,
  Button,
  CircularProgress,
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
import { usePostsInfiniteQuery } from "../api/queries.ts";
import { SmartToy as BotIcon, ExpandMore as AltroIcon } from "@mui/icons-material";
import { tokens } from "../theme.ts";
import { EmptyState } from "../components/States.tsx";
import IntestazioneCapitolo from "../components/narrativa/IntestazioneCapitolo.tsx";
import { CAPITOLO_CORPUS } from "../navigazione.ts";
import { formatDateTime, formatNumber } from "../utils/format.ts";
import { useUrlList, useUrlNumber } from "../hooks/useUrlState.ts";
import { useSentinella } from "../hooks/useSentinella.ts";

/**
 * Tetto ai blocchi che la URL puo' chiedere di ripristinare. Senza, un
 * indirizzo con `?pagine=5000` innescherebbe cinquemila richieste in fila al
 * caricamento della pagina.
 */
const MAX_BLOCCHI = 200;

export default function Posts() {
  // Filtri nella URL: la vista diventa condivisibile e il tasto Indietro
  // ripercorre i filtri invece di uscire dalla pagina.
  const [selectedLangs, setSelectedLangs] = useUrlList("lang");
  const [pageSize, setPageSize] = useUrlNumber("size", 10);
  // Quanti blocchi mostrare. Ha preso il posto del numero di pagina: l'elenco
  // ora si accumula, ma il conteggio resta nella URL perche' tornando indietro
  // da un post si deve ritrovare l'elenco lungo com'era, non riportato in cima.
  const [blocchiRichiesti, setBlocchiRichiesti] = useUrlNumber("pagine", 1);

  const {
    data,
    isLoading: loading,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePostsInfiniteQuery(selectedLangs, pageSize);
  const error = isError ? "Impossibile caricare l'elenco dei post." : null;

  const blocchiCaricati = data?.pages.length ?? 0;
  const daMostrare = Math.min(Math.max(1, blocchiRichiesti), MAX_BLOCCHI);
  const posts = data?.pages.flatMap((blocco) => blocco.posts) ?? [];
  const lingueDisponibili = data?.pages[0]?.available_langs ?? [];

  // Vero mentre l'elenco viene ricostruito da capo dopo un cambio di filtro,
  // con quello vecchio ancora a schermo: basta un filetto di avanzamento e un
  // velo, non uno spinner che sostituisce tutto (DESIGN.md non usa spinner:
  // superfici piatte e filetti sottili). Il caricamento di un blocco in coda
  // non conta: ha un indicatore suo, in fondo all'elenco.
  const staAggiornando = isFetching && !isFetchingNextPage && blocchiCaricati > 0;

  // Unico punto in cui si chiede altro contenuto: sia la sentinella sia il
  // bottone si limitano ad alzare il numero di blocchi richiesti, e questo
  // effetto allinea il caricato al richiesto. Averne uno solo e' cio' che
  // permette alla URL di ripristinare un elenco lungo senza una seconda
  // strada che faccia la stessa cosa in modo leggermente diverso.
  useEffect(() => {
    if (blocchiCaricati === 0 || blocchiCaricati >= daMostrare) return;
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage();
  }, [blocchiCaricati, daMostrare, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const caricaAltro = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    setBlocchiRichiesti(Math.min(blocchiCaricati + 1, MAX_BLOCCHI));
  };

  const sentinella = useSentinella(hasNextPage && !isFetchingNextPage, caricaAltro);

  // Lo scroll in cima segue il cambio dei filtri, non il caricamento: quando
  // arrivano altri post in coda la posizione di lettura non si tocca.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedLangs, pageSize]);

  const handleLangToggle = (langCode: string) => {
    const next = selectedLangs.includes(langCode)
      ? selectedLangs.filter((l) => l !== langCode)
      : [...selectedLangs, langCode];
    // Il numero di blocchi torna a 1 nella stessa scrittura del filtro: due
    // setter URL separati si sovrascriverebbero (vedi OpzioniScrittura in
    // useUrlState).
    setSelectedLangs(next, { azzera: ["pagine"] });
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
              sx={{ borderRadius: tokens.radius.lg, backgroundColor: tokens.color.surfaceStone }}
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
      <IntestazioneCapitolo
        numero={CAPITOLO_CORPUS.numero}
        capitolo={CAPITOLO_CORPUS.etichetta}
        titolo="I post raccolti dal Fediverso"
        guida="Il corpus grezzo, filtrabile per lingua, prima che qualsiasi modello lo giudichi. Ogni post porta al proprio dettaglio, dove compaiono i punteggi dei quattro rilevatori."
      />

      <Grid container spacing={4}>
        {/* Left Side Filters */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas }}>
            <Typography variant="caption" sx={{ color: tokens.color.textMuted, mb: 2, fontWeight: 700, letterSpacing: "0.5px", display: "block" }}>
              FILTRA PER LINGUA
            </Typography>
            {lingueDisponibili.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {lingueDisponibili.map((langCode) => {
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
                        "&:hover": { backgroundColor: tokens.color.surfaceStone },
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
                    onClick={() => setSelectedLangs([], { azzera: ["pagine"] })}
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
          {error || posts.length === 0 ? (
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
                  {posts.map((post, idx) => (
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
                                    backgroundColor: post.binoculars_prob != null && post.binoculars_prob >= 0.5 ? tokens.color.surfaceGreen : tokens.color.surfaceBlue,
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
                      {idx < posts.length - 1 && <Divider sx={{ borderColor: tokens.color.border }} />}
                    </div>
                  ))}
                </List>
              </Paper>

              {/* Coda dell'elenco: la sentinella invisibile carica in anticipo
                  mentre si scorre, il bottone resta perche' lo scorrimento
                  automatico e' inaccessibile da tastiera e non esiste dove
                  IntersectionObserver manca. */}
              <Box
                ref={sentinella}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  py: 2,
                }}
              >
                {isFetchingNextPage && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <CircularProgress size={16} sx={{ color: tokens.color.nearBlack }} />
                    <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
                      Carico altri post…
                    </Typography>
                  </Box>
                )}

                {hasNextPage && !isFetchingNextPage && (
                  <Button
                    variant="outlined"
                    endIcon={<AltroIcon />}
                    onClick={caricaAltro}
                    sx={{ borderRadius: tokens.radius.pill, fontSize: "13px" }}
                  >
                    Carica altri {pageSize} post
                  </Button>
                )}

                {!hasNextPage && (
                  <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
                    Fine dell&#39;elenco.
                  </Typography>
                )}

                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                  <Typography variant="caption" sx={{ color: tokens.color.textMuted, fontWeight: 500 }}>
                    {formatNumber(posts.length)} post a schermo
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                      Post per blocco:
                    </Typography>
                    <select
                      value={pageSize}
                      aria-label="Post caricati per blocco"
                      onChange={(e) => setPageSize(Number(e.target.value), { azzera: ["pagine"] })}
                      style={{
                        padding: "4px 8px",
                        borderRadius: tokens.radius.sm,
                        border: `1px solid ${tokens.color.borderInput}`,
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
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
