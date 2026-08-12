import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Paper,
  Stack,
} from "@mui/material";
import {
  Hub as HubIcon,
  SmartToy as BotIcon,
  Person as HumanIcon,
  Fullscreen,
  FullscreenExit,
} from "@mui/icons-material";
import { api, GraphNode, GraphLink, AccountSearchResult, AccountDetail } from "../api/client.ts";
import AccountDetailModal from "./AccountDetailModal.tsx";
import { GraphToolbar } from "./graph/GraphToolbar.tsx";
import { tokens } from "../theme.ts";

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
  const [modalError, setModalError] = useState<string | null>(null);

  // Errore di caricamento del grafo. Deve restare visibile: in precedenza un
  // fallimento dell'API iniettava una topologia di esempio con account
  // inventati, indistinguibile dai dati reali per chi guarda.
  const [graphError, setGraphError] = useState<string | null>(null);

  // Physics simulation nodes ref so animation loop has fresh state
  const physicsNodesRef = useRef<Map<number, PhysicsNode>>(new Map());
  const hoveredNodeRef = useRef<PhysicsNode | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const draggedNodeRef = useRef<PhysicsNode | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  hoveredNodeRef.current = hoveredNode;

  // useCallback perche' l'effect qui sotto dipende da questa funzione: senza,
  // verrebbe ricreata a ogni render e l'effect si rilancerebbe all'infinito.
  // Era il motivo della direttiva eslint-disable che stava qui, la quale pero'
  // non disattivava nulla: un linter non c'era.
  const loadGraphData = useCallback((accountId?: number, mode?: string) => {
    const effectiveMode = mode ?? graphMode;
    const fetchPromise = accountId ? api.accountGraph(accountId, 80) : api.graph(80, effectiveMode);

    setGraphError(null);

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
          setAllNodes([]);
          setAllLinks([]);
          setGraphError(
            accountId
              ? "Nessuna connessione trovata per questo account."
              : "Nessun dato di rete disponibile: il database non contiene follow."
          );
        }
      })
      .catch((err) => {
        setAllNodes([]);
        setAllLinks([]);
        setGraphError(
          err instanceof Error
            ? `Impossibile caricare il grafo: ${err.message}`
            : "Impossibile caricare il grafo. Verificare che il backend sia in esecuzione."
        );
      });
  }, [graphMode]);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

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

  const handleNodeClick = (node: PhysicsNode) => {
    setModalLoading(true);
    setModalOpen(true);
    setModalError(null);
    setModalAccount(null);

    api
      .accountDetail(node.id)
      .then((res) => {
        // Nessun oggetto di ripiego: i due rami costruivano metriche inventate
        // (followers_count: degree * 12, statuses_count: 42) presentate nel
        // modale come dati dell'account.
        if (res.account) {
          setModalAccount(res.account);
        } else {
          setModalError(`Nessun dettaglio in archivio per ${node.label}.`);
        }
        setModalLoading(false);
      })
      .catch((err) => {
        setModalError(
          err instanceof Error
            ? `Impossibile caricare i dettagli dell'account: ${err.message}`
            : "Impossibile caricare i dettagli dell'account."
        );
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
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

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

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

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
          ctx.strokeStyle = tokens.color.coral;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = tokens.color.coral;
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

        let baseColor = tokens.color.success;
        let glowColor = "rgba(16, 185, 129, 0.4)";

        if (n.bot) {
          baseColor = tokens.color.coral;
          glowColor = "rgba(255, 119, 89, 0.5)";
        } else if (n.group === "instance" || (n.degree && n.degree >= 5)) {
          baseColor = tokens.color.accentCyan;
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
        ctx.strokeStyle = tokens.color.canvas;
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.stroke();

        if (n.bot) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = tokens.color.canvas;
          ctx.fill();
        }

        if (isHovered || n.radius > 12) {
          ctx.font = "600 11px Inter, sans-serif";
          ctx.fillStyle = tokens.color.canvas;
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
        color: tokens.color.canvas,
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

      {/* Header, Search & Controls Toolbar */}
      <GraphToolbar
        graphMode={graphMode}
        onGraphModeChange={(newMode) => {
          // Il ricaricamento e' guidato dall'effect su [graphMode]: chiamare
          // qui loadGraphData causerebbe un doppio fetch.
          setGraphMode(newMode);
          setSelectedSearchAccount(null);
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        searchLoading={searchLoading}
        selectedSearchAccount={selectedSearchAccount}
        onSelectSearchedAccount={handleSelectSearchedAccount}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onStepIncrement={() => setVisibleCount((prev) => Math.min(prev + 3, allNodes.length))}
        onResetGraph={() => {
          setSelectedSearchAccount(null);
          loadGraphData(undefined, graphMode);
        }}
        visibleCount={visibleCount}
        totalNodesCount={allNodes.length}
        onVisibleCountChange={setVisibleCount}
        speedMultiplier={speedMultiplier}
        onSpeedMultiplierChange={setSpeedMultiplier}
      />

      {/* Dynamic Metric Badges */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: tokens.radius.lg,
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: tokens.color.darkSlateDeep, textTransform: "uppercase", fontSize: "10px" }}>
            NODES LOADED
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.canvas }}>
            {visibleCount} <span style={{ fontSize: "12px", color: tokens.color.darkSlateDeep }}>/ {allNodes.length}</span>
          </Typography>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: tokens.radius.lg,
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: tokens.color.darkSlateDeep, textTransform: "uppercase", fontSize: "10px" }}>
            ACTIVE EDGES
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.accentCyan }}>
            {activeLinksCount}
          </Typography>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: tokens.radius.lg,
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: tokens.color.darkSlateDeep, textTransform: "uppercase", fontSize: "10px" }}>
            BOT RATIO
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.coral }}>
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
          backgroundColor: tokens.color.darkSurface,
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

        {graphError && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              px: 4,
              textAlign: "center",
              backgroundColor: "rgba(11, 15, 25, 0.92)",
            }}
          >
            <Typography sx={{ color: tokens.color.canvas, fontWeight: 600, fontSize: "0.95rem" }}>
              Grafo non disponibile
            </Typography>
            <Typography sx={{ color: tokens.color.darkSlate, fontSize: "0.85rem", maxWidth: 460 }}>
              {graphError}
            </Typography>
          </Box>
        )}

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
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: tokens.color.coral }} />
            <Typography variant="caption" sx={{ color: tokens.color.darkSlateLight, fontSize: "11px" }}>
              Bot Node
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: tokens.color.success }} />
            <Typography variant="caption" sx={{ color: tokens.color.darkSlateLight, fontSize: "11px" }}>
              Human User
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: tokens.color.accentCyan }} />
            <Typography variant="caption" sx={{ color: tokens.color.darkSlateLight, fontSize: "11px" }}>
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
            color: tokens.color.canvas,
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
              borderRadius: tokens.radius.lg,
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
                    icon={<BotIcon sx={{ fontSize: "14px !important", color: `${tokens.color.canvas} !important` }} />}
                    label="BOT DETECTED"
                    size="small"
                    sx={{ backgroundColor: tokens.color.coral, color: tokens.color.canvas, fontWeight: 700, fontSize: "10px" }}
                  />
                ) : hoveredNode.group === "instance" ? (
                  <Chip
                    icon={<HubIcon sx={{ fontSize: "14px !important", color: `${tokens.color.black} !important` }} />}
                    label="HUB INSTANCE"
                    size="small"
                    sx={{ backgroundColor: tokens.color.accentCyan, color: tokens.color.black, fontWeight: 700, fontSize: "10px" }}
                  />
                ) : (
                  <Chip
                    icon={<HumanIcon sx={{ fontSize: "14px !important", color: `${tokens.color.canvas} !important` }} />}
                    label="HUMAN USER"
                    size="small"
                    sx={{ backgroundColor: tokens.color.success, color: tokens.color.canvas, fontWeight: 700, fontSize: "10px" }}
                  />
                )}
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.color.canvas, wordBreak: "break-all" }}>
                {hoveredNode.label}
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.darkSlate, display: "block", mt: 0.5 }}>
                Domain: <strong style={{ color: tokens.color.darkSlateLight }}>{hoveredNode.domain || "fediverse"}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.darkSlate, display: "block" }}>
                Network Connections: <strong style={{ color: tokens.color.accentCyan }}>{hoveredNode.degree || 1}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.coral, fontSize: "10px", display: "block", mt: 0.5 }}>
                👉 Clicca per aprire il popup metadati completo!
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Account Detail Popup Modal */}
      <AccountDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        account={modalAccount}
        loading={modalLoading}
        error={modalError}
      />
    </Paper>
  );
}
