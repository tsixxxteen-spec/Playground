import { getEnvironment } from "./registry";
import { normalizeEnvironmentSettings } from "./types";
import type { EnvironmentSettings } from "./types";
import ParticleCanvas from "./ParticleCanvas";
import "./EnvironmentLayer.css";

type Props = { settings?: EnvironmentSettings };

export default function EnvironmentLayer({ settings }: Props) {
  const value = normalizeEnvironmentSettings(settings);
  const environment = getEnvironment(value.environmentId);
  const warmth = value.lighting.warmth - 50;
  return <div className="world-environment" aria-hidden="true" style={{
    "--world-background": environment.background,
    "--world-overlay": environment.overlay,
    "--world-brightness": `${value.lighting.brightness}%`,
    "--world-warmth": `${warmth > 0 ? warmth * .18 : 0}%`,
    "--world-cool": `${warmth < 0 ? Math.abs(warmth) * .16 : 0}%`,
    "--world-vignette": `${value.lighting.vignette / 100}`,
    "--world-bloom": `${value.lighting.bloom}px`,
    "--world-grain": `${value.lighting.grain / 100}`,
  } as React.CSSProperties}>
    <div className="world-environment__backdrop" />
    <div className="world-environment__grade" />
    <div className="world-environment__grain" />
    <ParticleCanvas
      enabled={value.particlesEnabled}
      kind={value.particleKind}
      intensity={value.particleIntensity}
      speed={value.particleSpeed}
      accent={environment.accent}
    />
  </div>;
}
