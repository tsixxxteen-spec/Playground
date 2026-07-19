import { worldRegistry } from "../../engine/WorldRegistry";
import { retroFolderDefinition } from "./retro-folder/retroFolderDefinition";

let registered = false;

export function registerMusicObjects(): void {
  if (registered) return;

  worldRegistry.register(retroFolderDefinition);

  registered = true;
}