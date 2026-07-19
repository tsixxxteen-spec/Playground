import type {
  PlaygroundObjectDefinition,
} from "../types/playground";

const assertNonEmptyText = (
  value: string,
  field: string,
  definitionId: string,
): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(
      `World object "${definitionId}" requires a non-empty ${field}.`,
    );
  }

  return normalized;
};

class WorldRegistry {
  private readonly definitions = new Map<
    string,
    PlaygroundObjectDefinition
  >();

  register(
    definition: PlaygroundObjectDefinition,
  ): PlaygroundObjectDefinition {
    const id = definition.id.trim();

    if (!id) {
      throw new Error(
        "Playground object definitions require a non-empty id.",
      );
    }

    if (this.definitions.has(id)) {
      throw new Error(
        `A playground object named "${id}" is already registered.`,
      );
    }

    const name = assertNonEmptyText(
      definition.name,
      "name",
      id,
    );
    const fallbackLabel = assertNonEmptyText(
      definition.fallbackLabel,
      "fallback label",
      id,
    );

    if (
      definition.defaultAction.type === "open-url" &&
      !definition.defaultAction.target?.trim()
    ) {
      throw new Error(
        `World object "${id}" requires a URL target for its default action.`,
      );
    }

    const normalized: PlaygroundObjectDefinition = {
      ...definition,
      id,
      name,
      fallbackLabel,
      defaultScale:
        Number.isFinite(definition.defaultScale) &&
        (definition.defaultScale ?? 0) > 0
          ? definition.defaultScale
          : 1,
    };

    this.definitions.set(id, normalized);
    return normalized;
  }

  registerMany(
    definitions: PlaygroundObjectDefinition[],
  ): void {
    definitions.forEach((definition) =>
      this.register(definition),
    );
  }

  get(
    objectId: string,
  ): PlaygroundObjectDefinition | undefined {
    return this.definitions.get(objectId);
  }

  require(
    objectId: string,
  ): PlaygroundObjectDefinition {
    const definition = this.get(objectId);

    if (!definition) {
      throw new Error(
        `Unknown playground object "${objectId}".`,
      );
    }

    return definition;
  }

  has(objectId: string): boolean {
    return this.definitions.has(objectId);
  }

  list(): PlaygroundObjectDefinition[] {
    return Array.from(this.definitions.values());
  }

  assertReady(): void {
    if (this.definitions.size === 0) {
      throw new Error(
        "World registry initialization completed without registering any objects.",
      );
    }
  }

  clear(): void {
    this.definitions.clear();
  }
}

/**
 * Shared registry used by the renderer and future object editor.
 *
 * Object modules should register their definitions here once,
 * preferably from a single playground bootstrap file later.
 */
export const worldRegistry =
  new WorldRegistry();

export { WorldRegistry };
