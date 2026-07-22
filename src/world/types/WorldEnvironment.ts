export interface WorldLighting {
  brightness: number;
  warmth: number;
  bloom: number;
  vignette: number;
}

export interface WorldParticles {
  enabled: boolean;
  type: string;
  density: number;
  speed: number;
}

export interface WorldEnvironment {
  id: string;
  name: string;

  background: string;

  lighting: WorldLighting;

  particles: WorldParticles;

  ambience: string;
}