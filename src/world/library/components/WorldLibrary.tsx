import { useMemo, useState } from "react";
import type { WorldPackage } from "../../types";
import { WorldCard } from "./WorldCard";
import "./WorldLibrary.css";

export type WorldLibrarySection =
  | "all"
  | "favorites"
  | "recent"
  | "templates";

export type WorldLibrarySort =
  | "modified-desc"
  | "modified-asc"
  | "title-asc"
  | "title-desc";

type WorldLibraryProps = {
  worlds: WorldPackage[];
  favoriteWorldIds?: string[];
  templateWorldIds?: string[];

  onCreateWorld: () => void;
  onOpenWorld: (world: WorldPackage) => void;
  onRenameWorld: (world: WorldPackage) => void;
  onDuplicateWorld: (world: WorldPackage) => void;
  onDeleteWorld: (world: WorldPackage) => void;
  onToggleFavorite: (world: WorldPackage) => void;
};

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function getModifiedTimestamp(world: WorldPackage): number {
  const timestamp = new Date(world.modifiedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function WorldLibrary({
  worlds,
  favoriteWorldIds = [],
  templateWorldIds = [],
  onCreateWorld,
  onOpenWorld,
  onRenameWorld,
  onDuplicateWorld,
  onDeleteWorld,
  onToggleFavorite,
}: WorldLibraryProps) {
  const [section, setSection] =
    useState<WorldLibrarySection>("all");

  const [search, setSearch] = useState("");
  const [sort, setSort] =
    useState<WorldLibrarySort>("modified-desc");

  const favoriteIds = useMemo(
    () => new Set(favoriteWorldIds),
    [favoriteWorldIds],
  );

  const templateIds = useMemo(
    () => new Set(templateWorldIds),
    [templateWorldIds],
  );

  const visibleWorlds = useMemo(() => {
    const query = normalizeSearchValue(search);

    let result = worlds.filter((world) => {
      if (section === "favorites" && !favoriteIds.has(world.id)) {
        return false;
      }

      if (section === "templates" && !templateIds.has(world.id)) {
        return false;
      }

      if (section === "recent") {
        const modified = getModifiedTimestamp(world);
        const sevenDaysAgo =
          Date.now() - 7 * 24 * 60 * 60 * 1000;

        if (modified < sevenDaysAgo) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        world.title,
        world.description,
        world.creator,
        world.environment?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "modified-asc":
          return (
            getModifiedTimestamp(a) -
            getModifiedTimestamp(b)
          );

        case "title-asc":
          return a.title.localeCompare(b.title);

        case "title-desc":
          return b.title.localeCompare(a.title);

        case "modified-desc":
        default:
          return (
            getModifiedTimestamp(b) -
            getModifiedTimestamp(a)
          );
      }
    });

    return result;
  }, [
    worlds,
    section,
    search,
    sort,
    favoriteIds,
    templateIds,
  ]);

  return (
    <section className="world-library">
      <header className="world-library__hero">
        <div>
          <span className="world-library__eyebrow">
            Your Worlds
          </span>

          <h1>World Library</h1>

          <p>
            Create, revisit, organize, and prepare your Worlds
            for sharing.
          </p>
        </div>

        <button
          type="button"
          className="world-library__create"
          onClick={onCreateWorld}
        >
          + New World
        </button>
      </header>

      <div className="world-library__toolbar">
        <nav
          className="world-library__tabs"
          aria-label="World library sections"
        >
          {(
            [
              ["all", "My Worlds"],
              ["favorites", "Favorites"],
              ["recent", "Recent"],
              ["templates", "Templates"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                section === value ? "is-active" : ""
              }
              onClick={() => setSection(value)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="world-library__filters">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Worlds"
            aria-label="Search Worlds"
          />

          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as WorldLibrarySort)
            }
            aria-label="Sort Worlds"
          >
            <option value="modified-desc">
              Recently modified
            </option>

            <option value="modified-asc">
              Oldest modified
            </option>

            <option value="title-asc">
              Title A–Z
            </option>

            <option value="title-desc">
              Title Z–A
            </option>
          </select>
        </div>
      </div>

      {visibleWorlds.length > 0 ? (
        <div className="world-library__grid">
          {visibleWorlds.map((world) => (
            <WorldCard
              key={world.id}
              world={world}
              favorite={favoriteIds.has(world.id)}
              onOpen={onOpenWorld}
              onRename={onRenameWorld}
              onDuplicate={onDuplicateWorld}
              onDelete={onDeleteWorld}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="world-library__empty">
          <div className="world-library__empty-icon">◇</div>

          <h2>No Worlds found</h2>

          <p>
            Create a new World or adjust your current search and
            filters.
          </p>

          <button type="button" onClick={onCreateWorld}>
            Create a World
          </button>
        </div>
      )}
    </section>
  );
}