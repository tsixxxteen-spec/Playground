import { PLAYGROUND_LANES } from "../../../constants/lanes";
import type {
  PlaygroundObjectDefinition,
} from "../../../types/playground";
import RetroFolder from "./RetroFolder";

export const retroFolderDefinition: PlaygroundObjectDefinition = {
  id: "retro-folder",
  name: "Retro Desktop Folder",
  description: "Opens the visitor's music collection.",
  lane: PLAYGROUND_LANES.MUSIC,
  component: RetroFolder,
  fallbackLabel: "Music folder",
  defaultAction: {
    type: "open-music",
  },
  defaultScale: 1,
};
