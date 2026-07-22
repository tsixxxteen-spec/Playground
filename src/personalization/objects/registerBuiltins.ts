import { registerObject } from "./registry";
import { builtinObjects } from "./builtins";

let registered = false;
export function registerBuiltinObjects(): void {
  if (registered) return;
  builtinObjects.forEach(registerObject);
  registered = true;
}
