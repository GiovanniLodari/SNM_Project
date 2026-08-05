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
  Launch as LaunchIcon,
  CalendarToday as CalendarIcon,
  Article as PostsIcon,
  Group as FollowersIcon,
  PersonAdd as FollowingIcon,
} from "@mui/icons-material";
import { AccountDetail } from "../api/client.ts";

interface AccountDetailModalProps {
  open: boolean;
  onClose: () => void;
  account: AccountDetail | null;
  loading?: boolean;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
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
}: AccountDetailModalProps) {
  if (!account && !loading) return null;

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
          borderRadius: "22px",
          backgroundColor: "#17171c",
          color: "#ffffff",
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
            color: "#ffffff",
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
            justify: "space-between",
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
              border: "4px solid #17171c",
              backgroundColor: account?.bot ? "#ff7759" : "#1863dc",
              fontSize: "32px",
              fontWeight: 400,
              fontFamily: "Space Grotesk, Inter, sans-serif",
            }}
          >
            {account?.display_name ? account.display_name[0].toUpperCase() : "?"}
          </Avatar>

          {/* Account Category Badge */}
          {account?.bot ? (
            <Chip
              icon={<BotIcon sx={{ fontSize: "14px !important", color: "#17171c !important" }} />}
              label="BOT ACCOUNT"
              sx={{
                backgroundColor: "#ff7759",
                color: "#17171c",
                fontWeight: 500,
                fontSize: "12px",
                fontFamily: "ui-monospace, monospace",
                borderRadius: "30px",
              }}
            />
          ) : (
            <Chip
              icon={<HumanIcon sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
              label="HUMAN USER"
              sx={{
                backgroundColor: "#1863dc",
                color: "#ffffff",
                fontWeight: 500,
                fontSize: "12px",
                fontFamily: "ui-monospace, monospace",
                borderRadius: "30px",
              }}
            />
          )}
        </Box>

        {/* User Handle & Display Name */}
        <Typography
          variant="h4"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 400,
            fontSize: "32px",
            color: "#ffffff",
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
              fontFamily: "ui-monospace, monospace",
              color: "#93939f",
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
              color: "#93939f",
              fontSize: "12px",
              fontFamily: "ui-monospace, monospace",
              borderRadius: "30px",
            }}
          />
        </Stack>

        {/* Social Metrics Grid (Followers, Following, Statuses) */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: "8px",
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
            }}
          >
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#75758a", textTransform: "uppercase", fontSize: "12px", fontFamily: "ui-monospace, monospace" }}>
                FOLLOWER
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: "Space Grotesk, Inter, sans-serif", fontWeight: 400, color: "#ffffff", fontSize: "24px" }}>
              {(account?.followers_count ?? 0).toLocaleString()}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: "8px",
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
            }}
          >
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#75758a", textTransform: "uppercase", fontSize: "12px", fontFamily: "ui-monospace, monospace" }}>
                SEGUITI
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: "Space Grotesk, Inter, sans-serif", fontWeight: 400, color: "#ffffff", fontSize: "24px" }}>
              {(account?.following_count ?? 0).toLocaleString()}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: "8px",
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
            }}
          >
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#75758a", textTransform: "uppercase", fontSize: "12px", fontFamily: "ui-monospace, monospace" }}>
                POST
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: "Space Grotesk, Inter, sans-serif", fontWeight: 400, color: "#ffffff", fontSize: "24px" }}>
              {(account?.statuses_count ?? 0).toLocaleString()}
            </Typography>
          </Box>
        </Stack>

        {/* Bio / Description Note */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="caption" sx={{ color: "#93939f", textTransform: "uppercase", fontSize: "12px", display: "block", mb: 1, fontFamily: "ui-monospace, monospace" }}>
            BIOGRAFIA & PROFILO
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#ffffff",
              fontSize: "16px",
              lineHeight: 1.5,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {cleanNote(account?.note)}
          </Typography>
        </Box>

        {/* Registration & Activity Dates */}
        {account?.created_at && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ color: "#93939f", fontFamily: "ui-monospace, monospace", fontSize: "12px" }}>
              Registrato il: <strong style={{ color: "#ffffff" }}>{new Date(account.created_at).toLocaleDateString("it-IT")}</strong>
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
              borderRadius: "32px",
              backgroundColor: "#ffffff",
              color: "#17171c",
              fontWeight: 500,
              fontSize: "14px",
              fontFamily: "Inter, sans-serif",
              py: 1.5,
              "&:hover": {
                backgroundColor: "#e5e7eb",
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
