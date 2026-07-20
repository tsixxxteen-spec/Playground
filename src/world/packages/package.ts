import { WorldPackage } from "../types";

export const WORLD_PACKAGE_VERSION = "1.0.0";

export function createEmptyWorldPackage(): WorldPackage {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),

    title: "Untitled World",

    description: "",

    creator: "",

    version: WORLD_PACKAGE_VERSION,

    createdAt: now,

    modifiedAt: now,

    environment: {
      id: "default",
      name: "Default",
      background: "",

      lighting: {
        brightness: 1,
        warmth: 0.5,
        bloom: 0.25,
        vignette: 0,
      },

      particles: {
        enabled: false,
        type: "none",
        density: 0,
        speed: 1,
      },

      ambience: "",
    },

    objects: [],

    decorations: [],

    widgets: [],

    companions: [],

    settings: {
      snapToGrid: true,
      gridSize: 10,
      showParticles: true,
      reducedMotion: false,
      autoSave: true,
    },
  };
}