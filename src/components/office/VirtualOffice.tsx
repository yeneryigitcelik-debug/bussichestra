"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PixelCharacter } from "./PixelCharacter";
import { MessageSquare, Settings2, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================
interface OfficeWorker {
  id: string; name: string; role: string; department: string;
  status: "active" | "idle" | "stuck" | "offline"; isManager: boolean; tools: number;
}
type AnimState = "typing" | "idle" | "walking" | "chatting" | "stuck";
interface WorkerAnim { state: AnimState; x: number; y: number; targetX: number; targetY: number; }

// ============================================================
// Office Layout — 2400 x 1600 isometric-ish pixel office
// ============================================================
const OW = 2400;
const OH = 1600;
const WALL = 8; // wall thickness

// Rooms: x, y, w, h are INTERIOR dimensions. Walls drawn around them.
const ROOMS: { id: string; label: string; x: number; y: number; w: number; h: number; floorColor: string; wallColor: string; accent: string }[] = [
  { id: "finance",    label: "Finance Dept.",      x: 40,   y: 40,  w: 520, h: 360, floorColor: "#0f1a16", wallColor: "#1a3028", accent: "#10B981" },
  { id: "executive",  label: "Executive Suite",    x: 620,  y: 40,  w: 520, h: 360, floorColor: "#150f24", wallColor: "#261842", accent: "#8B5CF6" },
  { id: "hr",         label: "Human Resources",    x: 1200, y: 40,  w: 520, h: 360, floorColor: "#1a0f18", wallColor: "#321a2e", accent: "#EC4899" },
  { id: "sales",      label: "Sales Floor",        x: 40,   y: 520, w: 520, h: 360, floorColor: "#0f1420", wallColor: "#182440", accent: "#3B82F6" },
  { id: "operations", label: "Operations Center",  x: 620,  y: 520, w: 520, h: 360, floorColor: "#1a1208", wallColor: "#302210", accent: "#F97316" },
  { id: "lounge",     label: "Break Room",         x: 1200, y: 520, w: 520, h: 360, floorColor: "#121218", wallColor: "#1e1e2e", accent: "#6B7280" },
];

// Conference room in the middle bottom
const CONF = { x: 800, y: 1020, w: 400, h: 280, floorColor: "#12121e", wallColor: "#1e1e32", accent: "#a78bfa" };

// Corridor is the space between rooms (y: 400-520, full width)

const HOME: Record<string, { x: number; y: number }> = {
  sophia: { x: 880, y: 200 },
  ayse:   { x: 280, y: 200 },
  marco:  { x: 280, y: 680 },
  kenji:  { x: 880, y: 680 },
  elif:   { x: 1460, y: 200 },
};

const WALK_TARGETS = [
  { x: 1420, y: 700 },  // lounge coffee
  { x: 1500, y: 750 },  // lounge sofa
  { x: 600, y: 460 },   // corridor left
  { x: 1000, y: 460 },  // corridor center
  { x: 1400, y: 460 },  // corridor right
  { x: 1000, y: 1160 }, // conference room
];

const FALLBACK_WORKERS: OfficeWorker[] = [
  { id: "sophia", name: "Sophia", role: "Chief of Staff", department: "Executive", status: "active", isManager: true, tools: 16 },
  { id: "ayse", name: "Ayşe", role: "CFO", department: "Finance", status: "active", isManager: false, tools: 12 },
  { id: "marco", name: "Marco", role: "Sales Director", department: "Sales", status: "idle", isManager: false, tools: 10 },
  { id: "kenji", name: "Kenji", role: "Ops Manager", department: "Operations", status: "active", isManager: false, tools: 10 },
  { id: "elif", name: "Elif", role: "HR Director", department: "HR", status: "idle", isManager: false, tools: 7 },
];

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Working", color: "text-green-400" },
  idle: { label: "Idle", color: "text-yellow-400" },
  stuck: { label: "Needs Help", color: "text-red-400" },
  offline: { label: "Offline", color: "text-gray-500" },
};

const deptColors: Record<string, { bg: string; text: string; border: string }> = {
  Executive: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  Finance: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  Sales: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  Operations: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
  HR: { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/30" },
  "Human Resources": { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/30" },
};

// ============================================================
// SVG Drawing Helpers
// ============================================================
function Desk({ x, y, glow }: { x: number; y: number; glow: string }) {
  return (
    <g>
      {/* Desk surface */}
      <rect x={x} y={y+10} width={80} height={40} rx={2} fill="#3d2e1e" stroke="#5a4232" strokeWidth={1} />
      <rect x={x+2} y={y+12} width={76} height={6} fill="#5a4232" />
      {/* Legs */}
      <rect x={x+6} y={y+50} width={6} height={20} fill="#2d1e10" />
      <rect x={x+68} y={y+50} width={6} height={20} fill="#2d1e10" />
      {/* Monitor */}
      <rect x={x+24} y={y-16} width={32} height={24} rx={2} fill="#111118" stroke="#2a2a3e" strokeWidth={1} />
      <rect x={x+27} y={y-13} width={26} height={16} fill="#0a0a14" />
      {/* Screen glow */}
      <rect x={x+28} y={y-12} width={12} height={4} fill={glow} opacity={0.5} />
      <rect x={x+30} y={y-7} width={16} height={3} fill={glow} opacity={0.3} />
      <rect x={x+28} y={y-3} width={10} height={3} fill={glow} opacity={0.2} />
      {/* Monitor stand */}
      <rect x={x+36} y={y+8} width={8} height={4} fill="#2a2a3e" />
      {/* Keyboard */}
      <rect x={x+22} y={y+20} width={36} height={8} rx={1} fill="#1a1a2a" stroke="#2a2a3e" strokeWidth={0.5} />
      {/* Mouse */}
      <ellipse cx={x+66} cy={y+26} rx={5} ry={4} fill="#1a1a2a" stroke="#2a2a3e" strokeWidth={0.5} />
      {/* Chair (behind desk) */}
      <rect x={x+28} y={y+72} width={24} height={18} rx={4} fill="#1e1e30" stroke="#2a2a42" strokeWidth={1} />
      <rect x={x+32} y={y+62} width={16} height={12} rx={3} fill="#24243a" stroke="#2a2a42" strokeWidth={1} />
    </g>
  );
}

function ConfTable({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={200} height={80} rx={8} fill="#2d2216" stroke="#4a3828" strokeWidth={2} />
      <rect x={x+10} y={y+4} width={180} height={72} rx={6} fill="#3d2e1e" />
      {/* Chairs around */}
      {[0, 50, 100, 150].map((cx) => (
        <g key={`ctop-${cx}`}><ellipse cx={x+25+cx} cy={y-14} rx={14} ry={10} fill="#1e1e30" stroke="#2a2a42" strokeWidth={1} /></g>
      ))}
      {[0, 50, 100, 150].map((cx) => (
        <g key={`cbot-${cx}`}><ellipse cx={x+25+cx} cy={y+94} rx={14} ry={10} fill="#1e1e30" stroke="#2a2a42" strokeWidth={1} /></g>
      ))}
    </g>
  );
}

function Sofa({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={100} height={40} rx={6} fill="#2a1e3a" stroke="#3a2e4e" strokeWidth={1} />
      <rect x={x+4} y={y+4} width={30} height={32} rx={4} fill="#342848" />
      <rect x={x+36} y={y+4} width={28} height={32} rx={4} fill="#342848" />
      <rect x={x+66} y={y+4} width={30} height={32} rx={4} fill="#342848" />
    </g>
  );
}

function CoffeeMachine({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={30} height={40} rx={2} fill="#222" stroke="#444" strokeWidth={1} />
      <rect x={x+6} y={y+6} width={18} height={12} rx={1} fill="#111" />
      <circle cx={x+15} cy={y+11} r={4} fill="#1a1a1a" stroke="#F97316" strokeWidth={1} />
      <rect x={x+8} y={y+28} width={14} height={8} rx={1} fill="#333" />
      <text x={x+15} y={y+54} textAnchor="middle" fill="#666" fontSize={8} fontFamily="monospace">☕</text>
    </g>
  );
}

function Whiteboard({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={50} rx={2} fill="#e8e8e8" stroke="#ccc" strokeWidth={1} />
      <rect x={x+6} y={y+6} width={w-12} height={38} fill="#f5f5f5" />
      {/* scribbles */}
      <line x1={x+12} y1={y+14} x2={x+w/2} y2={y+14} stroke="#3B82F6" strokeWidth={1.5} opacity={0.4} />
      <line x1={x+12} y1={y+22} x2={x+w*0.7} y2={y+22} stroke="#10B981" strokeWidth={1.5} opacity={0.4} />
      <line x1={x+12} y1={y+30} x2={x+w*0.4} y2={y+30} stroke="#F97316" strokeWidth={1.5} opacity={0.3} />
    </g>
  );
}

function Plant({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <rect x={x+s*0.25} y={y+s*0.6} width={s*0.5} height={s*0.4} rx={2} fill="#7B5B3A" />
      <ellipse cx={x+s*0.5} cy={y+s*0.35} rx={s*0.4} ry={s*0.35} fill="#22C55E" />
      <ellipse cx={x+s*0.35} cy={y+s*0.25} rx={s*0.25} ry={s*0.25} fill="#16A34A" />
      <ellipse cx={x+s*0.65} cy={y+s*0.28} rx={s*0.22} ry={s*0.22} fill="#15803D" />
    </g>
  );
}

function FileCabinet({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={24} height={50} rx={1} fill="#2a2a3a" stroke="#3a3a4e" strokeWidth={1} />
      <rect x={x+3} y={y+4} width={18} height={13} rx={1} fill="#222236" stroke="#3a3a4e" strokeWidth={0.5} />
      <rect x={x+3} y={y+20} width={18} height={13} rx={1} fill="#222236" stroke="#3a3a4e" strokeWidth={0.5} />
      <rect x={x+3} y={y+36} width={18} height={13} rx={1} fill="#222236" stroke="#3a3a4e" strokeWidth={0.5} />
      {/* handles */}
      <rect x={x+9} y={y+9} width={6} height={2} rx={1} fill="#4a4a5e" />
      <rect x={x+9} y={y+25} width={6} height={2} rx={1} fill="#4a4a5e" />
      <rect x={x+9} y={y+41} width={6} height={2} rx={1} fill="#4a4a5e" />
    </g>
  );
}

// ============================================================
// Main Component
// ============================================================
export function VirtualOffice() {
  const [pan, setPan] = useState({ x: -300, y: -50 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [workers, setWorkers] = useState<OfficeWorker[]>(FALLBACK_WORKERS);
  const [anims, setAnims] = useState<Record<string, WorkerAnim>>({});
  const router = useRouter();
  const zoom = 0.7; // fixed zoom, no scroll zoom

  // ---- Drag to Pan ----
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    setPan({ x: dragStart.current.panX + (e.clientX - dragStart.current.x), y: dragStart.current.panY + (e.clientY - dragStart.current.y) });
  }, [dragging]);
  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  // ---- Touch support ----
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { x: t.clientX, y: t.clientY, panX: pan.x, panY: pan.y };
  };
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    setPan({ x: dragStart.current.panX + (t.clientX - dragStart.current.x), y: dragStart.current.panY + (t.clientY - dragStart.current.y) });
  }, [dragging]);

  useEffect(() => {
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleMouseUp);
    return () => { window.removeEventListener("touchmove", handleTouchMove); window.removeEventListener("touchend", handleMouseUp); };
  }, [handleTouchMove, handleMouseUp]);

  // ---- Workers from API ----
  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch("/api/workers");
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.workers;
      if (Array.isArray(list) && list.length > 0) {
        setWorkers(list.map((w: Record<string, unknown>) => ({
          id: String(w.id), name: String(w.name), role: String(w.role),
          department: (w.settings as Record<string, string>)?.department_name || "General",
          status: (w.status as OfficeWorker["status"]) || "offline",
          isManager: Boolean(w.is_manager || w.isManager),
          tools: Array.isArray(w.tools) ? (w.tools as unknown[]).length : 0,
        })));
      }
    } catch { /* fallback */ }
  }, []);

  useEffect(() => { fetchWorkers(); const iv = setInterval(fetchWorkers, 30000); return () => clearInterval(iv); }, [fetchWorkers]);

  // ---- Anim init ----
  useEffect(() => {
    const init: Record<string, WorkerAnim> = {};
    const dPos = Object.values(HOME);
    workers.forEach((w, i) => {
      const h = HOME[w.id.toLowerCase()] || dPos[i % dPos.length];
      if (!anims[w.id]) init[w.id] = { state: w.status === "active" ? "typing" : "idle", x: h.x, y: h.y, targetX: h.x, targetY: h.y };
    });
    if (Object.keys(init).length > 0) setAnims((p) => ({ ...p, ...init }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workers]);

  // ---- Autonomous behavior ----
  useEffect(() => {
    const dPos = Object.values(HOME);
    const iv = setInterval(() => {
      setAnims((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          const a = next[id]; if (!a) continue;
          const w = workers.find((w) => w.id === id);
          if (!w || w.status === "offline") continue;
          if (a.state === "walking") {
            const dx = a.targetX - a.x, dy = a.targetY - a.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 10) {
              const hm = HOME[id.toLowerCase()] || dPos[0];
              next[id] = { ...a, x: a.targetX, y: a.targetY, state: (Math.abs(a.x - hm.x) < 30) ? (w.status === "active" ? "typing" : "idle") : "idle" };
            } else {
              next[id] = { ...a, x: a.x + (dx / dist) * 6, y: a.y + (dy / dist) * 6 };
            }
            continue;
          }
          const r = Math.random();
          if (r < 0.01) {
            const dest = Math.random() < 0.4 ? WALK_TARGETS[Math.floor(Math.random() * WALK_TARGETS.length)] : HOME[id.toLowerCase()] || dPos[0];
            next[id] = { ...a, state: "walking", targetX: dest.x + (Math.random() - 0.5) * 30, targetY: dest.y + (Math.random() - 0.5) * 30 };
          } else if (r < 0.018) {
            const opts: AnimState[] = w.status === "active" ? ["typing", "typing", "chatting", "idle"] : ["idle", "idle", "chatting"];
            next[id] = { ...a, state: opts[Math.floor(Math.random() * opts.length)] };
          }
        }
        return next;
      });
    }, 400);
    return () => clearInterval(iv);
  }, [workers]);

  const dPos = Object.values(HOME);

  return (
    <div className="relative h-full w-full overflow-hidden"
      onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}
      style={{ cursor: dragging ? "grabbing" : "grab", background: "#080810" }}>

      {/* World */}
      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", position: "absolute" }}>
        <svg width={OW} height={OH} viewBox={`0 0 ${OW} ${OH}`} xmlns="http://www.w3.org/2000/svg">
          {/* Overall floor / corridor */}
          <rect width={OW} height={OH} fill="#0c0c16" />
          {/* Corridor floor - tiled pattern */}
          <defs>
            <pattern id="tile" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#10101c" />
              <rect x="0" y="0" width="20" height="20" fill="#11111e" />
              <rect x="20" y="20" width="20" height="20" fill="#11111e" />
            </pattern>
            <pattern id="carpet" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="transparent" />
              <rect x="0" y="0" width="4" height="4" fill="rgba(255,255,255,0.008)" />
            </pattern>
          </defs>
          <rect x={0} y={400} width={OW} height={120} fill="url(#tile)" />

          {/* Room floors & walls */}
          {ROOMS.map((r) => (
            <g key={r.id}>
              {/* Floor */}
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={4} fill={r.floorColor} />
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={4} fill="url(#carpet)" />
              {/* Walls */}
              <rect x={r.x - WALL} y={r.y - WALL} width={r.w + WALL * 2} height={WALL} fill={r.wallColor} /> {/* top */}
              <rect x={r.x - WALL} y={r.y + r.h} width={r.w + WALL * 2} height={WALL} fill={r.wallColor} /> {/* bottom */}
              <rect x={r.x - WALL} y={r.y} width={WALL} height={r.h} fill={r.wallColor} /> {/* left */}
              <rect x={r.x + r.w} y={r.y} width={WALL} height={r.h} fill={r.wallColor} /> {/* right */}
              {/* Door gap (bottom wall center) */}
              <rect x={r.x + r.w / 2 - 30} y={r.y + r.h} width={60} height={WALL} fill={r.floorColor} />
              {/* Door frame */}
              <rect x={r.x + r.w / 2 - 32} y={r.y + r.h} width={4} height={WALL + 2} fill={r.accent} opacity={0.4} />
              <rect x={r.x + r.w / 2 + 28} y={r.y + r.h} width={4} height={WALL + 2} fill={r.accent} opacity={0.4} />
              {/* Room label */}
              <text x={r.x + 16} y={r.y + 24} fill={r.accent} opacity={0.5} fontSize={13} fontWeight="bold" fontFamily="monospace" letterSpacing={2}>
                {r.label.toUpperCase()}
              </text>
              {/* Accent strip on ceiling */}
              <rect x={r.x} y={r.y - WALL} width={r.w} height={2} fill={r.accent} opacity={0.3} />
            </g>
          ))}

          {/* Conference room */}
          <rect x={CONF.x} y={CONF.y} width={CONF.w} height={CONF.h} rx={4} fill={CONF.floorColor} />
          <rect x={CONF.x - WALL} y={CONF.y - WALL} width={CONF.w + WALL * 2} height={WALL} fill={CONF.wallColor} />
          <rect x={CONF.x - WALL} y={CONF.y + CONF.h} width={CONF.w + WALL * 2} height={WALL} fill={CONF.wallColor} />
          <rect x={CONF.x - WALL} y={CONF.y} width={WALL} height={CONF.h} fill={CONF.wallColor} />
          <rect x={CONF.x + CONF.w} y={CONF.y} width={WALL} height={CONF.h} fill={CONF.wallColor} />
          <rect x={CONF.x + CONF.w / 2 - 30} y={CONF.y - WALL} width={60} height={WALL} fill={CONF.floorColor} />
          <text x={CONF.x + 16} y={CONF.y + 24} fill={CONF.accent} opacity={0.5} fontSize={12} fontWeight="bold" fontFamily="monospace" letterSpacing={2}>CONFERENCE ROOM</text>
          <ConfTable x={CONF.x + 100} y={CONF.y + 80} />

          {/* Whiteboards */}
          <Whiteboard x={170} y={50} w={140} />
          <Whiteboard x={750} y={50} w={160} />
          <Whiteboard x={170} y={530} w={120} />
          <Whiteboard x={750} y={530} w={140} />

          {/* File cabinets */}
          <FileCabinet x={520} y={100} />
          <FileCabinet x={520} y={170} />
          <FileCabinet x={1100} y={100} />
          <FileCabinet x={1680} y={100} />
          <FileCabinet x={520} y={580} />
          <FileCabinet x={1100} y={580} />

          {/* Desks */}
          <Desk x={240} y={140} glow="#10B981" />
          <Desk x={840} y={140} glow="#8B5CF6" />
          <Desk x={1420} y={140} glow="#EC4899" />
          <Desk x={240} y={620} glow="#3B82F6" />
          <Desk x={840} y={620} glow="#F97316" />

          {/* Lounge */}
          <Sofa x={1260} y={600} />
          <Sofa x={1260} y={700} />
          <CoffeeMachine x={1640} y={560} />
          <rect x={1380} y={640} width={60} height={40} rx={4} fill="#1a1a28" stroke="#2a2a3e" strokeWidth={1} /> {/* coffee table */}

          {/* Plants everywhere */}
          {[
            [60, 350], [540, 350], [630, 350], [1120, 350], [1210, 350], [1700, 350],
            [60, 870], [540, 870], [1120, 870], [1700, 870],
            [1760, 560], [1760, 700],
            [60, 460], [1800, 460],
          ].map(([px, py], i) => <Plant key={`p${i}`} x={px} y={py} s={28} />)}

          {/* Corridor details */}
          <text x={OW / 2} y={470} textAnchor="middle" fill="#ffffff" opacity={0.03} fontSize={16} fontWeight="bold" fontFamily="monospace" letterSpacing={8}>MAIN CORRIDOR</text>
          {/* Floor arrows */}
          {[200, 600, 1000, 1400, 1800].map((ax) => (
            <polygon key={`arrow-${ax}`} points={`${ax},455 ${ax+8},460 ${ax},465`} fill="#ffffff" opacity={0.02} />
          ))}
        </svg>

        {/* HTML workers (positioned over SVG) */}
        {workers.slice(0, 8).map((worker, i) => {
          const anim = anims[worker.id];
          const hm = HOME[worker.id.toLowerCase()] || dPos[i % dPos.length];
          const px = anim?.x ?? hm.x;
          const py = anim?.y ?? hm.y;
          const charState = anim?.state ?? "idle";
          const isSelected = selectedWorker === worker.id;
          const dept = deptColors[worker.department] || deptColors.Executive;
          const si = statusLabels[worker.status] || statusLabels.offline;

          return (
            <div key={worker.id} className="absolute" style={{ left: px, top: py, transform: "translate(-50%, -50%)", zIndex: isSelected ? 50 : 20 }}>
              {isSelected && <div className="absolute -inset-8 rounded-2xl bg-purple-500/10 ring-1 ring-purple-500/30" />}
              <div className="flex flex-col items-center">
                <div className={cn("mb-1 flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[13px] font-semibold whitespace-nowrap shadow-lg",
                  isSelected ? "bg-card ring-1 ring-purple-500/30" : "bg-card/80")}>
                  <span className={cn("h-2 w-2 rounded-full",
                    worker.status === "active" ? "bg-green-400 pulse-active" :
                    worker.status === "idle" ? "bg-yellow-400" :
                    worker.status === "stuck" ? "bg-red-400 animate-pulse" : "bg-gray-500")} />
                  {worker.name}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setSelectedWorker(isSelected ? null : worker.id); }}
                  className="relative cursor-pointer transition-transform hover:scale-110 active:scale-95">
                  <PixelCharacter characterId={worker.id.toLowerCase()} state={charState} selected={isSelected} size={60} />
                </button>
                <div className={cn("mt-1 rounded-md border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shadow-sm", dept.bg, dept.text, dept.border)}>
                  {worker.role}
                </div>
              </div>
              {isSelected && (
                <div className="absolute left-1/2 top-full z-50 mt-4 -translate-x-1/2 animate-fade-in-up">
                  <div className="w-60 rounded-xl border border-border bg-card p-4 shadow-2xl ring-1 ring-white/5">
                    <div className="mb-3 flex items-center justify-between">
                      <div><p className="text-sm font-semibold">{worker.name}</p><p className={cn("text-xs", si.color)}>{si.label}</p></div>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedWorker(null); }} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{worker.tools} tools</span>
                      <span className={cn("rounded-md border px-1.5 py-0.5", dept.bg, dept.text, dept.border)}>{worker.department}</span>
                      {worker.isManager && <span className="rounded-md border border-purple-500/30 bg-purple-500/15 px-1.5 py-0.5 text-purple-400">Manager</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/chat/${worker.id}`); }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-2.5 text-xs font-medium text-white shadow-lg">
                        <MessageSquare className="h-4 w-4" /> Chat
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/workers/${worker.id}`); }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs font-medium hover:bg-secondary">
                        <Settings2 className="h-4 w-4" /> Manage
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* HUD */}
      <div className="absolute bottom-4 left-4 z-40 flex items-center gap-4 rounded-xl border border-border bg-card/90 px-4 py-2.5 text-[12px] backdrop-blur-sm shadow-xl">
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-green-400" />{workers.filter(w => w.status === "active").length} active</span>
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-yellow-400" />{workers.filter(w => w.status === "idle").length} idle</span>
        <span className="text-muted-foreground/30">|</span>
        <span className="text-muted-foreground">{workers.length} workers</span>
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 rounded-full border border-border bg-card/70 px-5 py-2 text-[12px] text-muted-foreground backdrop-blur-sm shadow-xl pointer-events-none animate-fade-in-up">
        Drag to navigate the office · Click a worker to interact
      </div>
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2 rounded-xl border border-border bg-card/90 px-4 py-2 backdrop-blur-sm shadow-xl">
        <span className="text-sm font-bold text-gradient">OrchestraOS</span>
        <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Office</span>
      </div>
    </div>
  );
}
