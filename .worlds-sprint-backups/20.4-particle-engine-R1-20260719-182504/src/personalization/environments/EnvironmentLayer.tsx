import { useMemo } from "react";
import { getEnvironment } from "./registry";
import { normalizeEnvironmentSettings } from "./types";
import type { EnvironmentSettings } from "./types";
import "./EnvironmentLayer.css";

type Props = { settings?: EnvironmentSettings };

export default function EnvironmentLayer({ settings }: Props) {
  const value = normalizeEnvironmentSettings(settings);
  const environment = getEnvironment(value.environmentId);
  const particles = useMemo(() => Array.from({ length: Math.round(8 + value.particleIntensity * .42) }, (_, index) => ({
    id: index,
    x: (index * 37 + 13) % 100,
    y: (index * 61 + 7) % 100,
    delay: -((index * 0.71) % 12),
    size: 2 + ((index * 17) % 7),
    drift: 18 + ((index * 23) % 48),
  })), [value.particleIntensity]);
  const warmth = value.lighting.warmth - 50;
  const speed = 18 - value.particleSpeed * .13;
  return <div className="world-environment" aria-hidden="true" style={{
    "--world-background": environment.background,
    "--world-overlay": environment.overlay,
    "--world-brightness": `${value.lighting.brightness}%`,
    "--world-warmth": `${warmth > 0 ? warmth * .18 : 0}%`,
    "--world-cool": `${warmth < 0 ? Math.abs(warmth) * .16 : 0}%`,
    "--world-vignette": `${value.lighting.vignette / 100}`,
    "--world-bloom": `${value.lighting.bloom}px`,
    "--world-grain": `${value.lighting.grain / 100}`,
    "--particle-speed": `${Math.max(3, speed)}s`,
    "--particle-accent": environment.accent,
  } as React.CSSProperties}>
    <div className="world-environment__backdrop" />
    {value.particlesEnabled && value.particleKind !== "none" ? <div className={`world-particles world-particles--${value.particleKind}`}>{particles.map((particle) => <i key={particle.id} style={{ left: `${particle.x}%`, top: `${particle.y}%`, width: particle.size, height: particle.size, animationDelay: `${particle.delay}s`, "--drift": `${particle.drift}px` } as React.CSSProperties}/>)}</div> : null}
    <div className="world-environment__grade" />
    <div className="world-environment__grain" />
  </div>;
}
