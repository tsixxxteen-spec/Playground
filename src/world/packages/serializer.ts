import { WorldPackage } from "../types";

export function serializeWorld(world: WorldPackage): string {
  return JSON.stringify(world, null, 2);
}