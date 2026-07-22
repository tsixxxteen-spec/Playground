import type { PlaygroundInteractionEvent } from "../types/playground";
import type {
  WorldInteractionHandler,
  WorldInteractionResult,
  WorldInteractionTone,
} from "./types";

const emit = (name: string, detail: Record<string, unknown> = {}): void => {
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

const playTone = (tone: WorldInteractionTone): void => {
  try {
    const AudioContextClass = window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const frequencies: Record<WorldInteractionTone, number> = {
      soft: 330,
      bright: 660,
      warm: 440,
      playful: 520,
    };

    oscillator.type = tone === "warm" ? "sine" : "triangle";
    oscillator.frequency.value = frequencies[tone];
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, audio.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.17);
    oscillator.addEventListener("ended", () => void audio.close());
  } catch {
    // Sound is optional and may be blocked by browser policy.
  }
};

class WorldInteractionRegistry {
  private readonly actionHandlers = new Map<string, WorldInteractionHandler>();
  private readonly objectHandlers = new Map<string, WorldInteractionHandler>();

  registerAction(actionType: string, handler: WorldInteractionHandler): void {
    this.actionHandlers.set(actionType, handler);
  }

  registerObject(objectId: string, handler: WorldInteractionHandler): void {
    this.objectHandlers.set(objectId, handler);
  }

  hasAction(actionType: string): boolean {
    return this.actionHandlers.has(actionType);
  }

  hasObject(objectId: string): boolean {
    return this.objectHandlers.has(objectId);
  }

  async dispatch(event: PlaygroundInteractionEvent): Promise<WorldInteractionResult | void> {
    const handler = this.objectHandlers.get(event.definition.id) ??
      this.actionHandlers.get(event.action.type);
    if (!handler) return;

    const result = await handler({ event, emit });
    if (!result) return;

    if (result.eventName) {
      emit(result.eventName, {
        objectId: event.object.id,
        definitionId: event.definition.id,
        action: event.action.type,
        ...result.detail,
      });
    }

    if (result.message) {
      emit("worlds:interaction-feedback", {
        message: result.message,
        objectId: event.object.id,
        definitionId: event.definition.id,
      });
    }

    if (result.tone) playTone(result.tone);
    return result;
  }
}

export const worldInteractionRegistry = new WorldInteractionRegistry();
export { WorldInteractionRegistry };
