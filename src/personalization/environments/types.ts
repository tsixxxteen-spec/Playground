export type ParticleKind = "none" | "dust" | "rain" | "snow" | "fireflies" | "embers" | "stars";

export type EnvironmentSettings = {
  environmentId: string;
  particlesEnabled: boolean;
  particleKind: ParticleKind;
  particleIntensity: number;
  particleSpeed: number;
  lighting: {
    brightness: number;
    warmth: number;
    vignette: number;
    bloom: number;
    grain: number;
  };
};

export type EnvironmentDefinition = {
  id: string;
  name: string;
  description: string;
  preview: string;
  background: string;
  overlay: string;
  accent: string;
  defaultParticle: ParticleKind;
  ambience: string;
};

export const DEFAULT_ENVIRONMENT_SETTINGS: EnvironmentSettings = {
  environmentId: "studio-neutral",
  particlesEnabled: true,
  particleKind: "dust",
  particleIntensity: 42,
  particleSpeed: 40,
  lighting: {
    brightness: 100,
    warmth: 50,
    vignette: 18,
    bloom: 12,
    grain: 8,
  },
};

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, number));
};

export function normalizeEnvironmentSettings(value?: Partial<EnvironmentSettings> | null): EnvironmentSettings {
  const lighting = value?.lighting ?? DEFAULT_ENVIRONMENT_SETTINGS.lighting;
  return {
    environmentId: typeof value?.environmentId === "string" ? value.environmentId : DEFAULT_ENVIRONMENT_SETTINGS.environmentId,
    particlesEnabled: typeof value?.particlesEnabled === "boolean" ? value.particlesEnabled : DEFAULT_ENVIRONMENT_SETTINGS.particlesEnabled,
    particleKind: ["none", "dust", "rain", "snow", "fireflies", "embers", "stars"].includes(value?.particleKind ?? "")
      ? (value?.particleKind as ParticleKind)
      : DEFAULT_ENVIRONMENT_SETTINGS.particleKind,
    particleIntensity: clamp(value?.particleIntensity, 0, 100, DEFAULT_ENVIRONMENT_SETTINGS.particleIntensity),
    particleSpeed: clamp(value?.particleSpeed, 0, 100, DEFAULT_ENVIRONMENT_SETTINGS.particleSpeed),
    lighting: {
      brightness: clamp(lighting.brightness, 55, 145, DEFAULT_ENVIRONMENT_SETTINGS.lighting.brightness),
      warmth: clamp(lighting.warmth, 0, 100, DEFAULT_ENVIRONMENT_SETTINGS.lighting.warmth),
      vignette: clamp(lighting.vignette, 0, 80, DEFAULT_ENVIRONMENT_SETTINGS.lighting.vignette),
      bloom: clamp(lighting.bloom, 0, 60, DEFAULT_ENVIRONMENT_SETTINGS.lighting.bloom),
      grain: clamp(lighting.grain, 0, 45, DEFAULT_ENVIRONMENT_SETTINGS.lighting.grain),
    },
  };
}
