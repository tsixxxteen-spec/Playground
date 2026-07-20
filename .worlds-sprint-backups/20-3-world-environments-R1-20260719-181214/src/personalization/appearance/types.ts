import type { PlaygroundData } from "../../world/types/playground";
export type AppearanceTab = "themes" | "decorations" | "objects" | "widgets" | "effects";
export type AppearanceValue = { themeId: string; playground: PlaygroundData; };
