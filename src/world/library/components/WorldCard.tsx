import type { WorldPackage } from "../../types";

type WorldCardProps = {
  world: WorldPackage;
  favorite: boolean;
  onOpen: (world: WorldPackage) => void;
  onRename: (world: WorldPackage) => void;
  onDuplicate: (world: WorldPackage) => void;
  onDelete: (world: WorldPackage) => void;
  onToggleFavorite: (world: WorldPackage) => void;
};

function formatModifiedDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function WorldCard({
  world,
  favorite,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onToggleFavorite,
}: WorldCardProps) {
  const environmentName =
    world.environment?.name?.trim() || "Default Environment";

  return (
    <article className="world-card">
      <button
        type="button"
        className="world-card__preview"
        onClick={() => onOpen(world)}
        aria-label={`Open ${world.title}`}
      >
        <div className="world-card__preview-glow" />

        <span className="world-card__environment">
          {environmentName}
        </span>

        <span className="world-card__title-overlay">
          {world.title || "Untitled World"}
        </span>
      </button>

      <div className="world-card__content">
        <div className="world-card__header">
          <div>
            <h3>{world.title || "Untitled World"}</h3>

            <p>
              Modified {formatModifiedDate(world.modifiedAt)}
            </p>
          </div>

          <button
            type="button"
            className={`world-card__favorite ${
              favorite ? "is-active" : ""
            }`}
            onClick={() => onToggleFavorite(world)}
            aria-label={
              favorite
                ? `Remove ${world.title} from favorites`
                : `Add ${world.title} to favorites`
            }
            title={favorite ? "Remove favorite" : "Add favorite"}
          >
            {favorite ? "★" : "☆"}
          </button>
        </div>

        <div className="world-card__stats">
          <span>{world.objects.length} objects</span>
          <span>{world.widgets.length} widgets</span>
          <span>{world.companions.length} companions</span>
        </div>

        <div className="world-card__actions">
          <button type="button" onClick={() => onOpen(world)}>
            Open
          </button>

          <button type="button" onClick={() => onRename(world)}>
            Rename
          </button>

          <button type="button" onClick={() => onDuplicate(world)}>
            Duplicate
          </button>

          <button
            type="button"
            className="world-card__delete"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete(world);
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}