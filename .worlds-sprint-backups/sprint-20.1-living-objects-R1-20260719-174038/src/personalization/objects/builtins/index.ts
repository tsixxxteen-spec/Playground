import { PLAYGROUND_LANES } from "../../../world/constants/lanes";
import type { PersonalizationObjectDefinition } from "../types";
import ObjectGlyph from "./ObjectGlyph";

export const builtinObjects: PersonalizationObjectDefinition[] = [
  { id: "personal-crt-tv", name: "CRT TV", description: "A soft-glow retro television for your world.", category: "Retro", icon: "▣", keywords: ["television", "screen", "vintage"], lane: PLAYGROUND_LANES.VIDEOS, component: ObjectGlyph, fallbackLabel: "TV", defaultAction: { type: "open-videos" }, defaultScale: 1 },
  { id: "personal-radio", name: "Radio", description: "A compact radio that opens your music.", category: "Audio", icon: "◉", featured: true, keywords: ["music", "speaker"], lane: PLAYGROUND_LANES.MUSIC, component: ObjectGlyph, fallbackLabel: "FM", defaultAction: { type: "open-music" }, defaultScale: 1 },
  { id: "personal-plant", name: "Plant", description: "A calm leafy accent for quieter corners.", category: "Nature", icon: "♧", keywords: ["green", "leaf"], lane: PLAYGROUND_LANES.MUSIC, component: ObjectGlyph, fallbackLabel: "PL", defaultAction: { type: "none" }, defaultScale: .92 },
  { id: "personal-coffee", name: "Coffee", description: "A warm desk-side cup.", category: "Desk", icon: "◡", keywords: ["mug", "drink"], lane: PLAYGROUND_LANES.MUSIC, component: ObjectGlyph, fallbackLabel: "CF", defaultAction: { type: "none" }, defaultScale: .76 },
  { id: "personal-moon-lamp", name: "Moon Lamp", description: "A lunar light with a dreamy presence.", category: "Atmosphere", icon: "◐", featured: true, keywords: ["light", "night", "space"], lane: PLAYGROUND_LANES.MUSIC, component: ObjectGlyph, fallbackLabel: "MO", defaultAction: { type: "none" }, defaultScale: .9 },
  { id: "personal-vhs", name: "VHS", description: "A videotape from another era.", category: "Retro", icon: "▤", keywords: ["tape", "video"], lane: PLAYGROUND_LANES.VIDEOS, component: ObjectGlyph, fallbackLabel: "VHS", defaultAction: { type: "open-videos" }, defaultScale: .82 },
  { id: "personal-camera", name: "Camera", description: "A pocket camera that opens your photos.", category: "Desk", icon: "◫", featured: true, keywords: ["photo", "film"], lane: PLAYGROUND_LANES.PHOTOS, component: ObjectGlyph, fallbackLabel: "CAM", defaultAction: { type: "open-photos" }, defaultScale: .84 },
  { id: "personal-pixel-cat", name: "Pixel Cat", description: "A tiny companion for your digital room.", category: "Companions", icon: "=＾", keywords: ["pet", "8-bit"], lane: PLAYGROUND_LANES.MUSIC, component: ObjectGlyph, fallbackLabel: "CAT", defaultAction: { type: "none" }, defaultScale: .78 },
];
