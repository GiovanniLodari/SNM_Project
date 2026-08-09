import { useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Chip,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Pagination,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Search as SearchIcon,
  InfoOutlined as InfoIcon,
  CompareArrows as CompareIcon,
  BubbleChart as CascataIcon,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  api,
  AccountDetail,
} from "../api/client.ts";
import {
  useInfluenceSummaryQuery,
  useInfluenceGraphQuery,
  useInfluenceComparisonQuery,
  useInfluenceSeedsQuery,
} from "../api/queries.ts";
import { useAppStore } from "../store/useAppStore.ts";
import { AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition.tsx";
import InfluenceGraphCanvas from "../components/InfluenceGraphCanvas.tsx";
import AccountDetailModal from "../components/AccountDetailModal.tsx";
import InfluenceAlgorithmComparison from "../components/InfluenceAlgorithmComparison.tsx";



export default function InfluenceMaximization() {
  const { activeInfluenceTab: activeTab, setActiveInfluenceTab: setActiveTab, selectedSeedId, setSelectedSeedId } = useAppStore();

  const { data: summary, isLoading: loadingSummary, isError: errorSummary } = useInfluenceSummaryQuery();
  const { data: graphData } = useInfluenceGraphQuery(selectedSeedId);
  const { data: comparisonData } = useInfluenceComparisonQuery();

  // Leaderboard seeds pagination and search
  const [seedsPage, setSeedsPage] = useState<number>(1);
  const [seedsSearch, setSeedsSearch] = useState<string>("");
  const { data: seedsRes, isLoading: seedsLoading } = useInfluenceSeedsQuery(seedsPage, 10, seedsSearch);
  const seedsData = seedsRes ? { seeds: seedsRes.seeds, total: seedsRes.total } : null;

  // Modal detail state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalAccount, setModalAccount] = useState<AccountDetail | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  const handleSelectSeedFocus = (seedId: string) => {
    setSelectedSeedId(seedId);
  };


  const handleSelectAccount = (idString: string) => {
    const parsedId = parseInt(idString, 10);
    if (isNaN(parsedId)) return;

    setModalOpen(true);
    setModalLoading(true);
    api.accountDetail(parsedId)
      .then((res) => {
        setModalAccount(res.account);
        setModalLoading(false);
      })
      .catch((err) => {
        console.error("Errore caricamento dettagli account:", err);
        setModalLoading(false);
      });
  };

  if (loadingSummary) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 2, borderRadius: "12px" }} />
        <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 4, borderRadius: "22px" }} />
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: "22px", backgroundColor: "#eeece7" }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={540} sx={{ borderRadius: "22px", backgroundColor: "#17171c" }} />
      </Box>
    );
  }

  if (errorSummary || !summary) {
    return (
      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          Dati Influence Maximization non disponibili.
        </Typography>
      </Box>
    );
  }


  const { meta, demographics, step_stats, top_targets } = summary;

  return (
    <Box sx={{ pb: 8 }}>
      {/* Brand Section Header */}
      <Box sx={{ mb: 5 }}>
        <Chip
          label="Influence Maximization"
          sx={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            color: "#ff7759",
            backgroundColor: "rgba(255, 119, 89, 0.1)",
            border: "1px solid rgba(255, 119, 89, 0.25)",
            mb: 2,
            px: 1,
            fontWeight: 600,
          }}
        />
        <Typography
          variant="h2"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 400,
            fontSize: { xs: "32px", md: "48px" },
            color: "#17171c",
            letterSpacing: "-1.2px",
            lineHeight: 1.05,
            mb: 2,
          }}
        >
          Propagazione & Penetrazione del Grafo Sociale
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "#75758a",
            maxWidth: 820,
            fontSize: "16px",
            lineHeight: 1.6,
          }}
        >
          Simulazione della cascata di influenza sul grafo sociale Mastodon/Fediverse. Un set di{" "}
          <strong style={{ color: "#17171c" }}>1.000 account bot AI</strong> ha raggiunto e attivato{" "}
          <strong style={{ color: "#ff7759" }}>80.943 nodi</strong> (pari al{" "}
          <strong style={{ color: "#ff7759" }}>25,37%</strong> della rete totale di 319k nodi) attraverso 11 step di propagazione probabilistica Independent Cascade.
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "#e5e7eb", mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, val) => setActiveTab(val)}
          sx={{
            "& .MuiTab-root": {
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 600,
              fontSize: "15px",
              textTransform: "none",
              py: 1.5,
              px: 3,
              borderRadius: "12px 12px 0 0",
              transition: "all 0.2s ease-in-out",
            },
            "& .Mui-selected": {
              color: "#ff7759",
              backgroundColor: "rgba(255, 119, 89, 0.05)",
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#ff7759",
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
          }}
        >
          <Tab icon={<CascataIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Simulazione Cascata IC" />
          <Tab icon={<CompareIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Comparazione Algoritmi IM" />
        </Tabs>
      </Box>

      <AnimatePresence mode="wait">
        {activeTab === 0 ? (
          <PageTransition keyName="tab-cascata">
            {/* KPI Highlight Cards Grid */}
            <Grid container spacing={3} sx={{ mb: 6 }}>


        {/* Dimensione Rete Totale */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "22px",
              backgroundColor: "#eeece7",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justify: "space-between",
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: "#75758a", fontFamily: "ui-monospace, monospace" }}>
                NETWORK SCALE
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: "28px",
                  color: "#17171c",
                  mt: 1,
                }}
              >
                {meta.nodes.toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "#75758a", mt: 2 }}>
              {meta.edges.toLocaleString()} archi nel grafo
            </Typography>
          </Paper>
        </Grid>

        {/* Set di Seed Bot */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "22px",
              backgroundColor: "#eeece7",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justify: "space-between",
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: "#ff7759", fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>
                SEED SET |S|
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: "28px",
                  color: "#ff7759",
                  mt: 1,
                }}
              >
                {meta.seeds.toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "#75758a", mt: 2 }}>
              100% Account AI Bot Selezionati
            </Typography>
          </Paper>
        </Grid>

        {/* Copertura Totale Cascata */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "22px",
              backgroundColor: "#17171c",
              color: "#ffffff",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justify: "space-between",
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: "#93939f", fontFamily: "ui-monospace, monospace" }}>
                CASCADE REACH
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: "28px",
                  color: "#ffffff",
                  mt: 1,
                }}
              >
                {meta.reached_nodes.toLocaleString()}
              </Typography>
            </Box>
            <Chip
              label={`${meta.reached_pct}% DEL GRAFO`}
              size="small"
              sx={{
                backgroundColor: "#ff7759",
                color: "#ffffff",
                fontFamily: "ui-monospace, monospace",
                fontWeight: 700,
                fontSize: "11px",
                mt: 2,
                alignSelf: "flex-start",
              }}
            />
          </Paper>
        </Grid>

        {/* Target Umani Raggiunti */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "22px",
              backgroundColor: "#eeece7",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justify: "space-between",
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: "#1863dc", fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>
                HUMAN USERS REACHED
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: "28px",
                  color: "#1863dc",
                  mt: 1,
                }}
              >
                {demographics.activated_human.toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "#75758a", mt: 2 }}>
              98.1% dei nodi attivati sono umani
            </Typography>
          </Paper>
        </Grid>

        {/* Profondità Step Cascata */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "22px",
              backgroundColor: "#eeece7",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justify: "space-between",
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: "#75758a", fontFamily: "ui-monospace, monospace" }}>
                CASCADE STEPS
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: "28px",
                  color: "#17171c",
                  mt: 1,
                }}
              >
                {meta.num_steps} Steps
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "#75758a", mt: 2 }}>
              Max diffusione in t=1 (34.5k nodi)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Interactive IC Propagation Canvas Visualizer */}
      <Box sx={{ mb: 8 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 400,
            fontSize: "24px",
            color: "#17171c",
            mb: 2,
          }}
        >
          Visualizzatore Interattivo di Cascata (Step-by-Step Canvas)
        </Typography>

        {graphData && (
          <InfluenceGraphCanvas
            nodes={graphData.nodes}
            links={graphData.links}
            maxStep={meta.num_steps}
            onSelectNode={(node) => handleSelectAccount(node.id)}
            topSeeds={summary.top_seeds}
            selectedSeedId={selectedSeedId}
            onSelectSeedId={handleSelectSeedFocus}
          />
        )}

      </Box>

      {/* Analytical Charts Section */}
      <Box sx={{ mb: 8 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 400,
            fontSize: "24px",
            color: "#17171c",
            mb: 4,
          }}
        >
          Analisi della Dinamica di Diffusione
        </Typography>

        <Grid container spacing={4}>
          {/* Stacked Bar Chart: Nuovi Nodi Attivati per Step */}
          <Grid item xs={12} md={7}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: "22px",
                backgroundColor: "#eeece7",
                height: 420,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontSize: "16px",
                  fontWeight: 600,
                  mb: 1,
                  color: "#17171c",
                }}
              >
                Nuovi Nodi Attivati per Step (Umani vs AI)
              </Typography>
              <Typography variant="caption" sx={{ color: "#75758a", display: "block", mb: 3 }}>
                Step 0 rappresenta il set di seed bot iniziale. La maggior penetrazione avviene allo step t=1.
              </Typography>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={step_stats} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9d9dd" vertical={false} />
                  <XAxis dataKey="step" tickFormatter={(st) => `t=${st}`} stroke="#75758a" />
                  <YAxis stroke="#75758a" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#17171c",
                      border: "none",
                      borderRadius: "12px",
                      color: "#ffffff",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="new_human" name="Nuovi Umani Attivati" stackId="a" fill="#1863dc" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="new_ai" name="Nuovi AI Attivati" stackId="a" fill="#ff7759" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Line/Area Chart: Curva di Crescita Cumulativa % */}
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: "22px",
                backgroundColor: "#eeece7",
                height: 420,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Space Grotesk, Inter, sans-serif",
                  fontSize: "16px",
                  fontWeight: 600,
                  mb: 1,
                  color: "#17171c",
                }}
              >
                Curva di Copertura Cumulativa della Rete (%)
              </Typography>
              <Typography variant="caption" sx={{ color: "#75758a", display: "block", mb: 3 }}>
                Percentuale progressiva del grafo sociale globale raggiunto al trascorrere dei vari step.
              </Typography>

              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={step_stats} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9d9dd" vertical={false} />
                  <XAxis dataKey="step" tickFormatter={(st) => `t=${st}`} stroke="#75758a" />
                  <YAxis unit="%" stroke="#75758a" domain={[0, 30]} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#17171c",
                      border: "none",
                      borderRadius: "12px",
                      color: "#ffffff",
                    }}
                    formatter={(val: any) => [`${val}%`, "Copertura Cumulativa"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative_pct"
                    name="Copertura %"
                    stroke="#ff7759"
                    strokeWidth={3}
                    fill="#ff7759"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Leaderboard Tables Section */}
      <Grid container spacing={4} sx={{ mb: 8 }}>
        {/* Top Seed Bots Leaderboard */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: "22px",
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: "Space Grotesk, Inter, sans-serif",
                    fontWeight: 600,
                    fontSize: "18px",
                    color: "#17171c",
                  }}
                >
                  Leaderboard Top Seed Bot
                </Typography>
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  Classifica dei 1.000 seed bot ordinati per impatto diretto di propagazione.
                </Typography>
              </Box>

              <TextField
                placeholder="Cerca account o ID..."
                size="small"
                value={seedsSearch}
                onChange={(e) => {
                  setSeedsSearch(e.target.value);
                  setSeedsPage(1);
                }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: "#75758a", mr: 1, fontSize: 18 }} />,
                }}
                sx={{
                  width: 220,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "24px",
                    backgroundColor: "#eeece7",
                    fontSize: "13px",
                  },
                }}
              />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { borderBottom: "2px solid #e5e7eb", color: "#75758a", fontWeight: 600, fontSize: "12px", fontFamily: "ui-monospace, monospace" } }}>
                    <TableCell>ACCOUNT BOT</TableCell>
                    <TableCell align="right">FOLLOWER</TableCell>
                    <TableCell align="right">ACTIVATED (t=1)</TableCell>
                    <TableCell align="right">EFFICIENZA</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {seedsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Skeleton variant="text" width={200} />
                      </TableCell>
                    </TableRow>
                  ) : seedsData && seedsData.seeds.length > 0 ? (
                    seedsData.seeds.map((s) => (
                      <TableRow
                        key={s.id}
                        hover
                        selected={s.id === selectedSeedId}
                        onClick={() => {
                          handleSelectSeedFocus(s.id);
                          handleSelectAccount(s.id);
                        }}
                        sx={{
                          cursor: "pointer",
                          "&.Mui-selected": {
                            backgroundColor: "rgba(255, 119, 89, 0.08)",
                          },
                        }}
                      >

                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#17171c", fontSize: "13px" }}>
                            {s.acct}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#75758a", fontFamily: "ui-monospace, monospace" }}>
                            ID: {s.id}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace", fontSize: "13px" }}>
                            {s.followers.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${s.direct_reached} nodi`}
                            size="small"
                            sx={{
                              backgroundColor: "rgba(255, 119, 89, 0.15)",
                              color: "#ff7759",
                              fontFamily: "ui-monospace, monospace",
                              fontWeight: 700,
                              fontSize: "11px",
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#75758a" }}>
                            {(s.efficiency * 100).toFixed(1)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: "#75758a" }}>
                        Nessun seed trovato.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {seedsData && seedsData.total > 10 && (
              <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
                <Pagination
                  count={Math.ceil(seedsData.total / 10)}
                  page={seedsPage}
                  onChange={(_, p) => setSeedsPage(p)}
                  size="small"
                  sx={{
                    "& .Mui-selected": {
                      backgroundColor: "#17171c !important",
                      color: "#ffffff",
                    },
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Top Target Human Accounts */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: "22px",
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 600,
                fontSize: "18px",
                color: "#17171c",
                mb: 1,
              }}
            >
              Principali Account Umani Raggiunti
            </Typography>
            <Typography variant="caption" sx={{ color: "#75758a", display: "block", mb: 3 }}>
              Account umani con il maggior numero di follower penetrati nelle prime fasi della cascata.
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { borderBottom: "2px solid #e5e7eb", color: "#75758a", fontWeight: 600, fontSize: "12px", fontFamily: "ui-monospace, monospace" } }}>
                    <TableCell>ACCOUNT UMANO</TableCell>
                    <TableCell align="right">FOLLOWER</TableCell>
                    <TableCell align="right">STEP ATTIVATO</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {top_targets.slice(0, 10).map((t) => (
                    <TableRow
                      key={t.id}
                      hover
                      onClick={() => handleSelectAccount(t.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#17171c", fontSize: "13px" }}>
                          {t.acct}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace", fontSize: "13px" }}>
                          {t.followers.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`t=${t.activation_step}`}
                          size="small"
                          sx={{
                            backgroundColor: "rgba(24, 99, 220, 0.12)",
                            color: "#1863dc",
                            fontFamily: "ui-monospace, monospace",
                            fontWeight: 600,
                            fontSize: "11px",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Model Technical Documentation Drawer Card */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: "22px",
          backgroundColor: "#eeece7",
          border: "1px solid #e5e7eb",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <InfoIcon sx={{ color: "#17171c" }} />
          <Typography
            variant="h6"
            sx={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 600,
              fontSize: "18px",
              color: "#17171c",
            }}
          >
            Note Algoritmiche e Modello Independent Cascade (IC)
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: "#212121", mb: 2, lineHeight: 1.6 }}>
          Nel modello <strong>Independent Cascade (IC)</strong>, l'influenza si propaga attraverso passi discreti nel tempo. Quando un nodo u diventa attivo al tempo t, ha una singola possibilità di attivare ciascun vicino inattivo v con probabilità p(u,v) = p_ic. Se l'attivazione ha successo, il nodo v diventa attivo al tempo t+1. Il processo termina quando non vi sono nuove attivazioni.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
              <Typography variant="caption" sx={{ color: "#75758a", fontFamily: "ui-monospace, monospace" }}>
                ALGORITMO
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#17171c", mt: 0.5 }}>
                Greedy / Lazy Forward
              </Typography>
              <Typography variant="caption" sx={{ color: "#75758a", display: "block", mt: 0.5 }}>
                Selezione dei 1.000 nodi seed mediante stima di massima influenza marginale.
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
              <Typography variant="caption" sx={{ color: "#75758a", fontFamily: "ui-monospace, monospace" }}>
                MEDIE DI PENETRAZIONE
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#17171c", mt: 0.5 }}>
                80,9 nodi per Seed Bot
              </Typography>
              <Typography variant="caption" sx={{ color: "#75758a", display: "block", mt: 0.5 }}>
                Media di nodi unici attivati downstream per ogni singolo seed bot iniziale.
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
              <Typography variant="caption" sx={{ color: "#75758a", fontFamily: "ui-monospace, monospace" }}>
                VULNERABILITÀ SOCIALE
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#ff7759", mt: 0.5 }}>
                Fediverse Cascade Risk
              </Typography>
              <Typography variant="caption" sx={{ color: "#75758a", display: "block", mt: 0.5 }}>
                Evidenzia l'elevata suscettibilità dei nodi centrali del Fediverse a botnet coordinate.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
          </PageTransition>
        ) : (
          comparisonData && (
            <PageTransition keyName="tab-comparazione">
              <InfluenceAlgorithmComparison data={comparisonData} />
            </PageTransition>
          )
        )}
      </AnimatePresence>


      {/* Account Detail Modal */}
      <AccountDetailModal
        account={modalAccount}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalAccount(null);
        }}
        loading={modalLoading}
      />
    </Box>
  );
}

