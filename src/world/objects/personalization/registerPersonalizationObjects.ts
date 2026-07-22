import { worldRegistry } from "../../engine/WorldRegistry";
import { builtinObjects } from "../../../personalization/objects/builtins";
let registered = false;
export function registerPersonalizationObjects(): void {
  if (registered) return;
  builtinObjects.forEach((definition) => { if (!worldRegistry.has(definition.id)) worldRegistry.register(definition); });
  registered = true;
}
