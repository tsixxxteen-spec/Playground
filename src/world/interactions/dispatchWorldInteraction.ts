import type { PlaygroundInteractionEvent } from "../types/playground";
import { registerBuiltinInteractions } from "./registerBuiltinInteractions";
import { worldInteractionRegistry } from "./WorldInteractionRegistry";

export async function dispatchWorldInteraction(event: PlaygroundInteractionEvent): Promise<void> {
  registerBuiltinInteractions();
  await worldInteractionRegistry.dispatch(event);
}
