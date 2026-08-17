import React from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Slider,
  Tooltip,
  Paper,
  Stack,
  Autocomplete,
  TextField,
  InputAdornment,
  CircularProgress,
  Select,
  MenuItem,
} from "@mui/material";
import {
  PlayArrow,
  Pause,
  SkipNext,
  RestartAlt,
  Speed,
  SmartToy as BotIcon,
  Person as HumanIcon,
  Search as SearchIcon,
  Public as PublicIcon,
} from "@mui/icons-material";
import { AccountSearchResult } from "../../api/client.ts";
import { tokens } from "../../theme.ts";

interface GraphToolbarProps {
  graphMode: string;
  onGraphModeChange: (mode: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: AccountSearchResult[];
  searchLoading: boolean;
  selectedSearchAccount: AccountSearchResult | null;
  onSelectSearchedAccount: (account: AccountSearchResult | null) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepIncrement: () => void;
  onResetGraph: () => void;
  visibleCount: number;
  totalNodesCount: number;
  onVisibleCountChange: (count: number) => void;
  speedMultiplier: number;
  onSpeedMultiplierChange: (mult: number) => void;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  graphMode,
  onGraphModeChange,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searchLoading,
  selectedSearchAccount,
  onSelectSearchedAccount,
  isPlaying,
  onTogglePlay,
  onStepIncrement,
  onResetGraph,
  visibleCount,
  totalNodesCount,
  onVisibleCountChange,
  speedMultiplier,
  onSpeedMultiplierChange,
}) => {
  return (
    <>
      {/* Top Header Row with Search Input & Mode Selector */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
          mb: 3,
          position: "relative",
          zIndex: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h3"
            sx={{
              fontFamily: tokens.font.display,
              fontWeight: 500,
              fontSize: { xs: "28px", md: "38px" },
              letterSpacing: "-1px",
              lineHeight: 1.1,
              color: tokens.color.canvas,
            }}
          >
            Rete dei follow
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: tokens.color.darkSlate, mt: 1, maxWidth: "58ch" }}
          >
            Cerca un account per isolarne le connessioni, oppure lascia scorrere la rivelazione
            progressiva dei nodi.
          </Typography>
        </Box>

        {/* Graph Mode Dropdown */}
        <Select
          value={graphMode}
          onChange={(e) => onGraphModeChange(e.target.value as string)}
          size="small"
          sx={{
            minWidth: 150,
            borderRadius: tokens.radius.pill,
            // Fondo pieno invece di semitrasparente + `backdrop-filter`: il
            // vetro smerigliato e' bandito da DESIGN.md, e su un canvas che
            // ridisegna a ogni frame costringeva il browser a ricomporre la
            // sfocatura di continuo.
            backgroundColor: tokens.color.darkSurface,
            color: tokens.color.canvas,
            fontSize: "13px",
            fontWeight: 600,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            "& .MuiSelect-icon": { color: tokens.color.darkSlate },
            "&:hover": { borderColor: "rgba(255, 255, 255, 0.4)" },
            // Nessun trattamento di focus locale: l'anello dichiarato una volta
            // in `MuiCssBaseline` vale anche qui. Il glow ciano che c'era prima
            // era un secondo linguaggio di focus sulla stessa applicazione.
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: tokens.color.darkSurface,
                color: tokens.color.canvas,
                borderRadius: tokens.radius.lg,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                mt: 1,
              },
            },
          }}
        >
          <MenuItem value="all">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PublicIcon sx={{ fontSize: 16 }} /> Tutti gli account
            </Box>
          </MenuItem>
          <MenuItem value="bot">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BotIcon sx={{ fontSize: 16 }} /> Solo dichiarati bot
            </Box>
          </MenuItem>
          <MenuItem value="human">
            {/* "Non dichiarati bot" e non "Solo utenti": il campo `bot` del
                profilo e' auto-dichiarato, quindi la sua assenza non certifica
                che dietro l'account ci sia una persona. */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <HumanIcon sx={{ fontSize: 16 }} /> Solo non dichiarati bot
            </Box>
          </MenuItem>
        </Select>

        {/* Account Search Autocomplete Bar */}
        <Box sx={{ width: { xs: "100%", md: "340px" } }}>
          <Autocomplete
            options={searchResults}
            getOptionLabel={(option) => option.acct}
            loading={searchLoading}
            value={selectedSearchAccount}
            inputValue={searchQuery}
            onInputChange={(_, newInputValue) => onSearchQueryChange(newInputValue)}
            onChange={(_, newValue) => onSelectSearchedAccount(newValue)}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  p: 1.5,
                  borderRadius: tokens.radius.md,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.08)" },
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.color.canvas }}>
                    {option.acct}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.color.darkSlate }}>
                    Dominio: {option.domain}
                  </Typography>
                </Box>
                {option.bot && (
                  <Chip
                    icon={<BotIcon sx={{ fontSize: "12px !important", color: `${tokens.color.nearBlack} !important` }} />}
                    label="BOT"
                    size="small"
                    sx={{ backgroundColor: tokens.color.graphBot, color: tokens.color.nearBlack, fontSize: "9px", fontWeight: 700 }}
                  />
                )}
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Cerca un account per isolarne la rete"
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: tokens.color.darkSlate }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <>
                      {searchLoading ? <CircularProgress color="inherit" size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: tokens.radius.pill,
                    backgroundColor: tokens.color.darkSurface,
                    color: tokens.color.canvas,
                    fontSize: "13px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    "&:hover": {
                      borderColor: "rgba(255, 255, 255, 0.4)",
                    },
                  },
                }}
              />
            )}
            PaperComponent={(props) => (
              <Paper
                {...props}
                elevation={0}
                sx={{
                  backgroundColor: tokens.color.darkSurface,
                  color: tokens.color.canvas,
                  borderRadius: tokens.radius.lg,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  mt: 1,
                }}
              />
            )}
          />
        </Box>
      </Box>

      {/* Incremental Rendering Control Bar */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          borderRadius: tokens.radius.lg,
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {/*
            `describeChild` non e' un dettaglio: senza, il Tooltip di MUI
            scrive il proprio titolo come `aria-label` del figlio e **sostituisce**
            il nome accessibile del bottone. Il risultato era che a schermo si
            leggeva "Avvia" e lo screen reader annunciava un'altra frase - il
            nome accessibile non conteneva l'etichetta visibile, che e' quanto
            WCAG 2.5.3 (Label in Name) vieta, e che rende inutilizzabile il
            comando vocale ("clicca Avvia" non trova nulla).
            Con `describeChild` il titolo diventa una descrizione aggiuntiva e
            il nome resta il testo del bottone.
          */}
          <Tooltip describeChild title={isPlaying ? "Metti in pausa la rivelazione" : "Riprendi la rivelazione progressiva"}>
            {/*
              Il comando non cambia tinta fra i due stati, e non e' una svista.
              Prima era coral quando in riproduzione e verde quando in pausa:
              due tinte che in questo sistema significano gia' "account
              dichiarato bot" e "stato positivo", prese in prestito per dire
              "play" e "pausa". Sulla stessa superficie in cui coral marca i
              nodi bot, un bottone coral che vuol dire "pausa" rende la legenda
              ambigua. Lo stato lo dicono l'icona e l'etichetta, che e' il loro
              mestiere.
            */}
            <Button
              variant="contained"
              onClick={onTogglePlay}
              startIcon={isPlaying ? <Pause /> : <PlayArrow />}
              sx={{
                borderRadius: tokens.radius.pill,
                backgroundColor: tokens.color.canvas,
                color: tokens.color.nearBlack,
                fontWeight: 600,
                px: 2.5,
                "&:hover": {
                  backgroundColor: tokens.color.softStone,
                },
              }}
            >
              {isPlaying ? "Pausa" : "Avvia"}
            </Button>
          </Tooltip>

          <Tooltip describeChild title="Mostra tre account in piu'">
            <Button
              variant="outlined"
              onClick={onStepIncrement}
              disabled={visibleCount >= totalNodesCount}
              startIcon={<SkipNext />}
              sx={{
                borderRadius: tokens.radius.pill,
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: tokens.color.canvas,
                "&:hover": { borderColor: "rgba(255, 255, 255, 0.5)", backgroundColor: "rgba(255, 255, 255, 0.08)" },
              }}
            >
              +3 account
            </Button>
          </Tooltip>

          {/* Stesso testo dell'`aria-label` qui sotto: il bottone non ha
              etichetta visibile, quindi il suggerimento e' l'unica cosa che
              chi vede legge, e deve coincidere con cio' che viene annunciato. */}
          <Tooltip title="Ricarica il grafo da capo">
            <IconButton
              onClick={onResetGraph}
              aria-label="Ricarica il grafo da capo"
              sx={{
                color: tokens.color.darkSlate,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                "&:hover": { color: tokens.color.canvas, backgroundColor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              <RestartAlt />
            </IconButton>
          </Tooltip>
        </Stack>

        <Box sx={{ flex: 1, width: "100%", px: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: tokens.color.darkSlate, fontFamily: tokens.font.mono }}>
              RIVELAZIONE PROGRESSIVA
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.color.canvas, fontWeight: 700, fontFamily: tokens.font.mono }}>
              {visibleCount} / {totalNodesCount} account
            </Typography>
          </Box>
          <Slider
            value={visibleCount}
            min={2}
            max={totalNodesCount || 20}
            step={1}
            onChange={(_, val) => onVisibleCountChange(val as number)}
            aria-label="Quanti account mostrare nel grafo"
            sx={{
              color: tokens.color.canvas,
              height: 6,
              "& .MuiSlider-thumb": {
                width: 14,
                height: 14,
                backgroundColor: tokens.color.canvas,
              },
              "& .MuiSlider-track": {
                backgroundColor: tokens.color.canvas,
              },
              "& .MuiSlider-rail": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          />
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Speed sx={{ color: tokens.color.darkSlateDeep, fontSize: "18px", mr: 0.5 }} />
          {[1, 2, 4].map((mult) => (
            <Chip
              key={mult}
              label={`${mult}x`}
              size="small"
              onClick={() => onSpeedMultiplierChange(mult)}
              aria-pressed={speedMultiplier === mult}
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: speedMultiplier === mult ? tokens.color.canvas : "rgba(255, 255, 255, 0.06)",
                color: speedMultiplier === mult ? tokens.color.nearBlack : tokens.color.darkSlate,
                "&:hover": { backgroundColor: speedMultiplier === mult ? tokens.color.softStone : "rgba(255, 255, 255, 0.15)" },
              }}
            />
          ))}
        </Stack>
      </Box>
    </>
  );
};
