import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { WorldPackage } from "../types";
import {
  worldFavorites,
  worldRecent,
  worldStorage,
} from "./index";

export type WorldLibraryContextValue = {
  worlds: WorldPackage[];
  activeWorld: WorldPackage | null;
  favoriteWorldIds: string[];
  recentWorldIds: string[];
  loading: boolean;
  error: string | null;

  refreshWorlds: () => Promise<void>;
  createWorld: () => Promise<WorldPackage>;
  openWorld: (id: string) => Promise<WorldPackage | null>;
  saveWorld: (world: WorldPackage) => Promise<void>;
  renameWorld: (id: string, title: string) => Promise<void>;
  duplicateWorld: (id: string) => Promise<WorldPackage>;
  deleteWorld: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  setActiveWorld: (world: WorldPackage | null) => void;
  clearError: () => void;
};

export const WorldLibraryContext =
  createContext<WorldLibraryContextValue | null>(null);

type WorldLibraryProviderProps = {
  children: ReactNode;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown World Library error occurred.";
}

export function WorldLibraryProvider({
  children,
}: WorldLibraryProviderProps) {
  const [worlds, setWorlds] = useState<WorldPackage[]>([]);
  const [activeWorld, setActiveWorld] =
    useState<WorldPackage | null>(null);

  const [favoriteWorldIds, setFavoriteWorldIds] =
    useState<string[]>(() => worldFavorites.getFavorites());

  const [recentWorldIds, setRecentWorldIds] =
    useState<string[]>(() => worldRecent.getRecent());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorlds = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const storedWorlds = await worldStorage.listWorlds();
      setWorlds(storedWorlds);
      setError(null);
    } catch (refreshError) {
      setError(getErrorMessage(refreshError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshWorlds();
  }, [refreshWorlds]);

  const createWorld = useCallback(
    async (): Promise<WorldPackage> => {
      try {
        const world = await worldStorage.createWorld();

        setWorlds((currentWorlds) => [
          world,
          ...currentWorlds.filter(
            (currentWorld) => currentWorld.id !== world.id,
          ),
        ]);

        setActiveWorld(world);
        worldRecent.recordOpen(world.id);
        setRecentWorldIds(worldRecent.getRecent());
        setError(null);

        return world;
      } catch (createError) {
        const message = getErrorMessage(createError);
        setError(message);
        throw createError;
      }
    },
    [],
  );

  const openWorld = useCallback(
    async (id: string): Promise<WorldPackage | null> => {
      try {
        const world = await worldStorage.loadWorld(id);

        if (!world) {
          setError(`World "${id}" could not be found.`);
          return null;
        }

        setActiveWorld(world);
        worldRecent.recordOpen(id);
        setRecentWorldIds(worldRecent.getRecent());
        setError(null);

        return world;
      } catch (openError) {
        setError(getErrorMessage(openError));
        return null;
      }
    },
    [],
  );

  const saveWorld = useCallback(
    async (world: WorldPackage): Promise<void> => {
      try {
        await worldStorage.saveWorld(world);

        const savedWorld =
          (await worldStorage.loadWorld(world.id)) ?? world;

        setWorlds((currentWorlds) => {
          const exists = currentWorlds.some(
            (currentWorld) => currentWorld.id === savedWorld.id,
          );

          if (!exists) {
            return [savedWorld, ...currentWorlds];
          }

          return currentWorlds.map((currentWorld) =>
            currentWorld.id === savedWorld.id
              ? savedWorld
              : currentWorld,
          );
        });

        setActiveWorld((currentWorld) =>
          currentWorld?.id === savedWorld.id
            ? savedWorld
            : currentWorld,
        );

        setError(null);
      } catch (saveError) {
        const message = getErrorMessage(saveError);
        setError(message);
        throw saveError;
      }
    },
    [],
  );

  const renameWorld = useCallback(
    async (id: string, title: string): Promise<void> => {
      try {
        await worldStorage.renameWorld(id, title);

        const renamedWorld = await worldStorage.loadWorld(id);

        if (!renamedWorld) {
          throw new Error(
            `World "${id}" could not be loaded after renaming.`,
          );
        }

        setWorlds((currentWorlds) =>
          currentWorlds.map((world) =>
            world.id === id ? renamedWorld : world,
          ),
        );

        setActiveWorld((currentWorld) =>
          currentWorld?.id === id
            ? renamedWorld
            : currentWorld,
        );

        setError(null);
      } catch (renameError) {
        const message = getErrorMessage(renameError);
        setError(message);
        throw renameError;
      }
    },
    [],
  );

  const duplicateWorld = useCallback(
    async (id: string): Promise<WorldPackage> => {
      try {
        const duplicate =
          await worldStorage.duplicateWorld(id);

        setWorlds((currentWorlds) => [
          duplicate,
          ...currentWorlds.filter(
            (world) => world.id !== duplicate.id,
          ),
        ]);

        setError(null);
        return duplicate;
      } catch (duplicateError) {
        const message = getErrorMessage(duplicateError);
        setError(message);
        throw duplicateError;
      }
    },
    [],
  );

  const deleteWorld = useCallback(
    async (id: string): Promise<void> => {
      try {
        await worldStorage.deleteWorld(id);

        setWorlds((currentWorlds) =>
          currentWorlds.filter((world) => world.id !== id),
        );

        setActiveWorld((currentWorld) =>
          currentWorld?.id === id ? null : currentWorld,
        );

        if (worldFavorites.isFavorite(id)) {
          worldFavorites.removeFavorite(id);
          setFavoriteWorldIds(worldFavorites.getFavorites());
        }

        setError(null);
      } catch (deleteError) {
        const message = getErrorMessage(deleteError);
        setError(message);
        throw deleteError;
      }
    },
    [],
  );

  const toggleFavorite = useCallback((id: string): void => {
    worldFavorites.toggleFavorite(id);
    setFavoriteWorldIds(worldFavorites.getFavorites());
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const value = useMemo<WorldLibraryContextValue>(
    () => ({
      worlds,
      activeWorld,
      favoriteWorldIds,
      recentWorldIds,
      loading,
      error,
      refreshWorlds,
      createWorld,
      openWorld,
      saveWorld,
      renameWorld,
      duplicateWorld,
      deleteWorld,
      toggleFavorite,
      setActiveWorld,
      clearError,
    }),
    [
      worlds,
      activeWorld,
      favoriteWorldIds,
      recentWorldIds,
      loading,
      error,
      refreshWorlds,
      createWorld,
      openWorld,
      saveWorld,
      renameWorld,
      duplicateWorld,
      deleteWorld,
      toggleFavorite,
      clearError,
    ],
  );

  return (
    <WorldLibraryContext.Provider value={value}>
      {children}
    </WorldLibraryContext.Provider>
  );
}
