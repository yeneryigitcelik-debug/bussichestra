"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PixelCharacterProps {
  characterId: string;
  state?: "typing" | "idle" | "walking" | "chatting" | "stuck";
  direction?: "down" | "left" | "right";
  selected?: boolean;
  size?: number;
}

const CHARACTERS: Record<string, {
  hair: string; skin: string; eyes: string;
  shirt: string; shirtAccent: string; pants: string; shoes: string;
}> = {
  sophia: { hair: "#2D1B4E", skin: "#F4C49C", eyes: "#8B5CF6", shirt: "#6D28D9", shirtAccent: "#A78BFA", pants: "#3B0764", shoes: "#1E1B4B" },
  ayse:   { hair: "#1A1A2E", skin: "#F4C49C", eyes: "#10B981", shirt: "#065F46", shirtAccent: "#34D399", pants: "#1E3A2F", shoes: "#0F172A" },
  marco:  { hair: "#3B2506", skin: "#D4A574", eyes: "#3B82F6", shirt: "#1E40AF", shirtAccent: "#60A5FA", pants: "#1E3A5F", shoes: "#0F172A" },
  kenji:  { hair: "#0F172A", skin: "#F5DEB3", eyes: "#F97316", shirt: "#C2410C", shirtAccent: "#FB923C", pants: "#431407", shoes: "#1C1917" },
  elif:   { hair: "#7C2D12", skin: "#F4C49C", eyes: "#EC4899", shirt: "#BE185D", shirtAccent: "#F472B6", pants: "#5B1A3A", shoes: "#1E1B4B" },
};

function getCharColors(id: string) {
  if (CHARACTERS[id]) return CHARACTERS[id];
  const hue = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return {
    hair: `hsl(${hue}, 30%, 15%)`, skin: "#F4C49C", eyes: `hsl(${hue}, 70%, 55%)`,
    shirt: `hsl(${hue}, 60%, 30%)`, shirtAccent: `hsl(${hue}, 70%, 50%)`,
    pants: `hsl(${hue}, 40%, 18%)`, shoes: "#1C1917",
  };
}

export function PixelCharacter({ characterId, state = "idle", selected = false, size = 48 }: PixelCharacterProps) {
  const c = getCharColors(characterId);
  const px = size / 16;
  const [frame, setFrame] = useState(0);

  // Animation frame toggle for walking
  useEffect(() => {
    if (state === "walking") {
      const interval = setInterval(() => setFrame((f) => (f + 1) % 2), 400);
      return () => clearInterval(interval);
    }
    if (state === "chatting") {
      const interval = setInterval(() => setFrame((f) => (f + 1) % 3), 500);
      return () => clearInterval(interval);
    }
    setFrame(0);
  }, [state]);

  const isTyping = state === "typing";
  const isWalking = state === "walking";
  const isChatting = state === "chatting";
  const isStuck = state === "stuck";

  // Walking leg animation offsets - bigger movement for visibility
  const legOffset = isWalking ? (frame === 0 ? 2 : -2) : 0;

  return (
    <div className="relative" style={{ width: size, height: size * 1.5 }}>
      {/* Selection glow */}
      {selected && (
        <div
          className="absolute inset-0 rounded-sm"
          style={{
            boxShadow: `0 0 ${size/3}px rgba(139, 92, 246, 0.6), 0 0 ${size/6}px rgba(139, 92, 246, 0.3)`,
            zIndex: 0,
          }}
        />
      )}

      {/* Stuck exclamation */}
      {isStuck && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <svg width={size * 0.3} height={size * 0.3} viewBox="0 0 8 8" style={{ imageRendering: "pixelated" }}>
            <rect x="3" y="0" width="2" height="5" fill="#EF4444" />
            <rect x="3" y="6" width="2" height="2" fill="#EF4444" />
          </svg>
        </div>
      )}

      {/* Chat speech bubble */}
      {isChatting && (
        <div className={cn(
          "absolute -top-4 z-10",
          frame === 0 ? "left-[60%]" : frame === 1 ? "left-[55%]" : "left-[65%]"
        )} style={{ transition: "left 0.3s ease" }}>
          <svg width={size * 0.4} height={size * 0.3} viewBox="0 0 10 8" style={{ imageRendering: "pixelated" }}>
            <rect x="0" y="0" width="10" height="6" rx="1" fill="rgba(139,92,246,0.8)" />
            <rect x="1" y="1" width="2" height="1" fill="#fff" />
            <rect x="4" y="1" width="4" height="1" fill="#fff" />
            <rect x="1" y="3" width="5" height="1" fill="#fff" />
            <rect x="2" y="6" width="2" height="2" fill="rgba(139,92,246,0.8)" />
          </svg>
        </div>
      )}

      <svg
        width={size}
        height={size * 1.5}
        viewBox={`0 0 ${16 * px} ${24 * px}`}
        style={{ imageRendering: "pixelated" }}
        className={cn(
          isTyping && "animate-[typing-bob_0.6s_ease-in-out_infinite]",
          state === "idle" && "animate-[idle-breathe_3s_ease-in-out_infinite]",
          isWalking && "animate-[walk-bounce_0.4s_ease-in-out_infinite]",
          isChatting && "animate-[chat-gesture_1s_ease-in-out_infinite]",
        )}
      >
        {/* Hair / Head top */}
        <rect x={5*px} y={0} width={6*px} height={px} fill={c.hair} />
        <rect x={4*px} y={px} width={8*px} height={px} fill={c.hair} />
        <rect x={3*px} y={2*px} width={10*px} height={px} fill={c.hair} />

        {/* Face */}
        <rect x={4*px} y={3*px} width={8*px} height={px} fill={c.skin} />
        <rect x={3*px} y={3*px} width={px} height={px} fill={c.hair} />
        <rect x={12*px} y={3*px} width={px} height={px} fill={c.hair} />

        {/* Eyes row */}
        <rect x={4*px} y={4*px} width={8*px} height={px} fill={c.skin} />
        <rect x={5*px} y={4*px} width={2*px} height={px} fill={c.eyes} />
        <rect x={9*px} y={4*px} width={2*px} height={px} fill={c.eyes} />

        {/* Nose/mouth */}
        <rect x={4*px} y={5*px} width={8*px} height={px} fill={c.skin} />
        <rect x={6*px} y={6*px} width={4*px} height={px} fill={c.skin} />
        <rect x={7*px} y={6*px} width={2*px} height={px} fill={isStuck ? "#EF4444" : "#E8956A"} />

        {/* Neck */}
        <rect x={6*px} y={7*px} width={4*px} height={px} fill={c.skin} />

        {/* Shoulders & shirt */}
        <rect x={3*px} y={8*px} width={10*px} height={px} fill={c.shirt} />
        <rect x={2*px} y={9*px} width={12*px} height={px} fill={c.shirt} />
        <rect x={6*px} y={9*px} width={4*px} height={px} fill={c.shirtAccent} />

        {/* Torso */}
        <rect x={2*px} y={10*px} width={12*px} height={px} fill={c.shirt} />
        <rect x={7*px} y={10*px} width={2*px} height={px} fill={c.shirtAccent} />
        <rect x={3*px} y={11*px} width={10*px} height={px} fill={c.shirt} />
        <rect x={7*px} y={11*px} width={2*px} height={px} fill={c.shirtAccent} />
        <rect x={3*px} y={12*px} width={10*px} height={px} fill={c.shirt} />

        {/* Arms */}
        {isTyping ? (
          <>
            <rect x={1*px} y={9*px} width={px} height={3*px} fill={c.shirt} />
            <rect x={0} y={11*px} width={px} height={2*px} fill={c.skin} />
            <rect x={14*px} y={9*px} width={px} height={3*px} fill={c.shirt} />
            <rect x={15*px} y={11*px} width={px} height={2*px} fill={c.skin} />
          </>
        ) : isChatting ? (
          <>
            {/* One arm up (gesturing) */}
            <rect x={1*px} y={9*px} width={px} height={4*px} fill={c.shirt} />
            <rect x={1*px} y={13*px} width={px} height={px} fill={c.skin} />
            <rect x={14*px} y={8*px} width={px} height={2*px} fill={c.shirt} />
            <rect x={15*px} y={7*px} width={px} height={2*px} fill={c.skin} />
          </>
        ) : (
          <>
            <rect x={1*px} y={9*px} width={px} height={4*px} fill={c.shirt} />
            <rect x={1*px} y={13*px} width={px} height={px} fill={c.skin} />
            <rect x={14*px} y={9*px} width={px} height={4*px} fill={c.shirt} />
            <rect x={14*px} y={13*px} width={px} height={px} fill={c.skin} />
          </>
        )}

        {/* Belt */}
        <rect x={4*px} y={13*px} width={8*px} height={px} fill="#2A2A3A" />

        {/* Pants */}
        <rect x={4*px} y={14*px} width={8*px} height={px} fill={c.pants} />

        {isWalking ? (
          <>
            {/* Walking legs - alternating positions */}
            <rect x={(4 + legOffset)*px} y={15*px} width={3*px} height={px} fill={c.pants} />
            <rect x={(9 - legOffset)*px} y={15*px} width={3*px} height={px} fill={c.pants} />
            <rect x={(4 + legOffset)*px} y={16*px} width={3*px} height={px} fill={c.pants} />
            <rect x={(9 - legOffset)*px} y={16*px} width={3*px} height={px} fill={c.pants} />
            <rect x={(4 + legOffset)*px} y={17*px} width={3*px} height={px} fill={c.pants} />
            <rect x={(9 - legOffset)*px} y={17*px} width={3*px} height={px} fill={c.pants} />
            {/* Walking shoes */}
            <rect x={(3 + legOffset)*px} y={18*px} width={4*px} height={px} fill={c.shoes} />
            <rect x={(9 - legOffset)*px} y={18*px} width={4*px} height={px} fill={c.shoes} />
          </>
        ) : (
          <>
            <rect x={4*px} y={15*px} width={3*px} height={px} fill={c.pants} />
            <rect x={9*px} y={15*px} width={3*px} height={px} fill={c.pants} />
            <rect x={4*px} y={16*px} width={3*px} height={px} fill={c.pants} />
            <rect x={9*px} y={16*px} width={3*px} height={px} fill={c.pants} />
            <rect x={4*px} y={17*px} width={3*px} height={px} fill={c.pants} />
            <rect x={9*px} y={17*px} width={3*px} height={px} fill={c.pants} />
            <rect x={3*px} y={18*px} width={4*px} height={px} fill={c.shoes} />
            <rect x={9*px} y={18*px} width={4*px} height={px} fill={c.shoes} />
          </>
        )}
      </svg>
    </div>
  );
}
