import { useState } from "react";
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { usePropagatoriQuery, useMisinfoTopicsQuery } from "../../../api/queries.ts";
import type { PropagatoreSeed } from "../../../api/client.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";
import PropagatorDrawer from "../PropagatorDrawer.tsx";

const N_OPTIONS = [10, 20, 50] as const;

type Veracity = "info" | "disinfo";
type Tipo = "generale" | "ai" | "human";

function groupKey(veracity: Veracity, tipo: Tipo): string {
  if (tipo === "generale") return veracity === "info" ? "info" : "disinfo";
  if (veracity === "info") return tipo === "ai" ? "vero_ai" : "vero_human";
  return tipo === "ai" ? "falso_ai" : "falso_human";
}

const PROFILO_LABEL: Record<string, string> = {
  ai: "IA",
  human: "Umano",
  misto: "Misto",
  unknown: "?",
};

function RigaSeed({
  seed,
  onSelect,
}: {
  seed: PropagatoreSeed;
  onSelect: (seed: PropagatoreSeed) => void;
}) {
  return (
    <Box
      onClick={() => onSelect(seed)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 1,
        px: 1,
        cursor: "pointer",
        "&:hover": { backgroundColor: tokens.color.surfaceStone },
        borderBottom: `1px solid ${tokens.color.border}`,
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Typography
        sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted, minWidth: 24, textAlign: "right", flexShrink: 0 }}
      >
        {seed.rank}
      </Typography>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontFamily: tokens.font.mono, fontSize: 13, color: tokens.color.nearBlack, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={seed.acct}
        >
          {seed.acct}
          <Typography component="span" sx={{ fontFamily: tokens.font.mono, fontSize: 13, color: tokens.color.textMuted }}>
            {" — "}{PROFILO_LABEL[seed.profilo] ?? seed.profilo}
          </Typography>
          {seed.bot && (
            <Typography component="span" sx={{ fontFamily: tokens.font.mono, fontSize: 13, color: tokens.color.nearBlack, fontWeight: 700 }}>
              {" — "}bot
            </Typography>
          )}
        </Typography>
        <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.textMuted }}>
          {formatNumber(seed.followers)} follower
        </Typography>
      </Box>
    </Box>
  );
}

export default function Propagatori() {
  const [topic, setTopic] = useState("generale");
  const [veracity, setVeracity] = useState<Veracity>("info");
  const [tipo, setTipo] = useState<Tipo>("generale");
  const [n, setN] = useState<number>(20);
  const [drawerSeed, setDrawerSeed] = useState<PropagatoreSeed | null>(null);

  const { data: topicsData } = useMisinfoTopicsQuery();
  const { data, isLoading, isError } = usePropagatoriQuery();

  const topics = topicsData?.topics ?? ["generale"];
  const key = groupKey(veracity, tipo);
  const group = data?.topics[topic]?.[key];
  const seeds = group?.seeds.slice(0, n) ?? [];

  // Conteggi calcolati sui seed visibili (top-N correntemente mostrati)
  const aiCount = seeds.filter((s) => s.profilo === "ai").length;
  const humanCount = seeds.filter((s) => s.profilo === "human").length;
  const botAiCount = seeds.filter((s) => s.bot && s.profilo === "ai").length;
  const botHumanCount = seeds.filter((s) => s.bot && s.profilo === "human").length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography
          sx={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em", color: tokens.color.textMuted, mb: 0.5 }}
        >
          Propagatori ottimali
        </Typography>
        <Typography
          sx={{ fontFamily: tokens.font.display, fontWeight: 700, fontSize: 20, color: tokens.color.nearBlack, mb: 0.5 }}
        >
          Chi diffonde di più?
        </Typography>
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted, maxWidth: "80ch" }}>
          Seed selezionati con RIS-greedy (74 000 RR-set, ε=0,05, garanzia Chernoff).
          Il rank riflette il contributo marginale alla copertura — i seed in cima raggiungono più nodi distinti.
        </Typography>
      </Box>

      {/* Tre dropdown + selettore N */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            sx={{ fontFamily: tokens.font.mono, fontSize: 13,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.color.border },
              borderRadius: tokens.radius.md }}
          >
            {topics.map((t) => (
              <MenuItem key={t} value={t} sx={{ fontFamily: tokens.font.mono, fontSize: 13 }}>
                {t === "generale" ? "Tutti i topic" : t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={veracity}
            onChange={(e) => setVeracity(e.target.value as Veracity)}
            sx={{ fontFamily: tokens.font.mono, fontSize: 13,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.color.border },
              borderRadius: tokens.radius.md }}
          >
            <MenuItem value="info" sx={{ fontFamily: tokens.font.mono, fontSize: 13 }}>Informazione</MenuItem>
            <MenuItem value="disinfo" sx={{ fontFamily: tokens.font.mono, fontSize: 13 }}>Disinformazione</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Tipo)}
            sx={{ fontFamily: tokens.font.mono, fontSize: 13,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.color.border },
              borderRadius: tokens.radius.md }}
          >
            <MenuItem value="generale" sx={{ fontFamily: tokens.font.mono, fontSize: 13 }}>Generale</MenuItem>
            <MenuItem value="ai" sx={{ fontFamily: tokens.font.mono, fontSize: 13 }}>IA</MenuItem>
            <MenuItem value="human" sx={{ fontFamily: tokens.font.mono, fontSize: 13 }}>Umano</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.06em", color: tokens.color.textMuted }}>
            Top
          </Typography>
          <ToggleButtonGroup
            value={n}
            exclusive
            onChange={(_, v) => v !== null && setN(v)}
            size="small"
            sx={{ "& .MuiToggleButton-root": { fontFamily: tokens.font.mono, fontSize: 12, px: 1.5, py: 0.4 } }}
          >
            {N_OPTIONS.map((opt) => (
              <ToggleButton key={opt} value={opt}>{opt}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* KPI — composizione dei top-N seed visibili */}
      {group && (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
          {[
            { label: "Candidati nel pool", value: group.n_candidates, coral: false },
            { label: "IA (nei top-" + n + ")", value: aiCount, coral: true },
            { label: "Umani (nei top-" + n + ")", value: humanCount, coral: false },
            { label: "Bot tra IA", value: botAiCount, coral: true },
            { label: "Bot tra umani", value: botHumanCount, coral: true },
          ].map(({ label, value, coral }) => (
            <Box key={label} sx={{ textAlign: "center" }}>
              <Typography sx={{ fontFamily: tokens.font.display, fontSize: 22, fontWeight: 700,
                color: coral ? tokens.color.coralInk : tokens.color.nearBlack, lineHeight: 1 }}>
                {value}
              </Typography>
              <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.textMuted }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Lista seed */}
      {isLoading && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: tokens.radius.md }} />
          ))}
        </Box>
      )}

      {isError && (
        <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.textMuted }}>
          Dati propagatori non disponibili.
        </Typography>
      )}

      {data && seeds.length === 0 && (
        <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.textMuted }}>
          Nessun propagatore trovato per questa combinazione.
        </Typography>
      )}

      {seeds.length > 0 && (
        <Box sx={{ border: tokens.border.subtle, borderRadius: tokens.radius.xl, overflow: "hidden" }}>
          {seeds.map((s) => (
            <RigaSeed key={s.acct + s.rank} seed={s} onSelect={setDrawerSeed} />
          ))}
        </Box>
      )}

      <PropagatorDrawer
        seed={drawerSeed}
        topic={topic}
        veracity={veracity}
        tipo={tipo}
        onClose={() => setDrawerSeed(null)}
      />
    </Box>
  );
}
