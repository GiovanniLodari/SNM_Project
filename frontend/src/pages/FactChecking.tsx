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
import { api, FactCheckResponse } from "../api/client.ts";
import { ArrowBack as PrevIcon, ArrowForward as NextIcon, SmartToy as BotIcon } from "@mui/icons-material";

export default function FactChecking() {
  const [data, setData] = useState<FactCheckResponse | null>(null);
  const [selectedVerdicts, setSelectedVerdicts] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFactCheckData = (verdicts: string[], pg: number) => {
    setLoading(true);
    api.factCheck(verdicts, pg)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossibile caricare i dati di fact-checking.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFactCheckData(selectedVerdicts, page);
  }, [page]);

  const handleVerdictChange = (verdict: string) => {
    const nextVerdicts = selectedVerdicts.includes(verdict)
      ? selectedVerdicts.filter((v) => v !== verdict)
      : [...selectedVerdicts, verdict];
    setSelectedVerdicts(nextVerdicts);
    setPage(1);
    fetchFactCheckData(nextVerdicts, 1);
  };

  const getVerdictBgColor = (verdict: string) => {
    const v = verdict.toLowerCase();
    if (v.includes("falso")) return "#b30000"; // Error Red
    if (v.includes("vero")) return "#003c33"; // Deep Enterprise Green
    if (v.includes("misto") || v.includes("incerto")) return "#ff7759"; // Coral
    return "#75758a";
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
          label="CLAIM VERIFICATION ARCHIVE"
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
          LLM Truth Verification Index.
        </Typography>
        <Typography variant="body1" sx={{ color: "#75758a" }}>
          Automated web search (DuckDuckGo + Wikipedia) and reasoning synthesis performed by LLM pipeline.
        </Typography>
      </Box>

      {data && (
        <Grid container spacing={4} sx={{ mb: 6 }}>
          {/* Summary Card */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 4,
                borderRadius: "22px",
                backgroundColor: "#eeece7",
                height: "100%",
              }}
            >
              <Typography variant="caption" sx={{ color: "#75758a", mb: 2, display: "block" }}>
                COMPLETED AUDITS
              </Typography>
              <Typography
                variant="h1"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 400,
                  fontSize: "56px",
                  color: "#17171c",
                  lineHeight: 1.0,
                  mb: 2,
                }}
              >
                {data.done.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: "#75758a" }}>
                Out of <strong>{data.eligible.toLocaleString()}</strong> checkworthy statuses identified.
              </Typography>
            </Box>
          </Grid>

          {/* Verdict Breakdown */}
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                p: 4,
                borderRadius: "22px",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                height: "100%",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#17171c", mb: 3 }}>
                Verdict Ripartition
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {data.verdicts && Object.entries(data.verdicts).map(([verdict, count]) => (
                  <Chip
                    key={verdict}
                    label={`${verdict.toUpperCase()}: ${count}`}
                    sx={{
                      backgroundColor: getVerdictBgColor(verdict),
                      color: "#ffffff",
                      fontSize: "12px",
                      px: 1.5,
                      py: 2,
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={4}>
        {/* Filters */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
            <Typography variant="caption" sx={{ color: "#75758a", mb: 2, display: "block" }}>
              VERDICT CATEGORY
            </Typography>
            {data && data.verdict_options ? (
              <FormGroup>
                {data.verdict_options.map((option) => (
                  <FormControlLabel
                    key={option}
                    control={
                      <Checkbox
                        checked={selectedVerdicts.includes(option)}
                        onChange={() => handleVerdictChange(option)}
                        sx={{
                          color: "#93939f",
                          "&.Mui-checked": { color: "#1863dc" },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ textTransform: "capitalize", fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#212121" }}>
                        {option}
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>
            ) : (
              <Typography variant="body2" sx={{ color: "#75758a" }}>
                No filters available.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Fact-Checked Posts List */}
        <Grid item xs={12} md={9}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : error || !data || data.page_rows.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: "16px", border: "1px solid #e5e7eb" }}>
              <Typography variant="body1" sx={{ color: "#75758a" }}>No posts matched the verdict criteria.</Typography>
            </Paper>
          ) : (
            <Box>
              <Paper sx={{ borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden", mb: 4, backgroundColor: "#ffffff" }}>
                <List sx={{ p: 0 }}>
                  {data.page_rows.map(({ post, row: check }, idx) => (
                    <div key={post.id}>
                      <ListItem
                        sx={{
                          p: 3,
                          alignItems: "flex-start",
                          transition: "background-color 0.15s ease",
                          "&:hover": { backgroundColor: "#f1f5ff" },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#17171c" }}>
                                  {post.acct}
                                </Typography>
                                <Chip label={post.domain} size="small" sx={{ borderRadius: "12px", backgroundColor: "#eeece7" }} />
                                {post.bot && (
                                  <Chip
                                    icon={<BotIcon style={{ fontSize: 14, color: "#ffffff" }} />}
                                    label="BOT"
                                    size="small"
                                    sx={{ borderRadius: "12px", backgroundColor: "#17171c", color: "#ffffff" }}
                                  />
                                )}
                              </Box>
                              <Chip
                                label={check.verdict.toUpperCase()}
                                sx={{
                                  backgroundColor: getVerdictBgColor(check.verdict),
                                  color: "#ffffff",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  whiteSpace: "pre-wrap",
                                  mb: 1.5,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  color: "#212121",
                                }}
                              >
                                {post.content}
                              </Typography>
                              
                              <Typography variant="body2" sx={{ fontStyle: "italic", mb: 2, color: "#75758a" }}>
                                <strong>Reasoning:</strong> &ldquo;{check.reasoning}&rdquo;
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
                                View Detailed Evidence Log &rarr;
                              </Link>
                            </Box>
                          }
                        />
                      </ListItem>
                      {idx < data.page_rows.length - 1 && <Divider sx={{ borderColor: "#e5e7eb" }} />}
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
