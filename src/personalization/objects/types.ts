import type { PlaygroundObjectDefinition } from "../../world/types/playground";

export type ObjectCategory =
  | "All"
  | "Audio"
  | "Atmosphere"
  | "Desk"
  | "Nature"
  | "Retro"
  | "Companions";

export type PersonalizationObjectDefinition = PlaygroundObjectDefinition & {
  category: Exclude<ObjectCategory, "All">;
  icon: string;
  featured?: boolean;
  keywords?: string[];
};
