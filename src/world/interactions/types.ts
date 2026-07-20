import type { PlaygroundInteractionEvent } from "../types/playground";

export type WorldInteractionTone = "soft" | "bright" | "warm" | "playful";

export type WorldInteractionResult = {
  message?: string;
  tone?: WorldInteractionTone;
  eventName?: string;
  detail?: Record<string, unknown>;
};

export type WorldInteractionContext = {
  event: PlaygroundInteractionEvent;
  emit: (name: string, detail?: Record<string, unknown>) => void;
};

export type WorldInteractionHandler = (
  context: WorldInteractionContext,
) => WorldInteractionResult | void | Promise<WorldInteractionResult | void>;
