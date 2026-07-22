import type { PlaygroundData } from "../../world/types/playground";
import type { EnvironmentSettings } from "../environments";
export type AppearanceTab = "themes" | "decorations" | "objects" | "widgets" | "effects";
export type AppearanceValue = { themeId: string; playground: PlaygroundData; environment: EnvironmentSettings; };
