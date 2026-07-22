import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  PLAYGROUND_OBJECT_FOCUS_EVENT,
  PLAYGROUND_OBJECT_INSPECT_EVENT,
  PLAYGROUND_OBJECT_SELECTED_EVENT,
  PLAYGROUND_OBJECTS_CHANGED_EVENT,
} from "./events";

import {
  focusInspectableObject,
  scanInspectableObjects,
} from "./objectScanner";

import type {
  InspectorSortMode,
  PlaygroundInspectableObject,
  PlaygroundObjectSelectionDetail,
} from "./types";

import "./object-inspector-panel.css";

const REFRESH_INTERVAL_MS =
  2_000;

function normalizeSearchValue(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

function matchesSearch(
  object:
    PlaygroundInspectableObject,
  query: string,
): boolean {
  const normalized =
    normalizeSearchValue(
      query,
    );

  if (!normalized) {
    return true;
  }

  const searchableValues = [
    object.id,
    object.name,
    object.type,
    object.owner || "",
    object.lockedBy || "",
    object.layer || "",
    object.parentId || "",
    object.tags.join(" "),
  ];

  return searchableValues.some(
    (value) =>
      value
        .toLowerCase()
        .indexOf(
          normalized,
        ) !== -1,
  );
}

function formatMetadataDate(
  value?: string,
): string {
  if (!value) {
    return "Not available";
  }

  const numericValue =
    Number(value);

  const date =
    Number.isFinite(
      numericValue,
    )
      ? new Date(
          numericValue,
        )
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}

function dispatchObjectSelection(
  object:
    PlaygroundInspectableObject,
  source: string,
): void {
  const detail:
    PlaygroundObjectSelectionDetail = {
      objectId:
        object.id,
      objectName:
        object.name,
      source,
    };

  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_OBJECT_SELECTED_EVENT,
      {
        detail,
      },
    ),
  );

  object.element.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_OBJECT_SELECTED_EVENT,
      {
        bubbles: true,
        detail,
      },
    ),
  );
}

function dispatchObjectFocus(
  object:
    PlaygroundInspectableObject,
): void {
  const detail:
    PlaygroundObjectSelectionDetail = {
      objectId:
        object.id,
      objectName:
        object.name,
      source:
        "inspector",
    };

  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_OBJECT_FOCUS_EVENT,
      {
        detail,
      },
    ),
  );
}

function getObjectInitial(
  object:
    PlaygroundInspectableObject,
): string {
  const source =
    object.name ||
    object.type ||
    object.id;

  return source
    .charAt(0)
    .toUpperCase();
}

export default function ObjectInspectorPanel() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    objects,
    setObjects,
  ] = useState<
    PlaygroundInspectableObject[]
  >([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState<
    string | null
  >(null);

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    sortMode,
    setSortMode,
  ] = useState<
    InspectorSortMode
  >("name");

  const searchInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const refreshObjects =
    useCallback(() => {
      const scanned =
        scanInspectableObjects();

      setObjects(scanned);

      setSelectedId(
        (current) => {
          if (
            current &&
            scanned.some(
              (object) =>
                object.id ===
                current,
            )
          ) {
            return current;
          }

          return (
            scanned[0]?.id ??
            null
          );
        },
      );
    }, []);

  useEffect(() => {
    refreshObjects();

    const observer =
      new MutationObserver(
        () => {
          refreshObjects();
        },
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "data-playground-object-id",
          "data-object-id",
          "data-layer-id",
          "data-playground-object-name",
          "data-object-name",
          "data-playground-owner",
          "data-owner",
          "data-playground-locked-by",
          "data-locked-by",
          "data-playground-layer",
          "data-layer",
          "data-playground-tags",
          "data-tags",
        ],
      },
    );

    const interval =
      window.setInterval(
        refreshObjects,
        REFRESH_INTERVAL_MS,
      );

    const handleObjectsChanged =
      () => {
        refreshObjects();
      };

    document.addEventListener(
      PLAYGROUND_OBJECTS_CHANGED_EVENT,
      handleObjectsChanged,
    );

    return () => {
      observer.disconnect();

      window.clearInterval(
        interval,
      );

      document.removeEventListener(
        PLAYGROUND_OBJECTS_CHANGED_EVENT,
        handleObjectsChanged,
      );
    };
  }, [refreshObjects]);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      const modifier =
        event.metaKey ||
        event.ctrlKey;

      if (
        modifier &&
        event.key.toLowerCase() ===
          "f"
      ) {
        event.preventDefault();

        setIsOpen(true);

        window.setTimeout(() => {
          searchInputRef.current
            ?.focus();
        }, 0);
      }

      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  useEffect(() => {
    const handleExternalSelection = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          PlaygroundObjectSelectionDetail
        >;

      const objectId =
        customEvent.detail
          ?.objectId;

      if (!objectId) {
        return;
      }

      setSelectedId(
        objectId,
      );
    };

    const handleInspectRequest = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          PlaygroundObjectSelectionDetail
        >;

      const objectId =
        customEvent.detail
          ?.objectId;

      setIsOpen(true);

      if (objectId) {
        setSelectedId(
          objectId,
        );
      }
    };

    document.addEventListener(
      PLAYGROUND_OBJECT_SELECTED_EVENT,
      handleExternalSelection,
    );

    document.addEventListener(
      PLAYGROUND_OBJECT_INSPECT_EVENT,
      handleInspectRequest,
    );

    return () => {
      document.removeEventListener(
        PLAYGROUND_OBJECT_SELECTED_EVENT,
        handleExternalSelection,
      );

      document.removeEventListener(
        PLAYGROUND_OBJECT_INSPECT_EVENT,
        handleInspectRequest,
      );
    };
  }, []);

  const filteredObjects =
    useMemo(() => {
      const next =
        objects.filter(
          (object) =>
            matchesSearch(
              object,
              query,
            ),
        );

      next.sort(
        (
          left,
          right,
        ) => {
          if (
            sortMode === "type"
          ) {
            const typeDifference =
              left.type.localeCompare(
                right.type,
              );

            if (
              typeDifference !== 0
            ) {
              return typeDifference;
            }
          }

          if (
            sortMode === "recent"
          ) {
            const leftTime =
              left.modifiedAt
                ? new Date(
                    left.modifiedAt,
                  ).getTime()
                : 0;

            const rightTime =
              right.modifiedAt
                ? new Date(
                    right.modifiedAt,
                  ).getTime()
                : 0;

            if (
              rightTime !== leftTime
            ) {
              return (
                rightTime -
                leftTime
              );
            }
          }

          return left.name
            .localeCompare(
              right.name,
            );
        },
      );

      return next;
    }, [
      objects,
      query,
      sortMode,
    ]);

  const selectedObject =
    useMemo(
      () =>
        objects.find(
          (object) =>
            object.id ===
            selectedId,
        ) ?? null,
      [
        objects,
        selectedId,
      ],
    );

  const parentObject =
    useMemo(() => {
      if (
        !selectedObject
          ?.parentId
      ) {
        return null;
      }

      return (
        objects.find(
          (object) =>
            object.id ===
            selectedObject.parentId,
        ) ?? null
      );
    }, [
      objects,
      selectedObject,
    ]);

  const childObjects =
    useMemo(() => {
      if (!selectedObject) {
        return [];
      }

      return selectedObject.childIds
        .map(
          (childId) =>
            objects.find(
              (object) =>
                object.id ===
                childId,
            ),
        )
        .filter(
          (
            object,
          ): object is PlaygroundInspectableObject =>
            Boolean(object),
        );
    }, [
      objects,
      selectedObject,
    ]);

  const selectObject =
    (
      object:
        PlaygroundInspectableObject,
    ) => {
      setSelectedId(
        object.id,
      );

      dispatchObjectSelection(
        object,
        "inspector",
      );
    };

  const focusObject =
    (
      object:
        PlaygroundInspectableObject,
    ) => {
      selectObject(object);

      focusInspectableObject(
        object,
      );

      dispatchObjectFocus(
        object,
      );
    };

  return (
    <>
      <button
        type="button"
        className="playground-inspector-launcher"
        onClick={() => {
          setIsOpen(true);

          window.setTimeout(() => {
            searchInputRef.current
              ?.focus();
          }, 0);
        }}
        title="Object Inspector — Command/Ctrl + F"
        aria-label="Open object inspector"
      >
        <span
          aria-hidden="true"
        >
          ⌕
        </span>

        <span>
          Inspect
        </span>

        <span className="playground-inspector-launcher__count">
          {objects.length}
        </span>
      </button>

      {isOpen && (
        <div
          className="playground-inspector-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsOpen(false);
            }
          }}
        >
          <section
            className="playground-inspector-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Object Inspector"
          >
            <header className="playground-inspector-panel__header">
              <div>
                <p className="playground-inspector-panel__eyebrow">
                  Playground
                </p>

                <h2>
                  Object Inspector
                </h2>
              </div>

              <div className="playground-inspector-panel__header-actions">
                <div className="playground-inspector-panel__object-count">
                  {objects.length} objects
                </div>

                <button
                  type="button"
                  className="playground-inspector-panel__close"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  aria-label="Close object inspector"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="playground-inspector-panel__toolbar">
              <div className="playground-inspector-panel__search">
                <span
                  aria-hidden="true"
                >
                  ⌕
                </span>

                <input
                  ref={
                    searchInputRef
                  }
                  value={query}
                  placeholder="Search name, ID, owner, type, tag, or layer"
                  onChange={(event) => {
                    setQuery(
                      event.target.value,
                    );
                  }}
                />

                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                    }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                value={sortMode}
                onChange={(event) => {
                  setSortMode(
                    event.target
                      .value as InspectorSortMode,
                  );
                }}
                aria-label="Sort objects"
              >
                <option value="name">
                  Sort by name
                </option>

                <option value="type">
                  Sort by type
                </option>

                <option value="recent">
                  Sort by modified
                </option>
              </select>

              <span className="playground-inspector-panel__shortcut">
                ⌘F
              </span>
            </div>

            <div className="playground-inspector-panel__body">
              <section className="playground-inspector-panel__results">
                <div className="playground-inspector-panel__results-header">
                  <span>
                    Objects
                  </span>

                  <span>
                    {
                      filteredObjects.length
                    }
                  </span>
                </div>

                {filteredObjects.length ===
                0 ? (
                  <div className="playground-inspector-panel__empty">
                    <span
                      aria-hidden="true"
                    >
                      ⌕
                    </span>

                    <h3>
                      No matching objects
                    </h3>

                    <p>
                      Try searching by object name, ID, owner, type, tag, or layer.
                    </p>
                  </div>
                ) : (
                  <div className="playground-inspector-panel__object-list">
                    {filteredObjects.map(
                      (object) => {
                        const selected =
                          object.id ===
                          selectedId;

                        return (
                          <article
                            key={
                              object.id
                            }
                            className={
                              selected
                                ? "playground-inspector-object playground-inspector-object--selected"
                                : "playground-inspector-object"
                            }
                          >
                            <button
                              type="button"
                              className="playground-inspector-object__main"
                              onClick={() => {
                                selectObject(
                                  object,
                                );
                              }}
                              onDoubleClick={() => {
                                focusObject(
                                  object,
                                );
                              }}
                            >
                              <span className="playground-inspector-object__icon">
                                {getObjectInitial(
                                  object,
                                )}
                              </span>

                              <span className="playground-inspector-object__identity">
                                <strong>
                                  {
                                    object.name
                                  }
                                </strong>

                                <small>
                                  {
                                    object.type
                                  }
                                  {" · "}
                                  {
                                    object.id
                                  }
                                </small>
                              </span>
                            </button>

                            <div className="playground-inspector-object__badges">
                              {object.lockedBy && (
                                <span className="playground-inspector-object__badge playground-inspector-object__badge--locked">
                                  Locked
                                </span>
                              )}

                              {object.owner && (
                                <span className="playground-inspector-object__badge">
                                  {
                                    object.owner
                                  }
                                </span>
                              )}
                            </div>
                          </article>
                        );
                      },
                    )}
                  </div>
                )}
              </section>

              <aside className="playground-inspector-panel__details">
                {selectedObject ? (
                  <>
                    <div className="playground-inspector-panel__preview">
                      <span>
                        {getObjectInitial(
                          selectedObject,
                        )}
                      </span>
                    </div>

                    <p className="playground-inspector-panel__detail-label">
                      Selected object
                    </p>

                    <h3>
                      {
                        selectedObject.name
                      }
                    </h3>

                    <div className="playground-inspector-panel__detail-actions">
                      <button
                        type="button"
                        onClick={() => {
                          focusObject(
                            selectedObject,
                          );
                        }}
                      >
                        Focus object
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(
                              selectedObject.id,
                            );
                        }}
                      >
                        Copy ID
                      </button>
                    </div>

                    <dl>
                      <div>
                        <dt>
                          Object ID
                        </dt>

                        <dd>
                          {
                            selectedObject.id
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Type
                        </dt>

                        <dd>
                          {
                            selectedObject.type
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Owner
                        </dt>

                        <dd>
                          {
                            selectedObject.owner ||
                            "Unassigned"
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Locked by
                        </dt>

                        <dd>
                          {
                            selectedObject.lockedBy ||
                            "Not locked"
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Layer
                        </dt>

                        <dd>
                          {
                            selectedObject.layer ||
                            "Default"
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Parent
                        </dt>

                        <dd>
                          {parentObject
                            ? parentObject.name
                            : selectedObject.parentId ||
                              "None"}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Children
                        </dt>

                        <dd>
                          {
                            selectedObject
                              .childIds
                              .length
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Created
                        </dt>

                        <dd>
                          {formatMetadataDate(
                            selectedObject.createdAt,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Modified
                        </dt>

                        <dd>
                          {formatMetadataDate(
                            selectedObject.modifiedAt,
                          )}
                        </dd>
                      </div>
                    </dl>

                    {selectedObject.tags.length >
                      0 && (
                      <section className="playground-inspector-panel__tags">
                        <h4>
                          Tags
                        </h4>

                        <div>
                          {selectedObject.tags.map(
                            (tag) => (
                              <span
                                key={
                                  tag
                                }
                              >
                                {tag}
                              </span>
                            ),
                          )}
                        </div>
                      </section>
                    )}

                    {parentObject && (
                      <section className="playground-inspector-panel__relationship">
                        <h4>
                          Parent
                        </h4>

                        <button
                          type="button"
                          onClick={() => {
                            selectObject(
                              parentObject,
                            );
                          }}
                        >
                          {
                            parentObject.name
                          }
                        </button>
                      </section>
                    )}

                    {childObjects.length >
                      0 && (
                      <section className="playground-inspector-panel__relationship">
                        <h4>
                          Children
                        </h4>

                        <div>
                          {childObjects.map(
                            (child) => (
                              <button
                                key={
                                  child.id
                                }
                                type="button"
                                onClick={() => {
                                  selectObject(
                                    child,
                                  );
                                }}
                              >
                                {child.name}
                              </button>
                            ),
                          )}
                        </div>
                      </section>
                    )}
                  </>
                ) : (
                  <div className="playground-inspector-panel__details-empty">
                    Select an object to inspect its metadata.
                  </div>
                )}
              </aside>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
