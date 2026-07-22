export type CompanionKind = "pixel-cat" | "dog" | "bird" | "ghost" | "robot" | "butterfly";
export type CompanionBehavior = "calm" | "curious" | "playful" | "dreamy";

export type CompanionDefinition = {
  id: CompanionKind;
  name: string;
  description: string;
  glyph: string;
  accent: string;
  defaultBehavior: CompanionBehavior;
};

export type CompanionSettings = {
  enabled: boolean;
  companionId: CompanionKind;
  quantity: number;
  size: number;
  speed: number;
  behavior: CompanionBehavior;
  followCursor: boolean;
};

export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  enabled: false,
  companionId: "pixel-cat",
  quantity: 1,
  size: 100,
  speed: 50,
  behavior: "curious",
  followCursor: false,
};

const companionKinds: CompanionKind[] = ["pixel-cat", "dog", "bird", "ghost", "robot", "butterfly"];
const behaviors: CompanionBehavior[] = ["calm", "curious", "playful", "dreamy"];

export function normalizeCompanionSettings(value?: Partial<CompanionSettings> | null): CompanionSettings {
  const companionId = companionKinds.includes(value?.companionId as CompanionKind)
    ? value?.companionId as CompanionKind
    : DEFAULT_COMPANION_SETTINGS.companionId;
  const behavior = behaviors.includes(value?.behavior as CompanionBehavior)
    ? value?.behavior as CompanionBehavior
    : DEFAULT_COMPANION_SETTINGS.behavior;

  return {
    enabled: typeof value?.enabled === "boolean" ? value.enabled : DEFAULT_COMPANION_SETTINGS.enabled,
    companionId,
    quantity: Math.max(1, Math.min(4, Math.round(Number(value?.quantity) || DEFAULT_COMPANION_SETTINGS.quantity))),
    size: Math.max(60, Math.min(160, Math.round(Number(value?.size) || DEFAULT_COMPANION_SETTINGS.size))),
    speed: Math.max(10, Math.min(100, Math.round(Number(value?.speed) || DEFAULT_COMPANION_SETTINGS.speed))),
    behavior,
    followCursor: typeof value?.followCursor === "boolean" ? value.followCursor : DEFAULT_COMPANION_SETTINGS.followCursor,
  };
}
