import { ENVIRONMENTS } from "./registry";
import type { EnvironmentSettings, ParticleKind } from "./types";
import "./EnvironmentStudio.css";

type Props = { value: EnvironmentSettings; onChange: (next: EnvironmentSettings) => void; mode?: "environment" | "effects" };
const PARTICLES: Array<{ id: ParticleKind; label: string; glyph: string }> = [
  { id: "none", label: "None", glyph: "○" }, { id: "dust", label: "Dust", glyph: "·" },
  { id: "rain", label: "Rain", glyph: "╱" }, { id: "snow", label: "Snow", glyph: "✦" },
  { id: "fireflies", label: "Fireflies", glyph: "✧" }, { id: "embers", label: "Embers", glyph: "⁕" },
  { id: "stars", label: "Stars", glyph: "✶" },
];

function Range({ label, value, min = 0, max = 100, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (value: number) => void }) {
  return <label className="environment-studio__range"><span>{label}<b>{Math.round(value)}</b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export default function EnvironmentStudio({ value, onChange, mode = "environment" }: Props) {
  const updateLighting = (key: keyof EnvironmentSettings["lighting"], next: number) => onChange({ ...value, lighting: { ...value.lighting, [key]: next } });
  if (mode === "effects") return <div className="environment-studio environment-studio--effects">
    <header><div><span>PARTICLE LAB</span><h4>Atmosphere in motion</h4></div><label className="environment-studio__switch"><input type="checkbox" checked={value.particlesEnabled} onChange={(event) => onChange({ ...value, particlesEnabled: event.target.checked })}/><span>Live particles</span></label></header>
    <div className="environment-studio__particles">{PARTICLES.map((particle) => <button key={particle.id} type="button" data-active={value.particleKind === particle.id} onClick={() => onChange({ ...value, particleKind: particle.id, particlesEnabled: particle.id !== "none" })}><i>{particle.glyph}</i><span>{particle.label}</span></button>)}</div>
    <div className="environment-studio__sliders"><Range label="Density" value={value.particleIntensity} onChange={(particleIntensity) => onChange({ ...value, particleIntensity })}/><Range label="Motion" value={value.particleSpeed} onChange={(particleSpeed) => onChange({ ...value, particleSpeed })}/><Range label="Bloom" value={value.lighting.bloom} max={60} onChange={(next) => updateLighting("bloom", next)}/><Range label="Film grain" value={value.lighting.grain} max={45} onChange={(next) => updateLighting("grain", next)}/></div>
  </div>;

  return <div className="environment-studio">
    <header><div><span>WORLD ENVIRONMENT</span><h4>Choose the air around you</h4></div><small>Updates live after save</small></header>
    <div className="environment-studio__grid">{ENVIRONMENTS.map((environment) => <button key={environment.id} type="button" data-active={value.environmentId === environment.id} onClick={() => onChange({ ...value, environmentId: environment.id, particleKind: environment.defaultParticle, particlesEnabled: true })}><span className="environment-studio__preview" style={{ background: environment.preview }}><i style={{ background: environment.accent }}/></span><strong>{environment.name}</strong><small>{environment.description}</small></button>)}</div>
    <div className="environment-studio__lighting"><Range label="Brightness" value={value.lighting.brightness} min={55} max={145} onChange={(next) => updateLighting("brightness", next)}/><Range label="Warmth" value={value.lighting.warmth} onChange={(next) => updateLighting("warmth", next)}/><Range label="Vignette" value={value.lighting.vignette} max={80} onChange={(next) => updateLighting("vignette", next)}/></div>
  </div>;
}
