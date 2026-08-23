import { useRef, useState } from "react";
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  Skeleton,
  Typography,
} from "@mui/material";
import { Close as CloseIcon, OpenInNew as OpenInNewIcon } from "@mui/icons-material";
import { usePropagatoreProfileQuery, usePropagatorePostsQuery } from "../../api/queries.ts";
import type { PropagatoreSeed } from "../../api/client.ts";
import { tokens } from "../../theme.ts";
import { formatNumber } from "../../utils/format.ts";
import { useNavigate } from "react-router-dom";

type Veracity = "info" | "disinfo";
type Tipo = "generale" | "ai" | "human";

const PROFILO_LABEL: Record<string, string> = {
  ai: "IA",
  human: "Umano",
  misto: "Misto",
  unknown: "?",
};

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? "";
}

interface Props {
  seed: PropagatoreSeed | null;
  topic: string;
  veracity: Veracity;
  tipo: Tipo;
  onClose: () => void;
}

const POSTS_PER_PAGE = 15;

export default function PropagatorDrawer({ seed, topic, veracity, tipo, onClose }: Props) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const postsContainerRef = useRef<HTMLDivElement>(null);

  const open = seed !== null;
  const acct = seed?.acct ?? "";

  const { data: profileData, isLoading: profileLoading } = usePropagatoreProfileQuery(acct, open);
  const { data: postsData, isLoading: postsLoading } = usePropagatorePostsQuery(
    acct, topic, veracity, tipo, page * POSTS_PER_PAGE, open,
  );

  const profile = profileData?.profile ?? null;
  const posts = postsData?.posts ?? [];
  const hasMore = posts.length >= page * POSTS_PER_PAGE;

  function handleClose() {
    setPage(1);
    onClose();
  }

  function handleLoadMore() {
    setPage((p) => p + 1);
  }

  function handleOpenPost(postId: number) {
    navigate(`/posts?id=${postId}`);
    handleClose();
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 520, md: 600 },
          maxWidth: "100vw",
          backgroundColor: tokens.color.canvas,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header fisso */}
      <Box sx={{ display: "flex", alignItems: "center", px: 3, py: 2, borderBottom: `1px solid ${tokens.color.border}`, flexShrink: 0 }}>
        <IconButton onClick={handleClose} size="small" sx={{ mr: 1 }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 13, fontWeight: 700, color: tokens.color.nearBlack, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {acct}
        </Typography>
      </Box>

      {/* Corpo scrollabile */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {/* Copertina */}
        {profileLoading ? (
          <Skeleton variant="rectangular" height={120} />
        ) : profile?.header ? (
          <Box
            component="img"
            src={profile.header}
            alt=""
            sx={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <Box sx={{ height: 120, backgroundColor: tokens.color.softStone }} />
        )}

        {/* Profilo principale */}
        <Box sx={{ px: 3, pb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, mt: "-36px", mb: 2 }}>
            {profileLoading ? (
              <Skeleton variant="circular" width={72} height={72} />
            ) : (
              <Avatar
                src={profile?.avatar ?? undefined}
                alt={profile?.display_name ?? acct}
                sx={{ width: 72, height: 72, border: `3px solid ${tokens.color.canvas}`, fontSize: 28 }}
              >
                {(profile?.display_name ?? acct)[0]?.toUpperCase()}
              </Avatar>
            )}
            <Box sx={{ mb: 0.5 }}>
              {profileLoading ? (
                <Skeleton width={160} height={20} />
              ) : (
                <Typography sx={{ fontFamily: tokens.font.display, fontWeight: 700, fontSize: 17, color: tokens.color.nearBlack }}>
                  {profile?.display_name ?? acct}
                </Typography>
              )}
              <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.textMuted }}>
                {acct}
              </Typography>
            </Box>
          </Box>

          {/* Etichette */}
          {seed && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
              <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, px: 1, py: 0.25, borderRadius: tokens.radius.md,
                backgroundColor: seed.profilo === "ai" ? tokens.color.surfaceCoral : tokens.color.surfaceBlue,
                color: seed.profilo === "ai" ? tokens.color.coralInk : tokens.color.nearBlack }}>
                {PROFILO_LABEL[seed.profilo] ?? seed.profilo}
              </Typography>
              {seed.bot && (
                <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, fontWeight: 700, px: 1, py: 0.25,
                  borderRadius: tokens.radius.md, backgroundColor: tokens.color.surfaceCoral, color: tokens.color.coralInk }}>
                  bot
                </Typography>
              )}
              <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, px: 1, py: 0.25, borderRadius: tokens.radius.md,
                backgroundColor: tokens.color.softStone, color: tokens.color.textMuted }}>
                #{seed.rank} nel ranking
              </Typography>
            </Box>
          )}

          {/* Bio */}
          {profileLoading ? (
            <Skeleton width="90%" height={16} sx={{ mb: 0.5 }} />
          ) : profile?.note ? (
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.nearBlack, mb: 1.5, lineHeight: 1.55 }}>
              {stripHtml(profile.note)}
            </Typography>
          ) : null}

          {/* Statistiche */}
          {!profileLoading && (
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 1.5 }}>
              {[
                { label: "follower", value: profile?.followers_count ?? seed?.followers },
                { label: "seguiti", value: profile?.following_count },
                { label: "post", value: profile?.statuses_count },
              ].filter((s) => s.value != null).map(({ label, value }) => (
                <Box key={label}>
                  <Typography component="span" sx={{ fontFamily: tokens.font.display, fontSize: 16, fontWeight: 700, color: tokens.color.nearBlack }}>
                    {formatNumber(value as number)}
                  </Typography>
                  {" "}
                  <Typography component="span" sx={{ fontFamily: tokens.font.mono, fontSize: 11, color: tokens.color.textMuted }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: tokens.color.border }} />

        {/* Post */}
        <Box ref={postsContainerRef} sx={{ px: 3, py: 2 }}>
          <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em", color: tokens.color.textMuted, mb: 1.5 }}>
            Post · {veracity === "info" ? "informazione" : "disinformazione"}
            {tipo !== "generale" && ` · ${tipo === "ai" ? "IA" : "umano"}`}
            {topic !== "generale" && ` · ${topic}`}
          </Typography>

          {postsLoading && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[0, 1, 2].map((i) => <Skeleton key={i} height={60} sx={{ borderRadius: tokens.radius.md }} />)}
            </Box>
          )}

          {!postsLoading && posts.length === 0 && (
            <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.textMuted }}>
              Nessun post trovato in questa categoria per questo account.
            </Typography>
          )}

          {posts.map((p) => (
            <Box
              key={p.id}
              sx={{ mb: 2, pb: 2, borderBottom: `1px solid ${tokens.color.border}`, "&:last-child": { borderBottom: "none", mb: 0 } }}
            >
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: 13, color: tokens.color.nearBlack, mb: 0.5, lineHeight: 1.5 }}>
                {stripHtml(p.content)}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {p.created_at && (
                  <Typography sx={{ fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.textMuted }}>
                    {new Date(p.created_at).toLocaleString("it-IT")}
                  </Typography>
                )}
                <IconButton
                  size="small"
                  onClick={() => handleOpenPost(p.id)}
                  title="Apri post nel dettaglio"
                  sx={{ ml: "auto", p: 0.25 }}
                >
                  <OpenInNewIcon sx={{ fontSize: 13, color: tokens.color.textMuted }} />
                </IconButton>
              </Box>
            </Box>
          ))}

          {hasMore && !postsLoading && (
            <Typography
              onClick={handleLoadMore}
              sx={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.coral,
                cursor: "pointer", textAlign: "center", mt: 1, "&:hover": { textDecoration: "underline" } }}
            >
              Carica altri post
            </Typography>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
