import {
  useMemo,
  useState,
} from "react";
import { useWorld } from "../context";
import { worldRegistry } from "../engine/WorldRegistry";
import type {
  PlaygroundObjectDefinition,
} from "../types/playground";
import "./WorldObjectLibrary.css";

type WorldObjectLibraryProps = {
  onAddObject: (
    definition: PlaygroundObjectDefinition,
  ) => string;
};

const CATALOG_IDS = [
  "retro-folder",
] as const;

export default function WorldObjectLibrary({
  onAddObject,
}: WorldObjectLibraryProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { selectObject } = useWorld();

  const catalog = useMemo(
    () =>
      CATALOG_IDS
        .map((id) => worldRegistry.get(id))
        .filter(
          (
            definition,
          ): definition is PlaygroundObjectDefinition =>
            Boolean(definition),
        ),
    [],
  );

  const filteredCatalog = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLowerCase();

    if (!normalizedQuery) return catalog;

    return catalog.filter((definition) => {
      const haystack = [
        definition.name,
        definition.description ?? "",
        definition.fallbackLabel,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [catalog, query]);

  const addObject = (
    definition: PlaygroundObjectDefinition,
  ) => {
    const objectId = onAddObject(definition);
    selectObject(objectId);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="world-library">
      <button
        type="button"
        className="world-library__trigger"
        aria-expanded={open}
        aria-controls="world-object-library-panel"
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <span aria-hidden="true">＋</span>
        Add object
      </button>

      {open ? (
        <section
          id="world-object-library-panel"
          className="world-library__panel"
          aria-label="World object library"
        >
          <div className="world-library__header">
            <div>
              <p>Object library</p>
              <h2>Add to your world</h2>
            </div>

            <button
              type="button"
              className="world-library__close"
              aria-label="Close object library"
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
            >
              ×
            </button>
          </div>

          <label className="world-library__search">
            <span className="world-library__sr-only">
              Search objects
            </span>
            <input
              type="search"
              value={query}
              placeholder="Search objects"
              autoFocus
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          </label>

          <div className="world-library__results">
            {filteredCatalog.length > 0 ? (
              filteredCatalog.map((definition) => (
                <button
                  key={definition.id}
                  type="button"
                  className="world-library__card"
                  onClick={() => {
                    addObject(definition);
                  }}
                >
                  <span
                    className="world-library__preview"
                    aria-hidden="true"
                  >
                    {definition.previewAsset ||
                    definition.asset ? (
                      <img
                        src={
                          definition.previewAsset ??
                          definition.asset
                        }
                        alt=""
                        draggable={false}
                      />
                    ) : (
                      definition.fallbackLabel
                    )}
                  </span>

                  <span className="world-library__copy">
                    <strong>{definition.name}</strong>
                    <small>
                      {definition.description ??
                        "Interactive world object"}
                    </small>
                  </span>

                  <span
                    className="world-library__add"
                    aria-hidden="true"
                  >
                    ＋
                  </span>
                </button>
              ))
            ) : (
              <p className="world-library__empty">
                No objects match “{query}”.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
