import type { CompanionDefinition, CompanionKind } from "./types";

const companions: CompanionDefinition[] = [
  { id: "pixel-cat", name: "Pixel Cat", description: "A curious little cat that naps, wanders, and reacts to attention.", glyph: "🐈", accent: "#f4c07a", defaultBehavior: "curious" },
  { id: "dog", name: "Studio Dog", description: "A cheerful companion with playful movement and loyal pauses.", glyph: "🐕", accent: "#d6a97a", defaultBehavior: "playful" },
  { id: "bird", name: "Songbird", description: "A light, floating companion that glides around the upper world.", glyph: "🐦", accent: "#8bc6ff", defaultBehavior: "calm" },
  { id: "ghost", name: "Soft Ghost", description: "A dreamy spirit that drifts through your world with a gentle glow.", glyph: "👻", accent: "#cabdff", defaultBehavior: "dreamy" },
  { id: "robot", name: "Orbit Bot", description: "A tiny hovering robot that patrols and acknowledges clicks.", glyph: "🤖", accent: "#7ee7df", defaultBehavior: "curious" },
  { id: "butterfly", name: "Butterfly", description: "A graceful companion with looping, fluttering movement.", glyph: "🦋", accent: "#e9a7ff", defaultBehavior: "dreamy" },
];

export function listCompanions(): CompanionDefinition[] {
  return companions;
}

export function getCompanion(id: CompanionKind): CompanionDefinition {
  return companions.find((companion) => companion.id === id) ?? companions[0];
}
