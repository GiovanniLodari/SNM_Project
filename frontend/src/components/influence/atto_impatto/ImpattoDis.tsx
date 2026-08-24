import { useState } from "react";
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Skeleton,
  Typography,
} from "@mui/material";
import {
  useMisinfoTopicsQuery,
  useMisinfoBoostSummaryQuery,
} from "../../../api/queries.ts";
import type { MisinfoGruppoStats } from "../../../api/client.ts";
import { tokens } from "../../../theme.ts";
import { formatNumber } from "../../../utils/format.ts";
import GraficoSpread from "./GraficoSpread.tsx";

const GRUPPI = ["vero_ai", "vero_human", "falso_ai", "falso_human"] as const;

const ETICHETTE: Record<string, { label: string; nota: string }> = {
  vero_ai:    { label: "Vero · AI",    nota: "Post veri generati da IA" },
  vero_human: { label: "Vero · Umano", nota: "Post veri scritti da umani" },
  falso_ai:   { label: "Falso · AI",   nota: "Disinformazione IA" },
  falso_human:{ label: "Falso · Umano",nota: "Disinformazione umana" },
};

/** Scheda KPI per singolo gruppo. */
function SchedaGruppo({
  gruppo,
  mean,
  median,
  std,
  n,
}: {
  gruppo: string;
  mean?: number;
  median?: number;
  std?: number;
  n: number;
}) {
  const { label, nota } = ETICHETTE[gruppo] ?? { label: gruppo, nota: "" };
  const isAi = gruppo.endsWith("_ai");

  return (
    <Box
      sx={{
        flex: "1 1 160px",
        border: tokens.border.subtle,
        borderRadius: tokens.radius.xl,
        p: 2.5,
        backgroundColor: isAi ? tokens.color.surfaceCoral : tokens.color.surfaceBlue,
      }}
    >
      <Typography
        sx={{ fontFamily: tokens.font.mono, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.06em", color: tokens.color.textMuted, mb: 0.5 }}
      >
        {label}
      </Typography>
      <Typography
        sx={{ fontFamily: tokens.font.display, fontSize: 26, fontWeight: 700, color: tokens.color.nearBlack, lineHeight: 1 }}
      >
        {mean != null ? mean.toFixed(1) : "—"}
      </Typography>
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted, mt: 0.25 }}>
        spread medio (nodi)
      </Typography>
      {median != null && (
        <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted }}>
          mediana {median.toFixed(1)} · ±{std?.toFixed(1) ?? "—"}
        </Typography>
      )}
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted, mt: 0.5 }}>
        {formatNumber(n)} post
      </Typography>
      <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted }}>
        {nota}
      </Typography>
    </Box>
  );
}

/**
 * Atto IV: Impatto della disinformazione.
 *
 * Risponde a: il contenuto AI si diffonde più di quello umano? Il falso più del vero?
 * Un menù a tendina filtra per topic (autore dominante); default = tutti i topic aggregati.
 */
export default function ImpattoDis() {
  const [topic, setTopic] = useState("generale");

  const { data: topicsData } = useMisinfoTopicsQuery();
  const { data: boostData, isLoading, isError } = useMisinfoBoostSummaryQuery(topic);

  const topics = topicsData?.topics ?? ["generale"];

  // Trasforma boost osservati nel formato atteso da GraficoSpread.
  const groupsForChart: Record<string, MisinfoGruppoStats> = {};
  if (boostData && boostData.groups) {
    for (const [g, s] of Object.entries(boostData.groups)) {
      if (s && s.n > 0 && typeof s.mean === "number") {
        groupsForChart[g] = {
          n: s.n,
          mean: s.mean,
          median: s.median ?? s.mean,
          std: s.std ?? 0,
        };
      }
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Selettore topic */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.06em", color: tokens.color.textMuted }}>
          Filtra per topic
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            sx={{ fontFamily: tokens.font.mono, fontSize: 13,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.color.border },
              borderRadius: tokens.radius.md,
            }}
          >
            {topics.map((t) => (
              <MenuItem key={t} value={t} sx={{ fontFamily: tokens.font.mono, fontSize: 13 }}>
                {t === "generale" ? "Generale (tutti i topic)" : t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {topic !== "generale" && (
          <Typography
            component="span"
            onClick={() => setTopic("generale")}
            sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.coral,
              cursor: "pointer", textDecoration: "underline" }}
          >
            Rimuovi filtro
          </Typography>
        )}
      </Box>


      {/* Grafico comparativo */}
      <Box sx={{ border: tokens.border.subtle, borderRadius: tokens.radius.xl, p: 3, backgroundColor: tokens.color.canvas }}>
        <Typography sx={{ fontFamily: tokens.font.display, fontWeight: 700, fontSize: 16,
          color: tokens.color.nearBlack, mb: 0.5 }}>
          Capacità di diffusione per gruppo
        </Typography>
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.textMuted, mb: 2.5, maxWidth: "80ch" }}>
          Boost <strong>effettivamente osservati</strong> per post nel dataset (non simulati).
          Ogni barra mostra la media dei boost ricevuti dai post del gruppo, inclusi i post con zero boost.
          Le linee di errore indicano la deviazione standard.
        </Typography>

        {isLoading && (
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: tokens.radius.md }} />
        )}
        {isError && (
          <Typography sx={{ color: tokens.color.textMuted, fontFamily: tokens.font.mono, fontSize: 12 }}>
            Dati boost non disponibili.
          </Typography>
        )}
        {boostData && <GraficoSpread groups={groupsForChart} />}
      </Box>

      {/* KPI cards — boost osservati */}
      {boostData && boostData.groups && (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {GRUPPI.map((g) => {
            const s = boostData.groups[g];
            if (!s || s.n === 0 || typeof s.mean !== "number") return null;
            return (
              <SchedaGruppo
                key={g}
                gruppo={g}
                mean={s.mean}
                median={s.median}
                std={s.std}
                n={s.n}
              />
            );
          })}
        </Box>
      )}

      {/* Lettura dei risultati */}
      {boostData && !isLoading && (
        <Box sx={{ border: tokens.border.subtle, borderRadius: tokens.radius.xl, p: 3,
          backgroundColor: tokens.color.surfaceWarm }}>
          <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em", color: tokens.color.textMuted, mb: 1 }}>
            Come leggere i risultati
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {[
              "AI vs umano: confronta le barre coral con quelle blu all'interno della stessa veracity.",
              "Vero vs falso: confronta tinta chiara (vero) con tinta scura (falso) nello stesso tipo di autore.",
              "La media include i post con zero boost — rappresenta la diffusione reale, non solo i post virali.",
              "n = numero di post del gruppo nel dataset (inclusi quelli mai boostati).",
            ].map((t) => (
              <Box key={t} component="li" sx={{ mb: 0.5 }}>
                <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.textMuted }}>
                  {t}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

    </Box>
  );
}
