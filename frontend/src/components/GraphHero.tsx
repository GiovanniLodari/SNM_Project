import { useEffect, useRef, useState, useMemo } from "react";
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
  Hub as HubIcon,
  SmartToy as BotIcon,
  Person as HumanIcon,
  Fullscreen,
  FullscreenExit,
  Search as SearchIcon,
} from "@mui/icons-material";
import { api, GraphNode, GraphLink, AccountSearchResult, AccountDetail } from "../api/client.ts";
import AccountDetailModal from "./AccountDetailModal.tsx";

interface PhysicsNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  spawnTime: number;
}

export default function GraphHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Raw data from API
  const [allNodes, setAllNodes] = useState<GraphNode[]>([]);
  const [allLinks, setAllLinks] = useState<GraphLink[]>([]);

  // Progressive rendering state
  const [visibleCount, setVisibleCount] = useState<number>(4);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [hoveredNode, setHoveredNode] = useState<PhysicsNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Graph mode filter: bot, human, all
  const [graphMode, setGraphMode] = useState<string>("all");

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<AccountSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [selectedSearchAccount, setSelectedSearchAccount] = useState<AccountSearchResult | null>(null);

  // Detail Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalAccount, setModalAccount] = useState<AccountDetail | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  // Physics simulation nodes ref so animation loop has fresh state
  const physicsNodesRef = useRef<Map<number, PhysicsNode>>(new Map());
  const hoveredNodeRef = useRef<PhysicsNode | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const draggedNodeRef = useRef<PhysicsNode | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  hoveredNodeRef.current = hoveredNode;

  // Auto-open detail modal when hovering a node for 600ms
  useEffect(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (hoveredNode && !modalOpen && !isDraggingRef.current) {
      hoverTimerRef.current = setTimeout(() => {
        handleNodeClick(hoveredNode);
      }, 600);
    }

    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, [hoveredNode, modalOpen]);

  // Load initial graph data
  useEffect(() => {
    loadGraphData();
  }, []);

  const loadGraphData = (accountId?: number, mode?: string) => {
    const effectiveMode = mode ?? graphMode;
    const fetchPromise = accountId ? api.accountGraph(accountId, 80) : api.graph(80, effectiveMode);

    fetchPromise
      .then((data) => {
        if (data.nodes && data.nodes.length > 0) {
          setAllNodes(data.nodes);
          setAllLinks(data.links);
          // Reset progressive render to start animation for new graph network
          physicsNodesRef.current.clear();
          setVisibleCount(Math.min(5, data.nodes.length));
          setIsPlaying(true);
        } else {
          useFallbackData();
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch graph, using fallback sample topology:", err);
        useFallbackData();
      });
  };

  const useFallbackData = () => {
    const sampleNodes: GraphNode[] = [
      { id: 1, label: "@ai_researcher@mastodon.social", bot: false, group: "human", degree: 4, domain: "mastodon.social" },
      { id: 2, label: "@news_bot@bot.fediverse.observer", bot: true, group: "bot", degree: 5, domain: "bot.fediverse.observer" },
      { id: 3, label: "@fact_checker@truth.org", bot: false, group: "human", degree: 3, domain: "truth.org" },
      { id: 4, label: "@synthetic_feed@ai.gen", bot: true, group: "bot", degree: 6, domain: "ai.gen" },
      { id: 5, label: "@disinfo_tracker@network.net", bot: false, group: "human", degree: 4, domain: "network.net" },
      { id: 6, label: "@mastodon_hub@mastodon.online", bot: false, group: "instance", degree: 7, domain: "mastodon.online" },
      { id: 7, label: "@auto_reposter@bot.social", bot: true, group: "bot", degree: 3, domain: "bot.social" },
      { id: 8, label: "@tech_trends@fediverse.it", bot: false, group: "human", degree: 4, domain: "fediverse.it" },
      { id: 9, label: "@ai_pipeline_node@snm.ai", bot: true, group: "bot", degree: 5, domain: "snm.ai" },
    ];

    const sampleLinks: GraphLink[] = [
      { source: 1, target: 2 },
      { source: 1, target: 3 },
      { source: 2, target: 4 },
      { source: 4, target: 5 },
      { source: 3, target: 5 },
      { source: 6, target: 1 },
      { source: 6, target: 8 },
      { source: 7, target: 4 },
      { source: 8, target: 9 },
      { source: 9, target: 2 },
      { source: 5, target: 1 },
    ];
    setAllNodes(sampleNodes);
    setAllLinks(sampleLinks);
  };

  // Handle live account search autocomplete
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setSearchLoading(true);
      api
        .searchAccounts(searchQuery)
        .then((res) => {
          setSearchResults(res.accounts || []);
          setSearchLoading(false);
        })
        .catch(() => {
          setSearchResults([]);
          setSearchLoading(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Account Selection from Search Bar -> Load Follower Subgraph!
  const handleSelectSearchedAccount = (account: AccountSearchResult | null) => {
    setSelectedSearchAccount(account);
    if (account) {
      loadGraphData(account.id);
    }
  };

  // Handle Clicking any Node -> Open Rich Metadata Popup Modal!
  const handleNodeClick = (node: PhysicsNode) => {
    setModalLoading(true);
    setModalOpen(true);

    api
      .accountDetail(node.id)
      .then((res) => {
        if (res.account) {
          setModalAccount(res.account);
        } else {
          // Construct fallback detail object from node if DB detail is incomplete
          setModalAccount({
            id: node.id,
            acct: node.label,
            username: node.label.split("@")[1] || node.label,
            display_name: node.label,
            bot: node.bot,
            domain: node.domain || "fediverse",
            url: `https://${node.domain || "mastodon.social"}/@${node.label.replace(/^@/, "")}`,
            followers_count: node.degree ? node.degree * 12 : 1,
            following_count: 5,
            statuses_count: 42,
            note: "Account utente indicizzato dalla rete Fediverse.",
          });
        }
        setModalLoading(false);
      })
      .catch(() => {
        setModalAccount({
          id: node.id,
          acct: node.label,
          username: node.label.split("@")[1] || node.label,
          display_name: node.label,
          bot: node.bot,
          domain: node.domain || "fediverse",
          url: `https://${node.domain || "mastodon.social"}/@${node.label.replace(/^@/, "")}`,
          followers_count: node.degree ? node.degree * 12 : 1,
          following_count: 5,
          statuses_count: 42,
          note: "Account utente indicizzato dalla rete Fediverse.",
        });
        setModalLoading(false);
      });
  };

  // Sync physicsNodes map when visibleCount or allNodes changes
  useEffect(() => {
    if (allNodes.length === 0) return;

    const currentMap = physicsNodesRef.current;
    const canvas = canvasRef.current;
    const width = canvas ? canvas.clientWidth : 700;
    const height = canvas ? canvas.clientHeight : 450;
    const centerX = width / 2;
    const centerY = height / 2;

    const visibleSlice = allNodes.slice(0, visibleCount);

    // Add newly revealed nodes
    visibleSlice.forEach((node) => {
      if (!currentMap.has(node.id)) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 140;
        const radius = node.bot ? 10 : node.group === "instance" ? 14 : 9;

        currentMap.set(node.id, {
          ...node,
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius,
          spawnTime: Date.now(),
        });
      }
    });

    // Remove nodes if reset or count reduced
    Array.from(currentMap.keys()).forEach((id) => {
      if (!visibleSlice.some((n) => n.id === id)) {
        currentMap.delete(id);
      }
    });
  }, [visibleCount, allNodes]);

  // Interval for progressive streaming ("pochi nodi alla volta")
  useEffect(() => {
    if (!isPlaying || allNodes.length === 0) return;
    if (visibleCount >= allNodes.length) return;

    const intervalTime = Math.max(200, 1400 / speedMultiplier);
    const timer = setInterval(() => {
      setVisibleCount((prev) => Math.min(prev + 2, allNodes.length));
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, visibleCount, allNodes.length, speedMultiplier]);

  // Physics animation loop & Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animFrameId: number;
    let particles: Array<{
      sourceId: number;
      targetId: number;
      progress: number;
      speed: number;
      color: string;
    }> = [];

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    let lastParticleSpawn = 0;

    const loop = (timestamp: number) => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      const nodesMap = physicsNodesRef.current;
      const nodes = Array.from(nodesMap.values());
      const visibleIds = new Set(nodes.map((n) => n.id));

      const activeLinks = allLinks.filter(
        (l) => visibleIds.has(l.source) && visibleIds.has(l.target)
      );

      // 1. PHYSICS UPDATE
      const repulsionStrength = 1800;
      const springLength = 95;
      const springStiffness = 0.04;
      const damping = 0.82;
      const gravity = 0.02;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          let dx = n2.x - n1.x;
          let dy = n2.y - n1.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < 220) {
            const force = repulsionStrength / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      activeLinks.forEach((link) => {
        const source = nodesMap.get(link.source);
        const target = nodesMap.get(link.target);
        if (!source || !target) return;

        let dx = target.x - source.x;
        let dy = target.y - source.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const delta = dist - springLength;
        const force = delta * springStiffness;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      });

      nodes.forEach((n) => {
        if (draggedNodeRef.current && draggedNodeRef.current.id === n.id) {
          n.vx = 0;
          n.vy = 0;
          return;
        }

        n.vx += (centerX - n.x) * gravity;
        n.vy += (centerY - n.y) * gravity;

        n.vx *= damping;
        n.vy *= damping;

        n.x += n.vx;
        n.y += n.vy;

        const pad = 24;
        n.x = Math.max(pad, Math.min(width - pad, n.x));
        n.y = Math.max(pad, Math.min(height - pad, n.y));
      });

      // 2. RENDER EDGES
      const activeHovered = hoveredNodeRef.current;

      activeLinks.forEach((link) => {
        const source = nodesMap.get(link.source);
        const target = nodesMap.get(link.target);
        if (!source || !target) return;

        const isHighlighted =
          activeHovered &&
          (activeHovered.id === source.id || activeHovered.id === target.id);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isHighlighted) {
          ctx.strokeStyle = "#ff7759";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "#ff7759";
          ctx.shadowBlur = 8;
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 1.2;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // 3. ANIMATED EDGE PARTICLES
      if (timestamp - lastParticleSpawn > 350 / speedMultiplier && activeLinks.length > 0) {
        lastParticleSpawn = timestamp;
        const randomLink = activeLinks[Math.floor(Math.random() * activeLinks.length)];
        if (randomLink) {
          const srcNode = nodesMap.get(randomLink.source);
          particles.push({
            sourceId: randomLink.source,
            targetId: randomLink.target,
            progress: 0,
            speed: 0.015 + Math.random() * 0.02,
            color: srcNode?.bot ? "#ff5252" : "#38bdf8",
          });
        }
      }

      particles.forEach((p) => {
        p.progress += p.speed * speedMultiplier;
        const src = nodesMap.get(p.sourceId);
        const tgt = nodesMap.get(p.targetId);
        if (src && tgt) {
          const px = src.x + (tgt.x - src.x) * p.progress;
          const py = src.y + (tgt.y - src.y) * p.progress;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      particles = particles.filter((p) => p.progress < 1.0);

      // 4. RENDER NODES
      const now = Date.now();

      nodes.forEach((n) => {
        const isHovered = activeHovered?.id === n.id;
        const age = now - n.spawnTime;
        const isNew = age < 800;

        ctx.save();

        let baseColor = "#10b981";
        let glowColor = "rgba(16, 185, 129, 0.4)";

        if (n.bot) {
          baseColor = "#ff7759";
          glowColor = "rgba(255, 119, 89, 0.5)";
        } else if (n.group === "instance" || (n.degree && n.degree >= 5)) {
          baseColor = "#00e5ff";
          glowColor = "rgba(0, 229, 255, 0.5)";
        }

        if (isNew) {
          const waveRadius = n.radius + (age / 800) * 20;
          const alpha = 1 - age / 800;
          ctx.beginPath();
          ctx.arc(n.x, n.y, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = baseColor;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, isHovered ? n.radius + 6 : n.radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.stroke();

        if (n.bot) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }

        if (isHovered || n.radius > 12) {
          ctx.font = "600 11px Inter, sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          const shortLabel = n.label.length > 20 ? n.label.substring(0, 18) + "..." : n.label;
          ctx.fillText(shortLabel, n.x, n.y + n.radius + 14);
        }

        ctx.restore();
      });

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [allLinks, speedMultiplier]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isDraggingRef.current && draggedNodeRef.current) {
      draggedNodeRef.current.x = mx;
      draggedNodeRef.current.y = my;
      return;
    }

    let found: PhysicsNode | null = null;
    const nodes = Array.from(physicsNodesRef.current.values());
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = mx - n.x;
      const dy = my - n.y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 6) {
        found = n;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseDownPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (hoveredNode) {
      isDraggingRef.current = true;
      draggedNodeRef.current = hoveredNode;
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const downPos = mouseDownPosRef.current;
    mouseDownPosRef.current = null;

    // Distinguish click vs drag: if mouse moved < 5px, treat as click
    let wasDrag = false;
    if (isDraggingRef.current) {
      if (canvas && downPos) {
        const rect = canvas.getBoundingClientRect();
        const dx = (e.clientX - rect.left) - downPos.x;
        const dy = (e.clientY - rect.top) - downPos.y;
        wasDrag = Math.sqrt(dx * dx + dy * dy) > 5;
      } else {
        wasDrag = true;
      }
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
    }

    // On Node Click -> Open Detail Popup Modal!
    if (!wasDrag && hoveredNode) {
      handleNodeClick(hoveredNode);
    }
  };

  const botRatio = useMemo(() => {
    const active = allNodes.slice(0, visibleCount);
    if (active.length === 0) return 0;
    const bots = active.filter((n) => n.bot).length;
    return Math.round((bots / active.length) * 100);
  }, [allNodes, visibleCount]);

  const activeLinksCount = useMemo(() => {
    const visibleIds = new Set(allNodes.slice(0, visibleCount).map((n) => n.id));
    return allLinks.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target)).length;
  }, [allNodes, allLinks, visibleCount]);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "28px",
        backgroundColor: "#131924",
        color: "#ffffff",
        p: { xs: 3, md: 4 },
        mb: 6,
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)",
      }}
    >
      {/* Background Decorative Ambient Radial Gradients */}
      <Box
        sx={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "50%",
          height: "80%",
          background: "radial-gradient(circle, rgba(255,119,89,0.15) 0%, rgba(0,0,0,0) 70%)",
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "50%",
          height: "80%",
          background: "radial-gradient(circle, rgba(0,229,255,0.15) 0%, rgba(0,0,0,0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top Header Row with Search Input */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justify: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
          mb: 3,
          position: "relative",
          zIndex: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Chip
              icon={<HubIcon sx={{ fontSize: "14px !important", color: "#00e5ff !important" }} />}
              label="PROGRESSIVE TOPOLOGY STREAM"
              sx={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.8px",
                backgroundColor: "rgba(0, 229, 255, 0.12)",
                color: "#00e5ff",
                border: "1px solid rgba(0, 229, 255, 0.3)",
              }}
            />
            {isPlaying && (
              <Chip
                label="LIVE STREAMING"
                sx={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "10px",
                  fontWeight: 700,
                  backgroundColor: "rgba(255, 119, 89, 0.15)",
                  color: "#ff7759",
                  border: "1px solid rgba(255, 119, 89, 0.3)",
                  "& .MuiChip-label": {
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    "&::before": {
                      content: '""',
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#ff7759",
                      animation: "pulse 1.2s infinite ease-in-out",
                    },
                  },
                  "@keyframes pulse": {
                    "0%": { opacity: 0.3, transform: "scale(0.8)" },
                    "50%": { opacity: 1, transform: "scale(1.2)" },
                    "100%": { opacity: 0.3, transform: "scale(0.8)" },
                  },
                }}
              />
            )}
          </Stack>

          <Typography
            variant="h3"
            sx={{
              fontFamily: "Space Grotesk, Inter, sans-serif",
              fontWeight: 500,
              fontSize: { xs: "28px", md: "38px" },
              letterSpacing: "-1px",
              lineHeight: 1.1,
              color: "#ffffff",
            }}
          >
            Fediverse Intelligence Command Center.
          </Typography>
        </Box>

        {/* Graph Mode Dropdown */}
        <Select
          value={graphMode}
          onChange={(e) => {
            const newMode = e.target.value as string;
            setGraphMode(newMode);
            setSelectedSearchAccount(null);
            loadGraphData(undefined, newMode);
          }}
          size="small"
          sx={{
            minWidth: 150,
            borderRadius: "32px",
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 600,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            "& .MuiSelect-icon": { color: "#94a3b8" },
            "&:hover": { borderColor: "#00e5ff" },
            "&.Mui-focused": {
              borderColor: "#00e5ff",
              boxShadow: "0 0 12px rgba(0, 229, 255, 0.3)",
            },
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: "#0b0f19",
                color: "#ffffff",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                mt: 1,
              },
            },
          }}
        >
          <MenuItem value="all">🌐 Tutti gli account</MenuItem>
          <MenuItem value="bot">🤖 Solo Bot</MenuItem>
          <MenuItem value="human">👤 Solo Utenti</MenuItem>
        </Select>

        {/* Account Search Autocomplete Bar */}
        <Box sx={{ width: { xs: "100%", md: "340px" } }}>
          <Autocomplete
            options={searchResults}
            getOptionLabel={(option) => option.acct}
            loading={searchLoading}
            value={selectedSearchAccount}
            onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
            onChange={(_, newValue) => handleSelectSearchedAccount(newValue)}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  display: "flex",
                  justify: "space-between",
                  alignItems: "center",
                  "&:hover": { backgroundColor: "rgba(0, 229, 255, 0.15)" },
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#ffffff" }}>
                    {option.acct}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                    Domain: {option.domain}
                  </Typography>
                </Box>
                {option.bot && (
                  <Chip
                    icon={<BotIcon sx={{ fontSize: "12px !important", color: "#ffffff !important" }} />}
                    label="BOT"
                    size="small"
                    sx={{ backgroundColor: "#ff7759", color: "#ffffff", fontSize: "9px", fontWeight: 700 }}
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
                      <SearchIcon sx={{ color: "#00e5ff" }} />
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
                    borderRadius: "32px",
                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                    backdropFilter: "blur(8px)",
                    color: "#ffffff",
                    fontSize: "13px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    "&:hover": {
                      borderColor: "#00e5ff",
                    },
                    "&.Mui-focused": {
                      borderColor: "#00e5ff",
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
                  backgroundColor: "#0b0f19",
                  color: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  mt: 1,
                }}
              />
            )}
          />
        </Box>
      </Box>

      {/* Dynamic Metric Badges */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: "16px",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>
            NODES LOADED
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#ffffff" }}>
            {visibleCount} <span style={{ fontSize: "12px", color: "#64748b" }}>/ {allNodes.length}</span>
          </Typography>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: "16px",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>
            ACTIVE EDGES
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#00e5ff" }}>
            {activeLinksCount}
          </Typography>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: "16px",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: "#64748b", textTransform: "uppercase", fontSize: "10px" }}>
            BOT RATIO
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: "Space Grotesk", fontWeight: 700, color: "#ff7759" }}>
            {botRatio}%
          </Typography>
        </Box>
      </Stack>

      {/* Main Canvas Graph Display Area */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: isFullscreen ? "75vh" : "440px",
          borderRadius: "20px",
          backgroundColor: "#0b0f19",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          overflow: "hidden",
          transition: "all 0.3s ease",
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          style={{ width: "100%", height: "100%", cursor: hoveredNode ? "pointer" : "default" }}
        />

        {/* Legend Overlay (Top Left inside Canvas) */}
        <Stack
          direction="row"
          spacing={2}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(8px)",
            px: 2,
            py: 1,
            borderRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ff7759" }} />
            <Typography variant="caption" sx={{ color: "#cbd5e1", fontSize: "11px" }}>
              Bot Node
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#10b981" }} />
            <Typography variant="caption" sx={{ color: "#cbd5e1", fontSize: "11px" }}>
              Human User
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#00e5ff" }} />
            <Typography variant="caption" sx={{ color: "#cbd5e1", fontSize: "11px" }}>
              Hub Instance
            </Typography>
          </Box>
        </Stack>

        {/* Fullscreen Toggle Button (Top Right inside Canvas) */}
        <IconButton
          onClick={() => setIsFullscreen(!isFullscreen)}
          sx={{
            position: "absolute",
            top: 14,
            right: 14,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
          }}
        >
          {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
        </IconButton>

        {/* Hover / Selected Node Tooltip Card (Bottom Left inside Canvas) */}
        {hoveredNode && (
          <Paper
            elevation={6}
            sx={{
              position: "absolute",
              bottom: 16,
              left: 16,
              p: 2,
              borderRadius: "16px",
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              maxWidth: 320,
              zIndex: 10,
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                {hoveredNode.bot ? (
                  <Chip
                    icon={<BotIcon sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
                    label="BOT DETECTED"
                    size="small"
                    sx={{ backgroundColor: "#ff7759", color: "#ffffff", fontWeight: 700, fontSize: "10px" }}
                  />
                ) : hoveredNode.group === "instance" ? (
                  <Chip
                    icon={<HubIcon sx={{ fontSize: "14px !important", color: "#000000 !important" }} />}
                    label="HUB INSTANCE"
                    size="small"
                    sx={{ backgroundColor: "#00e5ff", color: "#000000", fontWeight: 700, fontSize: "10px" }}
                  />
                ) : (
                  <Chip
                    icon={<HumanIcon sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
                    label="HUMAN USER"
                    size="small"
                    sx={{ backgroundColor: "#10b981", color: "#ffffff", fontWeight: 700, fontSize: "10px" }}
                  />
                )}
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#ffffff", wordBreak: "break-all" }}>
                {hoveredNode.label}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mt: 0.5 }}>
                Domain: <strong style={{ color: "#cbd5e1" }}>{hoveredNode.domain || "fediverse"}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                Network Connections: <strong style={{ color: "#00e5ff" }}>{hoveredNode.degree || 1}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: "#ff7759", fontSize: "10px", display: "block", mt: 0.5 }}>
                👉 Clicca per aprire il popup metadati completo!
              </Typography>
            </Box>
          </Paper>
        )}
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
          justify: "space-between",
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title={isPlaying ? "Pausa Streaming" : "Avvia Streaming Progressivo"}>
            <Button
              variant="contained"
              onClick={() => setIsPlaying(!isPlaying)}
              startIcon={isPlaying ? <Pause /> : <PlayArrow />}
              sx={{
                borderRadius: "24px",
                backgroundColor: isPlaying ? "#ff7759" : "#10b981",
                color: "#ffffff",
                fontWeight: 600,
                px: 2.5,
                "&:hover": {
                  backgroundColor: isPlaying ? "#e05b3d" : "#0d9668",
                },
              }}
            >
              {isPlaying ? "PAUSE STREAM" : "PLAY STREAM"}
            </Button>
          </Tooltip>

          <Tooltip title="Aggiungi +3 Nodi Ora">
            <Button
              variant="outlined"
              onClick={() => setVisibleCount((prev) => Math.min(prev + 3, allNodes.length))}
              disabled={visibleCount >= allNodes.length}
              startIcon={<SkipNext />}
              sx={{
                borderRadius: "24px",
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                "&:hover": { borderColor: "#00e5ff", backgroundColor: "rgba(0, 229, 255, 0.1)" },
              }}
            >
              STEP (+3)
            </Button>
          </Tooltip>

          <Tooltip title="Resetta Grafo al Network Iniziale">
            <IconButton
              onClick={() => {
                setSelectedSearchAccount(null);
                loadGraphData(undefined, graphMode);
              }}
              sx={{
                color: "#94a3b8",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                "&:hover": { color: "#ffffff", backgroundColor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              <RestartAlt />
            </IconButton>
          </Tooltip>
        </Stack>

        <Box sx={{ flex: 1, width: "100%", px: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontFamily: "ui-monospace, monospace" }}>
              RENDER PROGRESSION ("POCHI NODI ALLA VOLTA")
            </Typography>
            <Typography variant="caption" sx={{ color: "#00e5ff", fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>
              {visibleCount} / {allNodes.length} Nodes
            </Typography>
          </Box>
          <Slider
            value={visibleCount}
            min={2}
            max={allNodes.length || 20}
            step={1}
            onChange={(_, val) => setVisibleCount(val as number)}
            sx={{
              color: "#00e5ff",
              height: 6,
              "& .MuiSlider-thumb": {
                width: 14,
                height: 14,
                backgroundColor: "#ffffff",
                boxShadow: "0 0 10px #00e5ff",
              },
              "& .MuiSlider-track": {
                backgroundColor: "#00e5ff",
              },
              "& .MuiSlider-rail": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          />
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Speed sx={{ color: "#64748b", fontSize: "18px", mr: 0.5 }} />
          {[1, 2, 4].map((mult) => (
            <Chip
              key={mult}
              label={`${mult}x`}
              size="small"
              onClick={() => setSpeedMultiplier(mult)}
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                backgroundColor: speedMultiplier === mult ? "#00e5ff" : "rgba(255, 255, 255, 0.06)",
                color: speedMultiplier === mult ? "#000000" : "#94a3b8",
                "&:hover": { backgroundColor: speedMultiplier === mult ? "#00e5ff" : "rgba(255, 255, 255, 0.15)" },
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Account Detail Popup Modal */}
      <AccountDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        account={modalAccount}
        loading={modalLoading}
      />
    </Paper>
  );
}
