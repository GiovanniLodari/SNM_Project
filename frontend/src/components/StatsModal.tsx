import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import { DescriptiveStats } from "../api/client.ts";

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  stats?: DescriptiveStats;
  detectorLabel?: string;
}

// Cohere-style mono label chip
function MonoChip({ label, color = "#ff7759", bg = "#fff0ec" }: { label: string; color?: string; bg?: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        fontFamily: "ui-monospace, monospace",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.28px",
        color,
        backgroundColor: bg,
        height: 22,
        px: 0.5,
      }}
    />
  );
}

// Flat stone KPI card (DESIGN.md: product-card pattern)
function KpiCard({
  label,
  value,
  sub,
  accent = "#17171c",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: "16px",
        backgroundColor: "#eeece7",
        height: "100%",
        borderTop: `3px solid ${accent}`,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontFamily: "ui-monospace, monospace",
          fontSize: "11px",
          color: "#75758a",
          textTransform: "uppercase",
          letterSpacing: "0.28px",
          display: "block",
          mb: 1,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: "Space Grotesk, Inter, sans-serif",
          fontWeight: 400,
          fontSize: "40px",
          lineHeight: 1.0,
          color: accent,
          mb: 0.5,
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: "#75758a", display: "block", lineHeight: 1.4 }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

export default function StatsModal({
  open,
  onClose,
  stats,
  detectorLabel = "Fast-DetectGPT",
}: StatsModalProps) {
  if (!stats) return null;

  // Quartile proxies derived from min/median/max + std
  const q1 = +(stats.probability.median - stats.probability.std * 0.674).toFixed(1);
  const q3 = +(stats.probability.median + stats.probability.std * 0.674).toFixed(1);
  const iqr = +(q3 - q1).toFixed(1);

  // AI classified count (posts above 50%)
  const aboveThreshold = stats.distribution_curve
    .filter((b) => {
      const lo = parseFloat(b.bucket.split("-")[0]);
      return lo >= 0.5;
    })
    .reduce((s, b) => s + b.count, 0);

  const classificationRate =
    stats.total_analyzed > 0
      ? ((aboveThreshold / stats.total_analyzed) * 100).toFixed(1)
      : "0.0";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "22px",
          backgroundColor: "#ffffff",
          boxShadow: "0 25px 60px rgba(0,0,0,0.12)",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          maxHeight: "92vh",
        },
      }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <Box
        sx={{
          px: 4,
          py: 3,
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          backgroundColor: "#ffffff",
        }}
      >
        <Box>
          <MonoChip label={`ANALISI STATISTICA • ${detectorLabel.toUpperCase()}`} />
          <Typography
            sx={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 400,
              fontSize: { xs: "24px", md: "36px" },
              color: "#000000",
              letterSpacing: "-0.72px",
              lineHeight: 1.1,
              mt: 1.5,
              mb: 0.5,
            }}
          >
            Statistiche Descrittive Avanzate
          </Typography>
          <Typography variant="body2" sx={{ color: "#75758a" }}>
            Analisi quantitativa su{" "}
            <strong>{stats.total_analyzed.toLocaleString("it-IT")}</strong> post elaborati · Soglia
            classificazione IA:{" "}
            <strong>≥ 50%</strong>
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: "#75758a",
            mt: -0.5,
            borderRadius: "12px",
            "&:hover": { backgroundColor: "#eeece7", color: "#17171c" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 4, overflowY: "auto" }}>

        {/* ── KPI Row ─────────────────────────────────── */}
        <Grid container spacing={2.5} sx={{ mb: 5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              label="Probabilità Media"
              value={`${stats.probability.mean}%`}
              sub={`Mediana: ${stats.probability.median}% · Dev.Std: ±${stats.probability.std}%`}
              accent="#ff7759"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              label="Range Probabilità"
              value={`${stats.probability.min}–${stats.probability.max}%`}
              sub={`IQR stimato: ${iqr}pp · Q1≈${q1}% Q3≈${q3}%`}
              accent="#17171c"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              label="Classificati come IA"
              value={`${classificationRate}%`}
              sub={`${aboveThreshold.toLocaleString("it-IT")} post su ${stats.total_analyzed.toLocaleString("it-IT")} totali`}
              accent="#003c33"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              label="Account Bot Presenti"
              value={`${stats.bot_breakdown.bot_percentage}%`}
              sub={`${stats.bot_breakdown.bots.toLocaleString("it-IT")} bot · ${stats.bot_breakdown.humans.toLocaleString("it-IT")} umani`}
              accent="#1863dc"
            />
          </Grid>
        </Grid>

        {/* ── Distribuzione + Dettaglio probabilità ───── */}
        <Grid container spacing={3} sx={{ mb: 5 }}>

          {/* Area Chart */}
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                p: 3.5,
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: "ui-monospace, monospace", color: "#ff7759", fontWeight: 700, display: "block", mb: 0.5 }}
                  >
                    DISTRIBUZIONE DI PROBABILITÀ
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: "Space Grotesk", fontWeight: 600, color: "#17171c" }}>
                    Spettro continuo per decile (0–100%)
                  </Typography>
                </Box>
                <MonoChip label={`${stats.distribution_curve.length} FASCE`} color="#75758a" bg="#eeece7" />
              </Box>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.distribution_curve} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="coralGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff7759" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ff7759" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="bucket"
                      stroke="#d9d9dd"
                      tick={{ fontSize: 11, fill: "#75758a", fontFamily: "ui-monospace, monospace" }}
                    />
                    <YAxis
                      stroke="#d9d9dd"
                      tick={{ fontSize: 11, fill: "#75758a" }}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "13px",
                        fontFamily: "Inter, sans-serif",
                      }}
                      formatter={(val: any) => [
                        `${Number(val || 0).toLocaleString("it-IT")} post`,
                        "Frequenza",
                      ]}
                    />
                    <ReferenceLine x="0.5-0.6" stroke="#ff7759" strokeDasharray="4 3" label={{ value: "Soglia IA", fill: "#ff7759", fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#ff7759"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#coralGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
              <Typography variant="caption" sx={{ color: "#75758a", mt: 1.5, display: "block" }}>
                La linea tratteggiata indica la soglia di classificazione IA (≥ 50%). Post alla destra della soglia
                vengono classificati come generati artificialmente.
              </Typography>
            </Box>
          </Grid>

          {/* Stat Table: Probabilità */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                p: 3.5,
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontFamily: "ui-monospace, monospace", color: "#ff7759", fontWeight: 700, display: "block", mb: 2 }}
              >
                RIEPILOGO QUANTITATIVO
              </Typography>

              {[
                { label: "Media (μ)", value: `${stats.probability.mean}%`, accent: "#ff7759" },
                { label: "Mediana (M)", value: `${stats.probability.median}%`, accent: "#17171c" },
                { label: "Dev. Std (σ)", value: `±${stats.probability.std}%`, accent: "#75758a" },
                { label: "Minimo", value: `${stats.probability.min}%`, accent: "#75758a" },
                { label: "Massimo", value: `${stats.probability.max}%`, accent: "#75758a" },
                { label: "Q1 (stimato)", value: `${q1}%`, accent: "#1863dc" },
                { label: "Q3 (stimato)", value: `${q3}%`, accent: "#1863dc" },
                { label: "IQR (stimato)", value: `${iqr}pp`, accent: "#1863dc" },
                ...(stats.criteria
                  ? [
                      { label: "Criteria medio", value: String(stats.criteria.mean), accent: "#003c33" },
                      { label: "Criteria mediano", value: String(stats.criteria.median), accent: "#003c33" },
                    ]
                  : []),
              ].map((row, i, arr) => (
                <Box
                  key={row.label}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 1.2,
                    borderBottom: i < arr.length - 1 ? "1px solid #f2f2f2" : "none",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "#212121", fontSize: "13px" }}>
                    {row.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: "ui-monospace, monospace",
                      fontWeight: 700,
                      fontSize: "13px",
                      color: row.accent,
                    }}
                  >
                    {row.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>

        {/* ── Criteri + Testo ──────────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 5 }}>

          {/* Lunghezza testo */}
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 3.5, borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff", height: "100%" }}>
              <Typography
                variant="caption"
                sx={{ fontFamily: "ui-monospace, monospace", color: "#1863dc", fontWeight: 700, display: "block", mb: 2 }}
              >
                LUNGHEZZA DEL TESTO
              </Typography>
              <Grid container spacing={2}>
                {[
                  { label: "Media caratteri", value: stats.text_length.avg_chars.toLocaleString("it-IT") },
                  { label: "Mediana caratteri", value: stats.text_length.median_chars.toLocaleString("it-IT") },
                  { label: "Media token", value: `~${stats.text_length.avg_tokens}` },
                ].map((item) => (
                  <Grid item xs={12} key={item.label}>
                    <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#eeece7" }}>
                      <Typography variant="caption" sx={{ color: "#75758a", display: "block", mb: 0.5 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontFamily: "Space Grotesk", fontWeight: 400, fontSize: "28px", color: "#17171c", lineHeight: 1 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>

          {/* Classification breakdown bars */}
          <Grid item xs={12} md={8}>
            <Box sx={{ p: 3.5, borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff", height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: "ui-monospace, monospace", color: "#1863dc", fontWeight: 700, display: "block", mb: 0.5 }}
                  >
                    CLASSIFICAZIONE PER FASCIA
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: "Space Grotesk", fontWeight: 600, color: "#17171c" }}>
                    Peso relativo di ciascuno scaglione
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {stats.distribution_curve.map((b) => {
                  const maxCount = Math.max(...stats.distribution_curve.map((x) => x.count), 1);
                  const pct = Math.round((b.count / maxCount) * 100);
                  const lo = parseFloat(b.bucket.split("-")[0]);
                  const isAi = lo >= 0.5;
                  return (
                    <Box key={b.bucket} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          minWidth: 70,
                          fontFamily: "ui-monospace, monospace",
                          fontSize: "11px",
                          color: isAi ? "#ff7759" : "#75758a",
                          fontWeight: isAi ? 700 : 400,
                        }}
                      >
                        {b.bucket}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: "#eeece7",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: isAi ? "#ff7759" : "#17171c",
                              borderRadius: 5,
                            },
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          minWidth: 80,
                          textAlign: "right",
                          fontFamily: "ui-monospace, monospace",
                          fontSize: "11px",
                          color: "#212121",
                          fontWeight: 600,
                        }}
                      >
                        {b.count.toLocaleString("it-IT")}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          minWidth: 42,
                          textAlign: "right",
                          fontFamily: "ui-monospace, monospace",
                          fontSize: "11px",
                          color: "#75758a",
                        }}
                      >
                        {b.percentage}%
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              {/* Classification summary row */}
              <Box sx={{ mt: 3, pt: 2.5, borderTop: "1px solid #e5e7eb", display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "#75758a", display: "block" }}>Classificati IA (≥50%)</Typography>
                  <Typography sx={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: "20px", color: "#ff7759" }}>
                    {classificationRate}%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "#75758a", display: "block" }}>Post classificati</Typography>
                  <Typography sx={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: "20px", color: "#17171c" }}>
                    {aboveThreshold.toLocaleString("it-IT")}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "#75758a", display: "block" }}>Post umani (stima)</Typography>
                  <Typography sx={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: "20px", color: "#003c33" }}>
                    {(stats.total_analyzed - aboveThreshold).toLocaleString("it-IT")}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* ── Bot vs Human ─────────────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 5 }}>

          {/* Bot analysis */}
          <Grid item xs={12} md={5}>
            <Box sx={{ p: 3.5, borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff", height: "100%" }}>
              <Typography
                variant="caption"
                sx={{ fontFamily: "ui-monospace, monospace", color: "#ff7759", fontWeight: 700, display: "block", mb: 2 }}
              >
                COMPOSIZIONE ACCOUNT
              </Typography>

              {/* Bot bar */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Account Bot (bot=true)</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#17171c" }}>
                    {stats.bot_breakdown.bot_percentage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.bot_breakdown.bot_percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#eeece7",
                    "& .MuiLinearProgress-bar": { backgroundColor: "#17171c", borderRadius: 4 },
                  }}
                />
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  {stats.bot_breakdown.bots.toLocaleString("it-IT")} post da account bot
                </Typography>
              </Box>

              {/* Human bar */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Account Umani</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#1863dc" }}>
                    {(100 - stats.bot_breakdown.bot_percentage).toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={100 - stats.bot_breakdown.bot_percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#eeece7",
                    "& .MuiLinearProgress-bar": { backgroundColor: "#1863dc", borderRadius: 4 },
                  }}
                />
                <Typography variant="caption" sx={{ color: "#75758a" }}>
                  {stats.bot_breakdown.humans.toLocaleString("it-IT")} post da account umani
                </Typography>
              </Box>

              <Divider sx={{ borderColor: "#e5e7eb", mb: 2 }} />

              <Box sx={{ p: 2, borderRadius: "12px", backgroundColor: "#eeece7" }}>
                <Typography variant="caption" sx={{ fontFamily: "ui-monospace, monospace", color: "#75758a", display: "block", mb: 0.5 }}>
                  NOTA METODOLOGICA
                </Typography>
                <Typography variant="body2" sx={{ color: "#212121", fontSize: "13px", lineHeight: 1.5 }}>
                  Il campo <code>bot=true</code> è auto-dichiarato dai software client al momento della registrazione
                  su Mastodon. Non implica che il testo sia generato da LLM: molti bot aggregano contenuto umano
                  (news, feed meteo, bollettini automatici).
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Top Domini Bar Chart */}
          <Grid item xs={12} md={7}>
            <Box sx={{ p: 3.5, borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#ffffff", height: "100%" }}>
              <Typography
                variant="caption"
                sx={{ fontFamily: "ui-monospace, monospace", color: "#75758a", fontWeight: 700, display: "block", mb: 0.5 }}
              >
                TOP ISTANZE FEDIVERSO
              </Typography>
              <Typography variant="subtitle1" sx={{ fontFamily: "Space Grotesk", fontWeight: 600, color: "#17171c", mb: 2.5 }}>
                Distribuzione dei post per dominio Mastodon
              </Typography>

              <Box sx={{ height: 220, mb: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.top_domains.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      stroke="#d9d9dd"
                      tick={{ fontSize: 10, fill: "#75758a" }}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                    />
                    <YAxis
                      dataKey="domain"
                      type="category"
                      stroke="#d9d9dd"
                      tick={{ fontSize: 11, fill: "#212121" }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        fontSize: "13px",
                      }}
                      formatter={(val: any) => [Number(val).toLocaleString("it-IT"), "Post"]}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {stats.top_domains.slice(0, 8).map((_, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={idx === 0 ? "#ff7759" : idx === 1 ? "#17171c" : "#eeece7"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              {/* Tabella domini */}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "#75758a", fontSize: "11px", fontFamily: "ui-monospace, monospace", borderBottom: "1px solid #e5e7eb", py: 0.5 }}>
                      DOMINIO
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#75758a", fontSize: "11px", fontFamily: "ui-monospace, monospace", borderBottom: "1px solid #e5e7eb", py: 0.5 }}>
                      POST
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#75758a", fontSize: "11px", fontFamily: "ui-monospace, monospace", borderBottom: "1px solid #e5e7eb", py: 0.5 }}>
                      %
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.top_domains.slice(0, 6).map((d, idx) => {
                    const pct =
                      stats.total_analyzed > 0
                        ? ((d.count / stats.total_analyzed) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <TableRow key={d.domain} sx={{ "&:hover": { backgroundColor: "#fafaf8" } }}>
                        <TableCell sx={{ color: "#212121", fontSize: "12px", borderBottom: "1px solid #f2f2f2", py: 0.8 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {idx === 0 && (
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ff7759", flexShrink: 0 }} />
                            )}
                            {idx === 1 && (
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#17171c", flexShrink: 0 }} />
                            )}
                            {idx > 1 && (
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#d9d9dd", flexShrink: 0 }} />
                            )}
                            {d.domain}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", fontWeight: 600, color: "#17171c", borderBottom: "1px solid #f2f2f2", py: 0.8 }}>
                          {d.count.toLocaleString("it-IT")}
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", color: "#75758a", borderBottom: "1px solid #f2f2f2", py: 0.8 }}>
                          {pct}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Grid>
        </Grid>

        {/* ── Footer ───────────────────────────────────── */}
        <Box
          sx={{
            pt: 3,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="caption" sx={{ color: "#75758a" }}>
            Generato automaticamente · SNM Intelligence · Detector: <strong>{detectorLabel}</strong>
          </Typography>
          <Box
            component="button"
            onClick={onClose}
            sx={{
              background: "#17171c",
              color: "#ffffff",
              border: "none",
              borderRadius: "32px",
              px: 3.5,
              py: 1.2,
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "Inter, sans-serif",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
              "&:hover": { backgroundColor: "#2e2e38" },
            }}
          >
            Chiudi Report
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
