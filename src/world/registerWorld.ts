import { worldRegistry } from "./engine/WorldRegistry";
import { registerMusicObjects } from "./objects/music";
import { registerPhotoObjects } from "./objects/photos";
import { registerVideoObjects } from "./objects/videos";
import { registerPersonalizationObjects } from "./objects/personalization";

let initialized = false;

export function registerWorld(): void {
  if (initialized) return;

  registerMusicObjects();
  registerPhotoObjects();
  registerVideoObjects();
  registerPersonalizationObjects();
  worldRegistry.assertReady();

  initialized = true;
}
