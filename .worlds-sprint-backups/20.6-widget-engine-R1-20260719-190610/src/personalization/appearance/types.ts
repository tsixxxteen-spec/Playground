import type { PlaygroundData } from "../../world/types/playground";
import type { EnvironmentSettings } from "../environments";
import type { CompanionSettings } from "../companions";
export type AppearanceTab = "themes" | "decorations" | "objects" | "companions" | "widgets" | "effects";
export type AppearanceValue = { themeId: string; playground: PlaygroundData; environment: EnvironmentSettings; companions: CompanionSettings; };
