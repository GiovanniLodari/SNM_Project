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
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(8px)",
            color: tokens.color.canvas,
            fontSize: "13px",
            fontWeight: 600,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            "& .MuiSelect-icon": { color: tokens.color.darkSlate },
            "&:hover": { borderColor: tokens.color.accentCyan },
            "&.Mui-focused": {
              borderColor: tokens.color.accentCyan,
              boxShadow: "0 0 12px rgba(0, 229, 255, 0.3)",
            },
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
              <BotIcon sx={{ fontSize: 16 }} /> Solo Bot
            </Box>
          </MenuItem>
          <MenuItem value="human">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <HumanIcon sx={{ fontSize: 16 }} /> Solo Utenti
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
                  "&:hover": { backgroundColor: "rgba(0, 229, 255, 0.15)" },
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.color.canvas }}>
                    {option.acct}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.color.darkSlate }}>
                    Domain: {option.domain}
                  </Typography>
                </Box>
                {option.bot && (
                  <Chip
                    icon={<BotIcon sx={{ fontSize: "12px !important", color: `${tokens.color.canvas} !important` }} />}
                    label="BOT"
                    size="small"
                    sx={{ backgroundColor: tokens.color.coral, color: tokens.color.canvas, fontSize: "9px", fontWeight: 700 }}
                  />
                )}
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Cerca Utente per rete follower..."
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: tokens.color.accentCyan }} />
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
                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                    backdropFilter: "blur(8px)",
                    color: tokens.color.canvas,
                    fontSize: "13px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    "&:hover": {
                      borderColor: tokens.color.accentCyan,
                    },
                    "&.Mui-focused": {
                      borderColor: tokens.color.accentCyan,
                      boxShadow: "0 0 12px rgba(0, 229, 255, 0.3)",
                    },
                  },
                }}
              />
            )}
            PaperComponent={(props) => (
              <Paper
                {...props}
                elevation={8}
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
          borderRadius: "20px",
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
          <Tooltip title={isPlaying ? "Pausa Streaming" : "Avvia Streaming Progressivo"}>
            <Button
              variant="contained"
              onClick={onTogglePlay}
              startIcon={isPlaying ? <Pause /> : <PlayArrow />}
              sx={{
                borderRadius: "24px",
                backgroundColor: isPlaying ? tokens.color.coral : tokens.color.success,
                color: tokens.color.canvas,
                fontWeight: 600,
                px: 2.5,
                "&:hover": {
                  backgroundColor: isPlaying ? tokens.color.coralDark : tokens.color.successDark,
                },
              }}
            >
              {isPlaying ? "PAUSE STREAM" : "PLAY STREAM"}
            </Button>
          </Tooltip>

          <Tooltip title="Aggiungi +3 Nodi Ora">
            <Button
              variant="outlined"
              onClick={onStepIncrement}
              disabled={visibleCount >= totalNodesCount}
              startIcon={<SkipNext />}
              sx={{
                borderRadius: "24px",
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: tokens.color.canvas,
                "&:hover": { borderColor: tokens.color.accentCyan, backgroundColor: "rgba(0, 229, 255, 0.1)" },
              }}
            >
              STEP (+3)
            </Button>
          </Tooltip>

          <Tooltip title="Resetta Grafo al Network Iniziale">
            <IconButton
              onClick={onResetGraph}
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
              RENDER PROGRESSION ("POCHI NODI ALLA VOLTA")
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.color.accentCyan, fontWeight: 700, fontFamily: tokens.font.mono }}>
              {visibleCount} / {totalNodesCount} Nodes
            </Typography>
          </Box>
          <Slider
            value={visibleCount}
            min={2}
            max={totalNodesCount || 20}
            step={1}
            onChange={(_, val) => onVisibleCountChange(val as number)}
            sx={{
              color: tokens.color.accentCyan,
              height: 6,
              "& .MuiSlider-thumb": {
                width: 14,
                height: 14,
                backgroundColor: tokens.color.canvas,
                boxShadow: `0 0 10px ${tokens.color.accentCyan}`,
              },
              "& .MuiSlider-track": {
                backgroundColor: tokens.color.accentCyan,
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
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: speedMultiplier === mult ? tokens.color.accentCyan : "rgba(255, 255, 255, 0.06)",
                color: speedMultiplier === mult ? tokens.color.black : tokens.color.darkSlate,
                "&:hover": { backgroundColor: speedMultiplier === mult ? tokens.color.accentCyan : "rgba(255, 255, 255, 0.15)" },
              }}
            />
          ))}
        </Stack>
      </Box>
    </>
  );
};
