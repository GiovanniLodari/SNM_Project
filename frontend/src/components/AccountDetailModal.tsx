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
} from "@mui/material";
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
      PaperProps={{
        sx: {
          borderRadius: "28px",
          backgroundColor: "#131924", // Cohere Dark Glass Surface
          color: "#ffffff",
          backgroundImage: "none",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.7)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          overflow: "hidden",
        },
      }}
    >
      {/* Header Banner or Fallback Ambient Field */}
      <Box
        sx={{
          height: 120,
          width: "100%",
          backgroundColor: "#0b0f19",
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

      <DialogContent sx={{ p: 4, pt: 0, position: "relative" }}>
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
              border: "4px solid #131924",
              boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
              backgroundColor: account?.bot ? "#ff7759" : "#10b981",
              fontSize: "32px",
              fontWeight: 700,
            }}
          >
            {account?.display_name ? account.display_name[0].toUpperCase() : "?"}
          </Avatar>

          {/* Account Category Badge */}
          {account?.bot ? (
            <Chip
              icon={<BotIcon sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
              label="BOT ACCOUNT"
              sx={{
                backgroundColor: "#ff7759",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "11px",
                fontFamily: "ui-monospace, monospace",
              }}
            />
          ) : (
            <Chip
              icon={<HumanIcon sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
              label="HUMAN USER"
              sx={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "11px",
                fontFamily: "ui-monospace, monospace",
              }}
            />
          )}
        </Box>

        {/* User Handle & Display Name */}
        <Typography
          variant="h4"
          sx={{
            fontFamily: "Space Grotesk, Inter, sans-serif",
            fontWeight: 600,
            fontSize: "24px",
            color: "#ffffff",
            lineHeight: 1.2,
          }}
        >
          {account?.display_name || account?.username || "Utente Fediverse"}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, mb: 3 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: "ui-monospace, monospace",
              color: "#00e5ff",
              fontSize: "13px",
              wordBreak: "break-all",
            }}
          >
            {account?.acct || "@account"}
          </Typography>

          <Chip
            label={account?.domain || "fediverse"}
            size="small"
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              color: "#cbd5e1",
              fontSize: "10px",
              fontFamily: "ui-monospace, monospace",
            }}
          />
        </Stack>

        {/* Social Metrics Grid (Followers, Following, Statuses) */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
            }}
          >
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mb: 0.5 }}>
              <FollowersIcon sx={{ fontSize: "16px", color: "#00e5ff" }} />
              <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>
                FOLLOWER
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#ffffff" }}>
              {(account?.followers_count ?? 0).toLocaleString()}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
            }}
          >
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mb: 0.5 }}>
              <FollowingIcon sx={{ fontSize: "16px", color: "#10b981" }} />
              <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>
                SEGUITI
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#ffffff" }}>
              {(account?.following_count ?? 0).toLocaleString()}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
            }}
          >
            <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mb: 0.5 }}>
              <PostsIcon sx={{ fontSize: "16px", color: "#ff7759" }} />
              <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>
                POST
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#ffffff" }}>
              {(account?.statuses_count ?? 0).toLocaleString()}
            </Typography>
          </Box>
        </Stack>

        {/* Bio / Description Note */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px", display: "block", mb: 1 }}>
            BIOGRAFIA & PROFILO
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#cbd5e1",
              fontSize: "14px",
              lineHeight: 1.6,
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              p: 2,
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            {cleanNote(account?.note)}
          </Typography>
        </Box>

        {/* Registration & Activity Dates */}
        {account?.created_at && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <CalendarIcon sx={{ fontSize: "16px", color: "#64748b" }} />
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
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
            endIcon={<LaunchIcon />}
            sx={{
              borderRadius: "32px",
              backgroundColor: "#1863dc",
              color: "#ffffff",
              fontWeight: 600,
              py: 1.5,
              "&:hover": {
                backgroundColor: "#1452b8",
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
