import type { WorldPackage } from "../types";

export interface WorldStorage {
  listWorlds(): Promise<WorldPackage[]>;

  loadWorld(id: string): Promise<WorldPackage | null>;

  saveWorld(world: WorldPackage): Promise<void>;

  deleteWorld(id: string): Promise<void>;

  duplicateWorld(id: string): Promise<WorldPackage>;

  renameWorld(id: string, title: string): Promise<void>;

  worldExists(id: string): Promise<boolean>;

  createWorld(): Promise<WorldPackage>;
}