import { createEmptyWorldPackage } from "../packages/package";
import { deserializeWorld } from "../packages/deserializer";
import { serializeWorld } from "../packages/serializer";
import { validateWorldPackage } from "../packages/validator";
import type { WorldPackage } from "../types";
import type { WorldStorage } from "./WorldStorage";

const LIBRARY_KEY = "worlds.library.v1";

type StoredWorldLibrary = Record<string, string>;

function readLibrary(): StoredWorldLibrary {
  try {
    const storedValue = localStorage.getItem(LIBRARY_KEY);

    if (!storedValue) {
      return {};
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return parsedValue as StoredWorldLibrary;
  } catch (error) {
    console.error("Failed to read the World Library.", error);
    return {};
  }
}

function writeLibrary(library: StoredWorldLibrary): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `world-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function cloneWorld(world: WorldPackage): WorldPackage {
  if (typeof structuredClone === "function") {
    return structuredClone(world);
  }

  return JSON.parse(JSON.stringify(world)) as WorldPackage;
}

export class LocalWorldStorage implements WorldStorage {
  async listWorlds(): Promise<WorldPackage[]> {
    const library = readLibrary();
    const worlds: WorldPackage[] = [];

    for (const serializedWorld of Object.values(library)) {
      try {
        const world = deserializeWorld(serializedWorld);
        const validation = validateWorldPackage(world);

        if (validation.valid) {
          worlds.push(world);
        } else {
          console.warn(
            `Skipped invalid World "${world.id}".`,
            validation.errors,
          );
        }
      } catch (error) {
        console.warn("Skipped an unreadable World package.", error);
      }
    }

    return worlds.sort((firstWorld, secondWorld) => {
      const firstModified = new Date(
        firstWorld.modifiedAt,
      ).getTime();

      const secondModified = new Date(
        secondWorld.modifiedAt,
      ).getTime();

      return secondModified - firstModified;
    });
  }

  async loadWorld(id: string): Promise<WorldPackage | null> {
    const library = readLibrary();
    const serializedWorld = library[id];

    if (!serializedWorld) {
      return null;
    }

    try {
      const world = deserializeWorld(serializedWorld);
      const validation = validateWorldPackage(world);

      if (!validation.valid) {
        console.error(
          `World "${id}" failed validation.`,
          validation.errors,
        );

        return null;
      }

      return world;
    } catch (error) {
      console.error(`Failed to load World "${id}".`, error);
      return null;
    }
  }

  async saveWorld(world: WorldPackage): Promise<void> {
    const validation = validateWorldPackage(world);

    if (!validation.valid) {
      throw new Error(
        `Cannot save invalid World: ${validation.errors.join(", ")}`,
      );
    }

    const library = readLibrary();

    const worldToSave: WorldPackage = {
      ...cloneWorld(world),
      modifiedAt: new Date().toISOString(),
    };

    library[worldToSave.id] = serializeWorld(worldToSave);
    writeLibrary(library);
  }

  async deleteWorld(id: string): Promise<void> {
    const library = readLibrary();

    if (!(id in library)) {
      return;
    }

    delete library[id];
    writeLibrary(library);
  }

  async duplicateWorld(id: string): Promise<WorldPackage> {
    const sourceWorld = await this.loadWorld(id);

    if (!sourceWorld) {
      throw new Error(`Cannot duplicate missing World "${id}".`);
    }

    const now = new Date().toISOString();

    const duplicate: WorldPackage = {
      ...cloneWorld(sourceWorld),
      id: createId(),
      title: `${sourceWorld.title} Copy`,
      createdAt: now,
      modifiedAt: now,
    };

    await this.saveWorld(duplicate);

    return duplicate;
  }

  async renameWorld(id: string, title: string): Promise<void> {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      throw new Error("A World title cannot be empty.");
    }

    const world = await this.loadWorld(id);

    if (!world) {
      throw new Error(`Cannot rename missing World "${id}".`);
    }

    await this.saveWorld({
      ...world,
      title: normalizedTitle,
      modifiedAt: new Date().toISOString(),
    });
  }

  async worldExists(id: string): Promise<boolean> {
    const library = readLibrary();
    return id in library;
  }

  async createWorld(): Promise<WorldPackage> {
    const world = createEmptyWorldPackage();

    await this.saveWorld(world);

    return world;
  }
}

export const worldStorage = new LocalWorldStorage();