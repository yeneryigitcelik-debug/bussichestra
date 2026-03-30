"use client";

interface FurnitureProps {
  size?: number;
}

export function PixelDesk({ size = 64 }: FurnitureProps) {
  const px = size / 16;
  return (
    <svg width={size} height={size * 0.75} viewBox={`0 0 ${16*px} ${12*px}`} style={{ imageRendering: "pixelated" }}>
      <rect x={0} y={2*px} width={16*px} height={2*px} fill="#5C4033" />
      <rect x={0} y={2*px} width={16*px} height={px} fill="#7B5B3A" />
      <rect x={px} y={4*px} width={2*px} height={6*px} fill="#4A3728" />
      <rect x={13*px} y={4*px} width={2*px} height={6*px} fill="#4A3728" />
      <rect x={2*px} y={7*px} width={12*px} height={px} fill="#5C4033" />
    </svg>
  );
}

export function PixelMonitor({ size = 32, glowColor = "#3B82F6" }: FurnitureProps & { glowColor?: string }) {
  const px = size / 8;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${8*px} ${8*px}`} style={{ imageRendering: "pixelated" }}>
      {/* Screen frame */}
      <rect x={px} y={0} width={6*px} height={5*px} fill="#1a1a2e" />
      <rect x={px} y={0} width={6*px} height={px*0.5} fill="#2a2a4e" />
      {/* Screen content */}
      <rect x={2*px} y={px} width={4*px} height={3*px} fill="#1E293B" />
      {/* Screen glow bars */}
      <rect x={2*px} y={px} width={2*px} height={px} fill={glowColor} opacity="0.4" />
      <rect x={3*px} y={2*px} width={2*px} height={px} fill={glowColor} opacity="0.3" />
      <rect x={2*px} y={3*px} width={3*px} height={px*0.5} fill={glowColor} opacity="0.2" />
      {/* Stand */}
      <rect x={3*px} y={5*px} width={2*px} height={px} fill="#3a3a5a" />
      <rect x={2*px} y={6*px} width={4*px} height={px} fill="#3a3a5a" />
    </svg>
  );
}

export function PixelChair({ size = 32 }: FurnitureProps) {
  const px = size / 8;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${8*px} ${8*px}`} style={{ imageRendering: "pixelated" }}>
      <rect x={px} y={3*px} width={6*px} height={2*px} fill="#4A3728" />
      <rect x={px} y={3*px} width={6*px} height={px} fill="#6B4F3A" />
      <rect x={px} y={0} width={6*px} height={3*px} fill="#5C4033" />
      <rect x={2*px} y={px} width={4*px} height={px} fill="#7B5B3A" />
      <rect x={px} y={5*px} width={px} height={3*px} fill="#3a3a3a" />
      <rect x={6*px} y={5*px} width={px} height={3*px} fill="#3a3a3a" />
    </svg>
  );
}

export function PixelPlant({ size = 24 }: FurnitureProps) {
  const px = size / 8;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${8*px} ${8*px}`} style={{ imageRendering: "pixelated" }}>
      <rect x={3*px} y={0} width={2*px} height={px} fill="#22C55E" />
      <rect x={2*px} y={px} width={4*px} height={px} fill="#16A34A" />
      <rect x={px} y={2*px} width={6*px} height={px} fill="#22C55E" />
      <rect x={2*px} y={3*px} width={4*px} height={px} fill="#15803D" />
      <rect x={3*px} y={4*px} width={2*px} height={px} fill="#166534" />
      <rect x={2*px} y={5*px} width={4*px} height={px} fill="#92400E" />
      <rect x={2*px} y={6*px} width={4*px} height={2*px} fill="#B45309" />
    </svg>
  );
}

export function PixelCoffee({ size = 16 }: FurnitureProps) {
  const px = size / 4;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${4*px} ${4*px}`} style={{ imageRendering: "pixelated" }}>
      <rect x={px} y={0} width={px} height={px} fill="#D1D5DB" opacity="0.4" />
      <rect x={0} y={px} width={3*px} height={2*px} fill="#FAFAFA" />
      <rect x={3*px} y={px} width={px} height={px} fill="#FAFAFA" />
      <rect x={0} y={3*px} width={3*px} height={px} fill="#E5E7EB" />
    </svg>
  );
}

export function PixelSpeechBubble({ size = 20 }: FurnitureProps) {
  const px = size / 8;
  return (
    <svg width={size} height={size * 0.75} viewBox={`0 0 ${8*px} ${6*px}`} style={{ imageRendering: "pixelated" }}>
      <rect x={0} y={0} width={8*px} height={4*px} rx={px} fill="rgba(139,92,246,0.85)" />
      <rect x={px} y={px} width={2*px} height={px*0.5} fill="#fff" opacity="0.8" />
      <rect x={4*px} y={px} width={3*px} height={px*0.5} fill="#fff" opacity="0.8" />
      <rect x={px} y={2*px} width={5*px} height={px*0.5} fill="#fff" opacity="0.6" />
      <rect x={2*px} y={4*px} width={2*px} height={2*px} fill="rgba(139,92,246,0.85)" />
    </svg>
  );
}
