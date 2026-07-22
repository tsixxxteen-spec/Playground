import { useState } from "react";
import { WorldLibrary } from "./world/library";
import { createEmptyWorldPackage } from "./world/packages/package";
import type { WorldPackage } from "./world/types";

export function WorldLibraryPreview() {
  const [worlds, setWorlds] = useState<WorldPackage[]>([
    {
      ...createEmptyWorldPackage(),
      id: "film-studio-demo",
      title: "My Film Studio",
      description: "A cinematic creative workspace.",
      creator: "Terry Presume",
    },
  ]);

  const [favorites, setFavorites] = useState<string[]>([]);

  return (
    <WorldLibrary
      worlds={worlds}
      favoriteWorldIds={favorites}
      templateWorldIds={[]}
      onCreateWorld={() => {
        setWorlds((current) => [
          {
            ...createEmptyWorldPackage(),
            title: `Untitled World ${current.length + 1}`,
          },
          ...current,
        ]);
      }}
      onOpenWorld={(world) => {
        console.log("Open World:", world);
      }}
      onRenameWorld={(world) => {
        const title = window.prompt(
          "Rename World",
          world.title,
        );

        if (!title?.trim()) return;

        setWorlds((current) =>
          current.map((item) =>
            item.id === world.id
              ? {
                  ...item,
                  title: title.trim(),
                  modifiedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
      }}
      onDuplicateWorld={(world) => {
        const now = new Date().toISOString();

        setWorlds((current) => [
          {
            ...world,
            id: crypto.randomUUID(),
            title: `${world.title} Copy`,
            createdAt: now,
            modifiedAt: now,
          },
          ...current,
        ]);
      }}
      onDeleteWorld={(world) => {
        const confirmed = window.confirm(
          `Delete "${world.title}"?`,
        );

        if (!confirmed) return;

        setWorlds((current) =>
          current.filter((item) => item.id !== world.id),
        );
      }}
      onToggleFavorite={(world) => {
        setFavorites((current) =>
          current.includes(world.id)
            ? current.filter((id) => id !== world.id)
            : [...current, world.id],
        );
      }}
    />
  );
}