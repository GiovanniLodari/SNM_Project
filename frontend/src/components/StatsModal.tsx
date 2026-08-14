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
import { tokens } from "../theme.ts";
import { percentileDaIstogramma } from "../utils/statistics.ts";
import { formatNumber } from "../utils/format.ts";

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  stats?: DescriptiveStats;
  detectorLabel?: string;
}

// Cohere-style mono label chip
function MonoChip({ label, color = tokens.color.coral, bg = tokens.color.surfaceCoral }: { label: string; color?: string; bg?: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        fontFamily: tokens.font.mono,
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
  accent = tokens.color.nearBlack,
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
        borderRadius: tokens.radius.lg,
        backgroundColor: tokens.color.softStone,
        height: "100%",
        borderTop: `3px solid ${accent}`,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontFamily: tokens.font.mono,
          fontSize: "11px",
          color: tokens.color.textMuted,
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
          fontFamily: tokens.font.display,
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
        <Typography variant="caption" sx={{ color: tokens.color.textMuted, display: "block", lineHeight: 1.4 }}>
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

  // Il calcolo vive in utils/statistics.ts: e' logica pura, quindi testabile
  // senza montare il modale.
  const q1 = percentileDaIstogramma(stats.distribution_curve, 0.25);
  const q3 = percentileDaIstogramma(stats.distribution_curve, 0.75);
  const iqr = q1 !== null && q3 !== null ? +(q3 - q1).toFixed(1) : null;
  const pct = (v: number | null, suffisso: string) => (v !== null ? `${v}${suffisso}` : "n/d");



  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: tokens.radius.xl,
          backgroundColor: tokens.color.canvas,
          boxShadow: "0 25px 60px rgba(0,0,0,0.12)",
          border: tokens.border.subtle,
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
          borderBottom: tokens.border.subtle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          backgroundColor: tokens.color.canvas,
        }}
      >
        <Box>
          <MonoChip label={`ANALISI STATISTICA • ${detectorLabel.toUpperCase()}`} />
          <Typography
            sx={{
              fontFamily: tokens.font.display,
              fontWeight: 400,
              fontSize: { xs: "24px", md: "36px" },
              color: tokens.color.black,
              letterSpacing: "-0.72px",
              lineHeight: 1.1,
              mt: 1.5,
              mb: 0.5,
            }}
          >
            Statistiche Descrittive Avanzate
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.color.textMuted }}>
            Analisi quantitativa su{" "}
            <strong>{formatNumber(stats.total_analyzed)}</strong> post elaborati · Soglia
            classificazione IA:{" "}
            <strong>≥ 50%</strong>
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: tokens.color.textMuted,
            mt: -0.5,
            borderRadius: tokens.radius.md,
            "&:hover": { backgroundColor: tokens.color.softStone, color: tokens.color.nearBlack },
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
              accent={tokens.color.coral}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              label="Range Probabilità"
              value={`${stats.probability.min}–${stats.probability.max}%`}
              sub={`IQR: ${pct(iqr, "pp")} · Q1 ${pct(q1, "%")} · Q3 ${pct(q3, "%")}`}
              accent={tokens.color.nearBlack}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              label="Lunghezza Media Post"
              value={`${stats.text_length.avg_chars}`}
              sub={`Mediana: ${stats.text_length.median_chars} caratteri · ~${stats.text_length.avg_tokens} token`}
              accent={tokens.color.deepGreen}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              label="Account Bot Presenti"
              value={`${stats.bot_breakdown.bot_percentage}%`}
              sub={`${formatNumber(stats.bot_breakdown.bots)} bot · ${formatNumber(stats.bot_breakdown.humans)} umani`}
              accent={tokens.color.actionBlue}
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
                borderRadius: tokens.radius.lg,
                border: tokens.border.subtle,
                backgroundColor: tokens.color.canvas,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: tokens.font.mono, color: tokens.color.coral, fontWeight: 700, display: "block", mb: 0.5 }}
                  >
                    DISTRIBUZIONE DI PROBABILITÀ
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: tokens.font.display, fontWeight: 600, color: tokens.color.nearBlack }}>
                    Spettro continuo per decile (0–100%)
                  </Typography>
                </Box>
                <MonoChip label={`${stats.distribution_curve.length} FASCE`} color={tokens.color.textMuted} bg={tokens.color.softStone} />
              </Box>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.distribution_curve} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="coralGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={tokens.color.coral} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={tokens.color.coral} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="bucket"
                      stroke={tokens.color.borderStrong}
                      tick={{ fontSize: 11, fill: tokens.color.textMuted, fontFamily: tokens.font.mono }}
                    />
                    <YAxis
                      stroke={tokens.color.borderStrong}
                      tick={{ fontSize: 11, fill: tokens.color.textMuted }}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tokens.color.canvas,
                        border: tokens.border.subtle,
                        borderRadius: tokens.radius.md,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "13px",
                        fontFamily: tokens.font.body,
                      }}
                      formatter={(val) => [
                        `${formatNumber(Number(val || 0))} post`,
                        "Frequenza",
                      ]}
                    />
                    <ReferenceLine x="0.5-0.6" stroke={tokens.color.coral} strokeDasharray="4 3" label={{ value: "Soglia IA", fill: tokens.color.coral, fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={tokens.color.coral}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#coralGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, mt: 1.5, display: "block" }}>
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
                borderRadius: tokens.radius.lg,
                border: tokens.border.subtle,
                backgroundColor: tokens.color.canvas,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontFamily: tokens.font.mono, color: tokens.color.coral, fontWeight: 700, display: "block", mb: 2 }}
              >
                RIEPILOGO QUANTITATIVO
              </Typography>

              {[
                { label: "Media (μ)", value: `${stats.probability.mean}%`, accent: tokens.color.coral },
                { label: "Mediana (M)", value: `${stats.probability.median}%`, accent: tokens.color.nearBlack },
                { label: "Dev. Std (σ)", value: `±${stats.probability.std}%`, accent: tokens.color.textMuted },
                { label: "Minimo", value: `${stats.probability.min}%`, accent: tokens.color.textMuted },
                { label: "Massimo", value: `${stats.probability.max}%`, accent: tokens.color.textMuted },
                { label: "Q1 (da istogramma)", value: pct(q1, "%"), accent: tokens.color.actionBlue },
                { label: "Q3 (da istogramma)", value: pct(q3, "%"), accent: tokens.color.actionBlue },
                { label: "IQR (da istogramma)", value: pct(iqr, "pp"), accent: tokens.color.actionBlue },
                ...(stats.criteria
                  ? [
                      { label: "Criteria medio", value: String(stats.criteria.mean), accent: tokens.color.deepGreen },
                      { label: "Criteria mediano", value: String(stats.criteria.median), accent: tokens.color.deepGreen },
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
                    borderBottom: i < arr.length - 1 ? `1px solid ${tokens.color.cardBorder}` : "none",
                  }}
                >
                  <Typography variant="body2" sx={{ color: tokens.color.textPrimary, fontSize: "13px" }}>
                    {row.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: tokens.font.mono,
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
            <Box sx={{ p: 3.5, borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas, height: "100%" }}>
              <Typography
                variant="caption"
                sx={{ fontFamily: tokens.font.mono, color: tokens.color.actionBlue, fontWeight: 700, display: "block", mb: 2 }}
              >
                LUNGHEZZA DEL TESTO
              </Typography>
              <Grid container spacing={2}>
                {[
                  { label: "Media caratteri", value: formatNumber(stats.text_length.avg_chars) },
                  { label: "Mediana caratteri", value: formatNumber(stats.text_length.median_chars) },
                  { label: "Media token", value: `~${stats.text_length.avg_tokens}` },
                ].map((item) => (
                  <Grid item xs={12} key={item.label}>
                    <Box sx={{ p: 2, borderRadius: tokens.radius.md, backgroundColor: tokens.color.softStone }}>
                      <Typography variant="caption" sx={{ color: tokens.color.textMuted, display: "block", mb: 0.5 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontFamily: tokens.font.display, fontWeight: 400, fontSize: "28px", color: tokens.color.nearBlack, lineHeight: 1 }}>
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
            <Box sx={{ p: 3.5, borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas, height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: tokens.font.mono, color: tokens.color.actionBlue, fontWeight: 700, display: "block", mb: 0.5 }}
                  >
                    CLASSIFICAZIONE PER FASCIA
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: tokens.font.display, fontWeight: 600, color: tokens.color.nearBlack }}>
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
                          fontFamily: tokens.font.mono,
                          fontSize: "11px",
                          color: isAi ? tokens.color.coral : tokens.color.textMuted,
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
                            backgroundColor: tokens.color.softStone,
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: isAi ? tokens.color.coral : tokens.color.nearBlack,
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
                          fontFamily: tokens.font.mono,
                          fontSize: "11px",
                          color: tokens.color.textPrimary,
                          fontWeight: 600,
                        }}
                      >
                        {formatNumber(b.count)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          minWidth: 42,
                          textAlign: "right",
                          fontFamily: tokens.font.mono,
                          fontSize: "11px",
                          color: tokens.color.textMuted,
                        }}
                      >
                        {b.percentage}%
                      </Typography>
                    </Box>
                  );
                })}
              </Box>


            </Box>
          </Grid>
        </Grid>

        {/* ── Bot vs Human ─────────────────────────────── */}
        <Grid container spacing={3} sx={{ mb: 5 }}>

          {/* Bot analysis */}
          <Grid item xs={12} md={5}>
            <Box sx={{ p: 3.5, borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas, height: "100%" }}>
              <Typography
                variant="caption"
                sx={{ fontFamily: tokens.font.mono, color: tokens.color.coral, fontWeight: 700, display: "block", mb: 2 }}
              >
                COMPOSIZIONE ACCOUNT
              </Typography>

              {/* Bot bar */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Account Bot (bot=true)</Typography>
                  <Typography variant="body2" sx={{ fontFamily: tokens.font.mono, fontWeight: 700, color: tokens.color.nearBlack }}>
                    {stats.bot_breakdown.bot_percentage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.bot_breakdown.bot_percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: tokens.color.softStone,
                    "& .MuiLinearProgress-bar": { backgroundColor: tokens.color.nearBlack, borderRadius: 4 },
                  }}
                />
                <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                  {formatNumber(stats.bot_breakdown.bots)} post da account bot
                </Typography>
              </Box>

              {/* Human bar */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Account Umani</Typography>
                  <Typography variant="body2" sx={{ fontFamily: tokens.font.mono, fontWeight: 700, color: tokens.color.actionBlue }}>
                    {(100 - stats.bot_breakdown.bot_percentage).toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={100 - stats.bot_breakdown.bot_percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: tokens.color.softStone,
                    "& .MuiLinearProgress-bar": { backgroundColor: tokens.color.actionBlue, borderRadius: 4 },
                  }}
                />
                <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
                  {formatNumber(stats.bot_breakdown.humans)} post da account umani
                </Typography>
              </Box>

              <Divider sx={{ borderColor: tokens.color.border, mb: 2 }} />

              <Box sx={{ p: 2, borderRadius: tokens.radius.md, backgroundColor: tokens.color.softStone }}>
                <Typography variant="caption" sx={{ fontFamily: tokens.font.mono, color: tokens.color.textMuted, display: "block", mb: 0.5 }}>
                  NOTA METODOLOGICA
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.textPrimary, fontSize: "13px", lineHeight: 1.5 }}>
                  Il campo <code>bot=true</code> è auto-dichiarato dai software client al momento della registrazione
                  su Mastodon. Non implica che il testo sia generato da LLM: molti bot aggregano contenuto umano
                  (news, feed meteo, bollettini automatici).
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Top Domini Bar Chart */}
          <Grid item xs={12} md={7}>
            <Box sx={{ p: 3.5, borderRadius: tokens.radius.lg, border: tokens.border.subtle, backgroundColor: tokens.color.canvas, height: "100%" }}>
              <Typography
                variant="caption"
                sx={{ fontFamily: tokens.font.mono, color: tokens.color.textMuted, fontWeight: 700, display: "block", mb: 0.5 }}
              >
                TOP ISTANZE FEDIVERSO
              </Typography>
              <Typography variant="subtitle1" sx={{ fontFamily: tokens.font.display, fontWeight: 600, color: tokens.color.nearBlack, mb: 2.5 }}>
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
                      stroke={tokens.color.borderStrong}
                      tick={{ fontSize: 10, fill: tokens.color.textMuted }}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                    />
                    <YAxis
                      dataKey="domain"
                      type="category"
                      stroke={tokens.color.borderStrong}
                      tick={{ fontSize: 11, fill: tokens.color.textPrimary }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tokens.color.canvas,
                        border: tokens.border.subtle,
                        borderRadius: tokens.radius.md,
                        fontSize: "13px",
                      }}
                      formatter={(val) => [formatNumber(Number(val)), "Post"]}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {stats.top_domains.slice(0, 8).map((_, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={idx === 0 ? tokens.color.coral : idx === 1 ? tokens.color.nearBlack : tokens.color.softStone}
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
                    <TableCell sx={{ color: tokens.color.textMuted, fontSize: "11px", fontFamily: tokens.font.mono, borderBottom: tokens.border.subtle, py: 0.5 }}>
                      DOMINIO
                    </TableCell>
                    <TableCell align="right" sx={{ color: tokens.color.textMuted, fontSize: "11px", fontFamily: tokens.font.mono, borderBottom: tokens.border.subtle, py: 0.5 }}>
                      POST
                    </TableCell>
                    <TableCell align="right" sx={{ color: tokens.color.textMuted, fontSize: "11px", fontFamily: tokens.font.mono, borderBottom: tokens.border.subtle, py: 0.5 }}>
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
                      <TableRow key={d.domain} sx={{ "&:hover": { backgroundColor: tokens.color.surfaceWarm } }}>
                        <TableCell sx={{ color: tokens.color.textPrimary, fontSize: "12px", borderBottom: `1px solid ${tokens.color.cardBorder}`, py: 0.8 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {idx === 0 && (
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: tokens.color.coral, flexShrink: 0 }} />
                            )}
                            {idx === 1 && (
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: tokens.color.nearBlack, flexShrink: 0 }} />
                            )}
                            {idx > 1 && (
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: tokens.color.borderStrong, flexShrink: 0 }} />
                            )}
                            {d.domain}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: tokens.font.mono, fontSize: "12px", fontWeight: 600, color: tokens.color.nearBlack, borderBottom: `1px solid ${tokens.color.cardBorder}`, py: 0.8 }}>
                          {formatNumber(d.count)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: tokens.font.mono, fontSize: "12px", color: tokens.color.textMuted, borderBottom: `1px solid ${tokens.color.cardBorder}`, py: 0.8 }}>
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
            borderTop: tokens.border.subtle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
            Generato automaticamente · SNM Intelligence · Detector: <strong>{detectorLabel}</strong>
          </Typography>
          <Box
            component="button"
            onClick={onClose}
            sx={{
              background: tokens.color.nearBlack,
              color: tokens.color.canvas,
              border: "none",
              borderRadius: tokens.radius.pill,
              px: 3.5,
              py: 1.2,
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: tokens.font.body,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
              "&:hover": { backgroundColor: tokens.color.nearBlackHover },
            }}
          >
            Chiudi Report
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
