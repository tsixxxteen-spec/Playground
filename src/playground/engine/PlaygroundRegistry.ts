import type {
  PlaygroundObjectDefinition,
} from "../types/playground";

class PlaygroundRegistry {
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

    const normalized: PlaygroundObjectDefinition = {
      ...definition,
      id,
      defaultScale:
        definition.defaultScale &&
        definition.defaultScale > 0
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
export const playgroundRegistry =
  new PlaygroundRegistry();

export { PlaygroundRegistry };
