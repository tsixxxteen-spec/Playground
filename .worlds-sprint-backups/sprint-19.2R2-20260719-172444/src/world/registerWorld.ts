import { worldRegistry } from "./engine/WorldRegistry";
import { registerMusicObjects } from "./objects/music";
import { registerPhotoObjects } from "./objects/photos";
import { registerVideoObjects } from "./objects/videos";

let initialized = false;

export function registerWorld(): void {
  if (initialized) return;

  registerMusicObjects();
  registerPhotoObjects();
  registerVideoObjects();
  worldRegistry.assertReady();

  initialized = true;
}
