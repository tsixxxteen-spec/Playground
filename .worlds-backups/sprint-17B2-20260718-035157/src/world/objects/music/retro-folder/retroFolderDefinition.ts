import { PLAYGROUND_LANES } from "../../../constants/lanes";
import type { PlaygroundObjectDefinition } from "../../../types/playground";

export const retroFolderDefinition: PlaygroundObjectDefinition = {
  id: "retro-folder",

  name: "Retro Desktop Folder",

  description:
    "Opens the visitor's music collection.",

  lane: PLAYGROUND_LANES.MUSIC,

  fallbackLabel: "🗂",

  defaultAction: {
    type: "open-music",
  },

  defaultScale: 1,
};