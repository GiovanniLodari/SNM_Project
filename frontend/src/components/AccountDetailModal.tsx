import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  Button,
  Avatar,
  Divider,
  Slide,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import React from "react";
import {
  Close as CloseIcon,
  SmartToy as BotIcon,
  Person as HumanIcon,
} from "@mui/icons-material";
import { AccountDetail } from "../api/client.ts";
import { tokens } from "../theme.ts";
import { formatDate, formatNumber } from "../utils/format.ts";

interface AccountDetailModalProps {
  open: boolean;
  onClose: () => void;
  account: AccountDetail | null;
  loading?: boolean;
  error?: string | null;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function AccountDetailModal({
  open,
  onClose,
  account,
  loading = false,
  error = null,
}: AccountDetailModalProps) {
  if (!account && !loading && !error) return null;

  if (error) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Transition}
        keepMounted
        PaperProps={{
          sx: {
            borderRadius: tokens.radius.xl,
            backgroundColor: tokens.color.nearBlack,
            color: tokens.color.canvas,
            backgroundImage: "none",
            boxShadow: "none",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          },
        }}
      >
        <DialogContent sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ fontSize: "1rem", fontWeight: 600, mb: 1 }}>
            Dettagli non disponibili
          </Typography>
          <Typography sx={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.6)", mb: 3 }}>
            {error}
          </Typography>
          <Button onClick={onClose} variant="outlined" sx={{ color: tokens.color.canvas, borderColor: "rgba(255,255,255,0.25)" }}>
            Chiudi
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Clean HTML tags from note/bio
  const cleanNote = (htmlStr?: string | null) => {
    if (!htmlStr) return "Nessuna descrizione del profilo presente.";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = htmlStr;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          borderRadius: tokens.radius.xl,
          backgroundColor: tokens.color.nearBlack,
          color: tokens.color.canvas,
          backgroundImage: "none",
          boxShadow: "none",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          overflow: "visible",
        },
      }}
    >
      {/* Header Banner or Fallback Ambient Field */}
      <Box
        sx={{
          height: 120,
          width: "100%",
          backgroundColor: "#071829",
          backgroundImage: account?.header ? `url(${account.header})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(8px)",
            color: tokens.color.canvas,
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 4, pt: 0, position: "relative", overflow: "visible" }}>
        {/* Avatar positioned overlapping banner */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            mt: "-44px",
            mb: 2,
          }}
        >
          <Avatar
            src={account?.avatar || undefined}
            sx={{
              width: 84,
              height: 84,
              border: `4px solid ${tokens.color.nearBlack}`,
              backgroundColor: account?.bot ? tokens.color.coral : tokens.color.actionBlue,
              fontSize: "32px",
              fontWeight: 400,
              fontFamily: tokens.font.display,
            }}
          >
            {account?.display_name ? account.display_name[0].toUpperCase() : "?"}
          </Avatar>

          {/* Account Category Badge */}
          {account?.bot ? (
            <Chip
              icon={<BotIcon sx={{ fontSize: "14px !important", color: `${tokens.color.nearBlack} !important` }} />}
              label="BOT ACCOUNT"
              sx={{
                backgroundColor: tokens.color.coral,
                color: tokens.color.nearBlack,
                fontWeight: 500,
                fontSize: "12px",
                fontFamily: tokens.font.mono,
                borderRadius: tokens.radius.chip,
              }}
            />
          ) : (
            <Chip
              icon={<HumanIcon sx={{ fontSize: "14px !important", color: `${tokens.color.canvas} !important` }} />}
              label="HUMAN USER"
              sx={{
                backgroundColor: tokens.color.actionBlue,
                color: tokens.color.canvas,
                fontWeight: 500,
                fontSize: "12px",
                fontFamily: tokens.font.mono,
                borderRadius: tokens.radius.chip,
              }}
            />
          )}
        </Box>

        {/* User Handle & Display Name */}
        <Typography
          variant="h4"
          sx={{
            fontFamily: tokens.font.display,
            fontWeight: 400,
            fontSize: "32px",
            color: tokens.color.canvas,
            lineHeight: 1.2,
            letterSpacing: "-0.32px",
          }}
        >
          {account?.display_name || account?.username || "Utente Fediverse"}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, mb: 3 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: tokens.font.mono,
              color: tokens.color.textFaint,
              fontSize: "14px",
              wordBreak: "break-all",
            }}
          >
            {account?.acct || "@account"}
          </Typography>

          <Chip
            label={account?.domain || "fediverse"}
            size="small"
            sx={{
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: tokens.color.textFaint,
              fontSize: "12px",
              fontFamily: tokens.font.mono,
              borderRadius: tokens.radius.chip,
            }}
          />
        </Stack>

        {/* Social Metrics Grid (Followers, Following, Statuses) */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: tokens.radius.sm,
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
            }}
          >
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, textTransform: "uppercase", fontSize: "12px", fontFamily: tokens.font.mono }}>
                FOLLOWER
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 400, color: tokens.color.canvas, fontSize: "24px" }}>
              {formatNumber((account?.followers_count ?? 0))}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: tokens.radius.sm,
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
            }}
          >
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, textTransform: "uppercase", fontSize: "12px", fontFamily: tokens.font.mono }}>
                SEGUITI
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 400, color: tokens.color.canvas, fontSize: "24px" }}>
              {formatNumber((account?.following_count ?? 0))}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: tokens.radius.sm,
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
            }}
          >
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: tokens.color.textMuted, textTransform: "uppercase", fontSize: "12px", fontFamily: tokens.font.mono }}>
                POST
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 400, color: tokens.color.canvas, fontSize: "24px" }}>
              {formatNumber((account?.statuses_count ?? 0))}
            </Typography>
          </Box>
        </Stack>

        {/* Bio / Description Note */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="caption" sx={{ color: tokens.color.textFaint, textTransform: "uppercase", fontSize: "12px", display: "block", mb: 1, fontFamily: tokens.font.mono }}>
            BIOGRAFIA & PROFILO
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: tokens.color.canvas,
              fontSize: "16px",
              lineHeight: 1.5,
              fontFamily: tokens.font.body,
            }}
          >
            {cleanNote(account?.note)}
          </Typography>
        </Box>

        {/* Registration & Activity Dates */}
        {account?.created_at && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ color: tokens.color.textFaint, fontFamily: tokens.font.mono, fontSize: "12px" }}>
              Registrato il: <strong style={{ color: tokens.color.canvas }}>{formatDate(account.created_at)}</strong>
            </Typography>
          </Stack>
        )}

        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 2 }} />

        {/* External Mastodon Profile Button */}
        {account?.url && (
          <Button
            component="a"
            href={account.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            fullWidth
            disableElevation
            sx={{
              borderRadius: tokens.radius.pill,
              backgroundColor: tokens.color.canvas,
              color: tokens.color.nearBlack,
              fontWeight: 500,
              fontSize: "14px",
              fontFamily: tokens.font.body,
              py: 1.5,
              "&:hover": {
                backgroundColor: tokens.color.border,
              },
            }}
          >
            Apri Profilo su Mastodon
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
