import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useMovimentoRidotto } from "../hooks/useMovimentoRidotto.ts";
import type { Simulation, SimulationNodeDatum } from "d3-force";
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
import {
  ALPHA_RISCALDAMENTO,
  PAD_CANVAS,
  centraSimulazione,
  configuraForze,
  creaSimulazione,
  riscaldaSimulazione,
  simulazioneFerma,
} from "../utils/graphSimulation.ts";

interface PhysicsNode extends GraphNode, SimulationNodeDatum {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  spawnTime: number;
}

export default function GraphHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /**
   * Chi ha chiesto meno movimento vede la rete gia' assestata invece che
   * costruirsi davanti.
   *
   * Qui il moto non e' decorativo - la rivelazione progressiva racconta come il
   * grafo si infittisce - ma non e' nemmeno l'unico modo di leggerlo: lo stesso
   * contenuto sta tutto nel grafo completo, che e' proprio cio' che la
   * rivelazione produce alla fine. Quindi non si spegne l'animazione lasciando
   * una tela vuota: si parte dal fotogramma finale.
   */
  const riduciMovimento = useMovimentoRidotto();

  // Raw data from API
  const [allNodes, setAllNodes] = useState<GraphNode[]>([]);
  const [allLinks, setAllLinks] = useState<GraphLink[]>([]);

  // Progressive rendering state
  const [visibleCount, setVisibleCount] = useState<number>(4);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [hoveredNode, setHoveredNode] = useState<PhysicsNode | null>(null);
  /**
   * Vero quando il nodo corrente e' stato scelto con le frecce e non sfiorato
   * col puntatore. Solo in quel caso la selezione viene annunciata: al mouse
   * ogni nodo attraversato produrrebbe una frase, e chi usa il puntatore vede
   * gia' la scheda comparire.
   */
  const [selezioneDaTastiera, setSelezioneDaTastiera] = useState<boolean>(false);
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

  // Simulazione d3: creata una volta e riconfigurata quando l'insieme dei nodi
  // visibili cambia, cioe' a ogni passo della rivelazione progressiva.
  const simulazioneRef = useRef<Simulation<PhysicsNode, GraphLink> | null>(null);

  // Versione dell'insieme dei nodi: la incrementa l'effect di sincronizzazione
  // ogni volta che aggiunge o rimuove un nodo. Prima si confrontava la sola
  // lunghezza dell'array, e cercando un account o cambiando filtro i nodi
  // vengono sostituiti in blocco: se il conteggio coincideva, la simulazione
  // restava agganciata a oggetti nodo non piu' sullo schermo.
  const versioneNodiRef = useRef<number>(0);
  const versioneApplicataRef = useRef<number>(-1);

  // Vero quando il grafo e' stato sostituito da capo (caricamento, ricerca,
  // cambio filtro) e non semplicemente accresciuto di qualche nodo.
  const rilancioPienoRef = useRef<boolean>(true);

  // Ultime dimensioni del canvas viste dal loop, per accorgersi di un resize.
  const dimensioniRef = useRef<{ larghezza: number; altezza: number }>({
    larghezza: 0,
    altezza: 0,
  });

  /**
   * Allinea la simulazione ai nodi visibili. La configurazione delle forze sta
   * in utils/graphSimulation.ts, dove puo' essere verificata senza montare un
   * canvas; qui resta solo il quando, non il come.
   */
  const aggiornaSimulazione = useCallback(
    (nodi: PhysicsNode[], archi: GraphLink[], larghezza: number, altezza: number) => {
      let sim = simulazioneRef.current;
      if (!sim) {
        sim = creaSimulazione<PhysicsNode>();
        simulazioneRef.current = sim;
      }

      // Riconfigurare a ogni fotogramma azzererebbe il quadtree e il grafo
      // sobbalzerebbe: si interviene solo quando i nodi cambiano davvero.
      // A insieme vuoto non si tocca nulla: fra lo svuotamento della mappa e
      // l'effect che la ripopola passa un fotogramma, e configurare li'
      // consumerebbe il rilancio pieno sul nulla, lasciando al grafo vero un
      // riscaldamento da semplice aggiunta incrementale.
      if (nodi.length > 0 && versioneNodiRef.current !== versioneApplicataRef.current) {
        versioneApplicataRef.current = versioneNodiRef.current;
        configuraForze(sim, nodi, archi);

        // La rivelazione progressiva aggiunge due nodi per volta: il
        // riscaldamento pieno deciso da configuraForze rimescolerebbe un
        // layout gia' assestato, quindi le aggiunte ripartono piu' tiepide.
        if (!rilancioPienoRef.current) sim.alpha(ALPHA_RISCALDAMENTO);
        rilancioPienoRef.current = false;
      }

      centraSimulazione(sim, larghezza, altezza);

      // Il canvas ha cambiato forma (resize della finestra, toggle fullscreen):
      // la gravita' e' cambiata con lui e il layout va rifatto.
      const precedenti = dimensioniRef.current;
      if (precedenti.larghezza !== larghezza || precedenti.altezza !== altezza) {
        if (precedenti.larghezza !== 0) riscaldaSimulazione(sim);
        dimensioniRef.current = { larghezza, altezza };
      }
    },
    [],
  );

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
          // Il grafo e' un altro: la simulazione va riconfigurata da zero, non
          // accresciuta. Il conteggio dei nodi da solo non lo direbbe, perche'
          // due grafi diversi possono avere lo stesso numero di nodi visibili.
          versioneNodiRef.current += 1;
          rilancioPienoRef.current = true;
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

    // Traccia se l'insieme dei nodi e' davvero cambiato: e' il segnale che fa
    // riconfigurare la simulazione nel loop di animazione.
    let insiemeCambiato = false;

    // Add newly revealed nodes
    visibleSlice.forEach((node) => {
      if (!currentMap.has(node.id)) {
        insiemeCambiato = true;
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
        insiemeCambiato = true;
      }
    });

    if (insiemeCambiato) versioneNodiRef.current += 1;
  }, [visibleCount, allNodes]);

  // Interval for progressive streaming ("pochi nodi alla volta")
  useEffect(() => {
    if (allNodes.length === 0) return;

    // A movimento ridotto la rete compare intera: nessun intervallo, nessun
    // nodo che entra in scena. E' il risultato della rivelazione, consegnato
    // subito.
    if (riduciMovimento) {
      setVisibleCount(allNodes.length);
      return;
    }

    if (!isPlaying) return;
    if (visibleCount >= allNodes.length) return;

    const intervalTime = Math.max(200, 1400 / speedMultiplier);
    const timer = setInterval(() => {
      setVisibleCount((prev) => Math.min(prev + 2, allNodes.length));
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, visibleCount, allNodes.length, speedMultiplier, riduciMovimento]);

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

      ctx.clearRect(0, 0, width, height);

      const nodesMap = physicsNodesRef.current;
      const nodes = Array.from(nodesMap.values());
      const visibleIds = new Set(nodes.map((n) => n.id));

      const activeLinks = allLinks.filter(
        (l) => visibleIds.has(l.source) && visibleIds.has(l.target)
      );

      // 1. SIMULAZIONE
      // La calcola d3-force. Prima c'era un integratore scritto a mano: la
      // repulsione confrontava tutte le coppie di nodi, quindi O(n^2), e il
      // costo veniva contenuto ignorando le coppie oltre i 220px - un rimedio
      // che falsa il campo di forze. forceManyBody usa un quadtree
      // (Barnes-Hut) e scende a O(n log n) senza troncare nulla.
      aggiornaSimulazione(nodes, activeLinks, width, height);

      // A rete assestata non si calcola piu' nulla: si ferma solo la fisica,
      // il disegno (archi, particelle, hover, onda di comparsa) continua.
      const sim = simulazioneRef.current;
      if (sim && !simulazioneFerma(sim)) sim.tick();

      // Rete di sicurezza sui bordi. Azzerare la velocita' e' la parte che
      // conta: correggendo solo la posizione, il nodo continuava a spingere
      // verso l'esterno a ogni tick e restava incollato al bordo.
      const xMin = PAD_CANVAS;
      const xMax = width - PAD_CANVAS;
      const yMin = PAD_CANVAS;
      const yMax = height - PAD_CANVAS;

      if (xMax > xMin && yMax > yMin) {
        nodes.forEach((n) => {
          if (n.x < xMin) {
            n.x = xMin;
            n.vx = 0;
          } else if (n.x > xMax) {
            n.x = xMax;
            n.vx = 0;
          }

          if (n.y < yMin) {
            n.y = yMin;
            n.vy = 0;
          } else if (n.y > yMax) {
            n.y = yMax;
            n.vy = 0;
          }
        });
      }

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
      // Le particelle non portano informazione - dicono "qui passa traffico",
      // che il grafo dice gia' con gli archi - quindi a movimento ridotto
      // spariscono del tutto invece di essere rallentate.
      if (
        !riduciMovimento &&
        timestamp - lastParticleSpawn > 350 / speedMultiplier &&
        activeLinks.length > 0
      ) {
        lastParticleSpawn = timestamp;
        const randomLink = activeLinks[Math.floor(Math.random() * activeLinks.length)];
        if (randomLink) {
          const srcNode = nodesMap.get(randomLink.source);
          particles.push({
            sourceId: randomLink.source,
            targetId: randomLink.target,
            progress: 0,
            speed: 0.015 + Math.random() * 0.02,
            color: srcNode?.bot ? tokens.color.graphBot : tokens.color.graphHuman,
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

        // Le tinte dei nodi sono `graphBot` / `graphHuman`, cioe' i due token
        // che DESIGN.md dichiara proprio per questo ("nodo bot e nodo umano nel
        // grafo dei follow, su fondo scuro").
        //
        // Prima i nodi usavano `coral` e `success` mentre le particelle che
        // corrono sugli archi usavano gia' `graphBot` / `graphHuman`: due
        // sistemi di colore per la stessa distinzione, nello stesso canvas.
        // Non era un dettaglio estetico - rendeva la legenda **falsa**, perche'
        // descriveva i pallini con tinte diverse da quelle che si vedevano
        // scorrere sugli archi. `success` per giunta significa "stato positivo"
        // altrove, e qui veniva usato per dire "non dichiarato bot", che non e'
        // affatto la stessa cosa.
        let baseColor = tokens.color.graphHuman;
        let glowColor = "rgba(56, 189, 248, 0.4)";

        if (n.bot) {
          baseColor = tokens.color.graphBot;
          glowColor = "rgba(255, 82, 82, 0.5)";
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
  }, [allLinks, speedMultiplier, aggiornaSimulazione, riduciMovimento]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isDraggingRef.current && draggedNodeRef.current) {
      const nodo = draggedNodeRef.current;
      // fx/fy fissano il nodo per d3: senza, la simulazione lo riporterebbe
      // indietro al tick successivo e il trascinamento non terrebbe.
      nodo.x = mx;
      nodo.y = my;
      nodo.fx = mx;
      nodo.fy = my;
      // Ora che la rete si ferma da sola, trascinare su una rete fredda non
      // muoverebbe nient'altro: si tiene calda finche' il puntatore si muove,
      // cosi' al rilascio il gruppo si riassesta e poi torna fermo.
      if (simulazioneRef.current) riscaldaSimulazione(simulazioneRef.current);
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
    // Il puntatore ha ripreso il comando: la selezione non va piu' annunciata.
    setSelezioneDaTastiera(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseDownPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (hoveredNode) {
      isDraggingRef.current = true;
      draggedNodeRef.current = hoveredNode;
      hoveredNode.fx = hoveredNode.x;
      hoveredNode.fy = hoveredNode.y;
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
      // Rilasciando si tolgono i vincoli: il nodo torna a essere governato
      // dalle forze e si riassesta con gli altri.
      if (draggedNodeRef.current) {
        draggedNodeRef.current.fx = null;
        draggedNodeRef.current.fy = null;
      }
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
    }

    // On Node Click -> Open Detail Popup Modal!
    if (!wasDrag && hoveredNode) {
      handleNodeClick(hoveredNode);
    }
  };

  /**
   * Sposta la selezione di un nodo, nell'ordine in cui i nodi sono comparsi.
   *
   * E' la controparte da tastiera del passaggio del mouse: scrive nello stesso
   * stato (`hoveredNode`), quindi il nodo si evidenzia sul canvas e la scheda in
   * basso a sinistra si apre esattamente come col puntatore. Nessuna seconda
   * interfaccia da mantenere allineata.
   */
  const spostaSelezione = (delta: number) => {
    const nodi = Array.from(physicsNodesRef.current.values());
    if (nodi.length === 0) return;
    const corrente = hoveredNode ? nodi.findIndex((n) => n.id === hoveredNode.id) : -1;
    // Da -1 (nessuna selezione) un passo avanti porta al primo nodo, uno
    // indietro all'ultimo: entrare nel grafo da tastiera funziona in entrambi
    // i versi senza un caso speciale.
    const prossimo = (corrente + delta + nodi.length) % nodi.length;
    setHoveredNode(nodi[prossimo]);
    setSelezioneDaTastiera(true);
  };

  const handleCanvasKeyDown = (evento: React.KeyboardEvent<HTMLCanvasElement>) => {
    switch (evento.key) {
      case "ArrowRight":
      case "ArrowDown":
        evento.preventDefault();
        spostaSelezione(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        evento.preventDefault();
        spostaSelezione(-1);
        break;
      case "Enter":
      case " ":
        if (hoveredNode) {
          evento.preventDefault();
          handleNodeClick(hoveredNode);
        }
        break;
      case "Escape":
        setHoveredNode(null);
        break;
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

  /**
   * Il grafo detto a parole, per chi non lo vede.
   *
   * Un canvas e' opaco alle tecnologie assistive: senza questo, il pezzo piu'
   * grande della Panoramica e' un riquadro vuoto. Non descrive l'aspetto ("una
   * rete di pallini") ma cio' che il grafo misura, che e' l'unica cosa per cui
   * sta li'.
   */
  const descrizioneGrafo = graphError
    ? `Grafo dei follow non disponibile: ${graphError}`
    : allNodes.length === 0
      ? "Grafo dei follow del Fediverso, in caricamento."
      : `Grafo dei follow del Fediverso: ${visibleCount} account visibili su ${allNodes.length}, ` +
        `${activeLinksCount} relazioni di follow fra loro, ${botRatio}% dichiarati bot. ` +
        "Usa le frecce per scorrere gli account uno a uno e Invio per aprirne la scheda.";

  /** L'account selezionato da tastiera, detto per esteso all'annuncio vocale. */
  const descrizioneSelezione =
    hoveredNode && selezioneDaTastiera
      ? `${hoveredNode.label}, ${
          hoveredNode.bot
            ? "dichiarato bot"
            : hoveredNode.group === "instance"
              ? "istanza"
              : "non dichiarato bot"
        }, dominio ${hoveredNode.domain || "non indicato"}, ${
          hoveredNode.degree || 1
        } collegamenti.`
      : "";

  return (
    <Paper
      elevation={0}
      sx={{
        // Raggio dalla scala token (22px, "angoli generosi sui riquadri di
        // contenuto"): erano 28px, un valore che non esiste nel sistema.
        borderRadius: tokens.radius.xl,
        backgroundColor: tokens.color.darkGraph,
        color: tokens.color.canvas,
        p: { xs: 3, md: 4 },
        mb: 6,
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        // Nessuna ombra: in questo sistema la profondita' viene dall'alternanza
        // di superficie, e il salto dal canvas bianco a questo fondo scuro la
        // fa gia' tutta da solo. I due gradienti radiali che stavano qui -
        // uno coral in alto a sinistra, uno ciano in basso a destra - erano
        // ornamento puro, cioe' esattamente cio' che DESIGN.md vieta quando
        // dice che il colore arriva dai dati.
      }}
    >
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
            ACCOUNT MOSTRATI
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
            RELAZIONI ATTIVE
          </Typography>
          {/* Bianco e non ciano: e' un conteggio, non un'istanza hub, e il
              ciano su questa superficie significa gia' quello. */}
          <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.canvas }}>
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
            DICHIARATI BOT
          </Typography>
          {/* `graphBot` e non `coral`: sulla stessa superficie i nodi bot sono
              gia' di questa tinta, e affiancare i due rossi del sistema
              farebbe leggere due categorie dove ce n'e' una. */}
          <Typography variant="h6" sx={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.graphBot }}>
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
          borderRadius: tokens.radius.lg,
          backgroundColor: tokens.color.darkSurface,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          overflow: "hidden",
          // Nessuna transizione: `all` includeva `height`, cioe' una proprieta'
          // di layout, e ingrandire il riquadro costringeva il browser a
          // rifare il layout e a ridimensionare il canvas per 300 ms - proprio
          // mentre l'animazione dei nodi sta girando.
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onKeyDown={handleCanvasKeyDown}
          // Il canvas entra nell'ordine di tabulazione ed espone un nome: prima
          // era un elemento muto e irraggiungibile, cioe' il pezzo piu' grande
          // della pagina non esisteva per chi naviga da tastiera o con uno
          // screen reader.
          tabIndex={0}
          role="img"
          aria-label={descrizioneGrafo}
          style={{
            width: "100%",
            height: "100%",
            cursor: hoveredNode ? "pointer" : "default",
            // Il canvas riempie il riquadro fino al bordo: l'anello globale ha
            // offset positivo e finirebbe tagliato da `overflow: hidden` del
            // contenitore, quindi qui rientra.
            outlineOffset: "-3px",
          }}
        />

        {/* L'annuncio del nodo scelto con le frecce. Resta vuoto quando la
            selezione arriva dal puntatore: la scheda visiva la' accanto dice
            gia' tutto, e annunciare ogni nodo sfiorato dal mouse sarebbe un
            flusso continuo di parole. */}
        <Box
          aria-live="polite"
          sx={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
          }}
        >
          {descrizioneSelezione}
        </Box>

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
            backgroundColor: tokens.color.darkSurface,
            px: 2,
            py: 1,
            borderRadius: tokens.radius.pill,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {/*
            I pallini portano le stesse tinte con cui il canvas disegna i nodi
            (`graphBot` / `graphHuman`): finche' la legenda diceva coral e
            verde mentre il grafo mostrava altro, era una legenda sbagliata,
            non solo incoerente.

            Il pallino dei bot ha il punto bianco al centro perche' **ce l'ha
            anche il nodo**: e' l'unico tratto che distingue le due categorie
            senza affidarsi al colore, e una legenda che lo omette lascia chi
            non distingue rosso e azzurro senza alcun appiglio.
          */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: tokens.color.graphBot,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box sx={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: tokens.color.canvas }} />
            </Box>
            <Typography variant="caption" sx={{ color: tokens.color.darkSlateLight, fontSize: "11px" }}>
              Dichiarato bot
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: tokens.color.graphHuman }} />
            {/* "Non dichiarato bot", non "utente umano": il campo del profilo e'
                auto-dichiarato e la sua assenza non certifica una persona. */}
            <Typography variant="caption" sx={{ color: tokens.color.darkSlateLight, fontSize: "11px" }}>
              Non dichiarato bot
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: tokens.color.accentCyan }} />
            <Typography variant="caption" sx={{ color: tokens.color.darkSlateLight, fontSize: "11px" }}>
              Istanza molto collegata
            </Typography>
          </Box>
        </Stack>

        {/* Fullscreen Toggle Button (Top Right inside Canvas) */}
        <IconButton
          onClick={() => setIsFullscreen(!isFullscreen)}
          aria-label={isFullscreen ? "Riduci il grafo" : "Ingrandisci il grafo"}
          aria-pressed={isFullscreen}
          sx={{
            position: "absolute",
            top: 14,
            right: 14,
            backgroundColor: tokens.color.darkSurface,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: tokens.color.canvas,
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
          }}
        >
          {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
        </IconButton>

        {/* Hover / Selected Node Tooltip Card (Bottom Left inside Canvas) */}
        {hoveredNode && (
          <Paper
            elevation={0}
            sx={{
              position: "absolute",
              bottom: 16,
              left: 16,
              p: 2,
              borderRadius: tokens.radius.lg,
              backgroundColor: tokens.color.darkSurface,
              border: "1px solid rgba(255, 255, 255, 0.15)",
              maxWidth: 320,
              zIndex: 10,
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                {hoveredNode.bot ? (
                  <Chip
                    icon={<BotIcon sx={{ fontSize: "14px !important", color: `${tokens.color.nearBlack} !important` }} />}
                    // "DICHIARATO BOT" e non "BOT DETECTED": nessuno ha
                    // *rilevato* nulla: e' il profilo stesso a dichiararsi
                    // automatizzato. La formula inglese prometteva un
                    // accertamento che questa cifra non ha fatto.
                    label="DICHIARATO BOT"
                    size="small"
                    sx={{ backgroundColor: tokens.color.graphBot, color: tokens.color.nearBlack, fontWeight: 700, fontSize: "10px" }}
                  />
                ) : hoveredNode.group === "instance" ? (
                  <Chip
                    icon={<HubIcon sx={{ fontSize: "14px !important", color: `${tokens.color.black} !important` }} />}
                    label="ISTANZA HUB"
                    size="small"
                    sx={{ backgroundColor: tokens.color.accentCyan, color: tokens.color.black, fontWeight: 700, fontSize: "10px" }}
                  />
                ) : (
                  <Chip
                    icon={<HumanIcon sx={{ fontSize: "14px !important", color: `${tokens.color.nearBlack} !important` }} />}
                    // Non "HUMAN USER": `tinte.ts` lo dice per esteso - questa
                    // categoria significa "account che non si dichiara bot", e
                    // *non* "verificato umano". L'etichetta precedente
                    // affermava piu' di quanto il dato sostenga.
                    label="NON DICHIARATO BOT"
                    size="small"
                    // Nero e non bianco: il nero su questa tinta da' 7.8:1 a
                    // 10px in grassetto, il bianco resterebbe sotto soglia.
                    sx={{ backgroundColor: tokens.color.graphHuman, color: tokens.color.nearBlack, fontWeight: 700, fontSize: "10px" }}
                  />
                )}
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.color.canvas, wordBreak: "break-all" }}>
                {hoveredNode.label}
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.darkSlate, display: "block", mt: 0.5 }}>
                Dominio: <strong style={{ color: tokens.color.darkSlateLight }}>{hoveredNode.domain || "non indicato"}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.color.darkSlate, display: "block" }}>
                Collegamenti: <strong style={{ color: tokens.color.darkSlateLight }}>{hoveredNode.degree || 1}</strong>
              </Typography>
              {/* Era «👉 Clicca per aprire il popup metadati completo!»: emoji
                  direzionale, gergo («popup») ed esclamativo, nel punto piu'
                  guardato di una pagina il cui tono dichiarato e' da
                  laboratorio. Cita anche Invio, perche' il canvas si percorre
                  con le frecce e la scheda si apre da tastiera. */}
              <Typography variant="caption" sx={{ color: tokens.color.darkSlate, fontSize: "11px", display: "block", mt: 0.5 }}>
                Clicca o premi Invio per aprire la scheda dell'account.
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
