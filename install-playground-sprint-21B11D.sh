#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.11D"
MARKER=".playground-sprint-21B11D-installed"
BACKUP_DIR=".playground-backups/sprint-21B11D-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the worlds project root."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/inspector

FILES_TO_BACK_UP=(
  "src/main.tsx"
)

for file in "${FILES_TO_BACK_UP[@]}"; do
  mkdir -p "$BACKUP_DIR/$(dirname "$file")"
  cp -p "$file" "$BACKUP_DIR/$file"
done

rollback() {
  code=$?

  if [[ $code -ne 0 ]]; then
    echo ""
    echo "⚠️ Installation failed. Restoring previous files..."

    for file in "${FILES_TO_BACK_UP[@]}"; do
      if [[ -f "$BACKUP_DIR/$file" ]]; then
        cp -p "$BACKUP_DIR/$file" "$file"
      fi
    done

    rm -rf src/collaboration/inspector
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Inspector types
# ------------------------------------------------------------

cat > src/collaboration/inspector/types.ts <<'EOF'
export type PlaygroundInspectableObject = {
  id: string;
  name: string;
  type: string;
  owner?: string;
  lockedBy?: string;
  layer?: string;
  tags: string[];
  parentId?: string;
  childIds: string[];
  createdAt?: string;
  modifiedAt?: string;
  element: HTMLElement;
};

export type PlaygroundObjectSelectionDetail = {
  objectId: string;
  objectName?: string;
  source?: string;
};

export type InspectorSortMode =
  | "name"
  | "type"
  | "recent";
EOF

# ------------------------------------------------------------
# Inspector events
# ------------------------------------------------------------

cat > src/collaboration/inspector/events.ts <<'EOF'
export const PLAYGROUND_OBJECT_SELECTED_EVENT =
  "playground:object-selected";

export const PLAYGROUND_OBJECT_FOCUS_EVENT =
  "playground:object-focus";

export const PLAYGROUND_OBJECT_INSPECT_EVENT =
  "playground:object-inspect";

export const PLAYGROUND_OBJECTS_CHANGED_EVENT =
  "playground:objects-changed";
EOF

# ------------------------------------------------------------
# DOM object scanner
# ------------------------------------------------------------

cat > src/collaboration/inspector/objectScanner.ts <<'EOF'
import type {
  PlaygroundInspectableObject,
} from "./types";

const OBJECT_SELECTOR =
  [
    "[data-playground-object-id]",
    "[data-object-id]",
    "[data-layer-id]",
  ].join(",");

function readDatasetValue(
  element: HTMLElement,
  keys: string[],
): string | undefined {
  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    const key =
      keys[index];

    const value =
      element.dataset[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return undefined;
}

function getObjectId(
  element: HTMLElement,
): string | undefined {
  return readDatasetValue(
    element,
    [
      "playgroundObjectId",
      "objectId",
      "layerId",
    ],
  );
}

function getObjectName(
  element: HTMLElement,
  objectId: string,
): string {
  const datasetName =
    readDatasetValue(
      element,
      [
        "playgroundObjectName",
        "objectName",
        "name",
        "label",
        "title",
      ],
    );

  if (datasetName) {
    return datasetName;
  }

  const ariaLabel =
    element.getAttribute(
      "aria-label",
    );

  if (
    ariaLabel &&
    ariaLabel.trim()
  ) {
    return ariaLabel.trim();
  }

  const title =
    element.getAttribute(
      "title",
    );

  if (
    title &&
    title.trim()
  ) {
    return title.trim();
  }

  return `Object ${objectId}`;
}

function getObjectType(
  element: HTMLElement,
): string {
  const datasetType =
    readDatasetValue(
      element,
      [
        "playgroundObjectType",
        "objectType",
        "type",
        "kind",
      ],
    );

  if (datasetType) {
    return datasetType;
  }

  return element.tagName
    .toLowerCase();
}

function getTags(
  element: HTMLElement,
): string[] {
  const raw =
    readDatasetValue(
      element,
      [
        "playgroundTags",
        "tags",
        "tag",
      ],
    );

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map(
      (tag) =>
        tag.trim(),
    )
    .filter(Boolean);
}

function findParentObjectId(
  element: HTMLElement,
  ownId: string,
): string | undefined {
  let parent =
    element.parentElement;

  while (parent) {
    const parentId =
      getObjectId(parent);

    if (
      parentId &&
      parentId !== ownId
    ) {
      return parentId;
    }

    parent =
      parent.parentElement;
  }

  return undefined;
}

function findChildObjectIds(
  element: HTMLElement,
  ownId: string,
): string[] {
  const childIds: string[] =
    [];

  const descendants =
    element.querySelectorAll<HTMLElement>(
      OBJECT_SELECTOR,
    );

  descendants.forEach(
    (descendant) => {
      const descendantId =
        getObjectId(
          descendant,
        );

      if (
        descendantId &&
        descendantId !== ownId &&
        childIds.indexOf(
          descendantId,
        ) === -1
      ) {
        childIds.push(
          descendantId,
        );
      }
    },
  );

  return childIds;
}

export function scanInspectableObjects():
  PlaygroundInspectableObject[] {
  const elements =
    document.querySelectorAll<HTMLElement>(
      OBJECT_SELECTOR,
    );

  const seenIds: {
    [key: string]: boolean;
  } = {};

  const objects:
    PlaygroundInspectableObject[] =
    [];

  elements.forEach(
    (element) => {
      const objectId =
        getObjectId(element);

      if (
        !objectId ||
        seenIds[objectId]
      ) {
        return;
      }

      seenIds[objectId] =
        true;

      objects.push({
        id:
          objectId,
        name:
          getObjectName(
            element,
            objectId,
          ),
        type:
          getObjectType(
            element,
          ),
        owner:
          readDatasetValue(
            element,
            [
              "playgroundOwner",
              "owner",
              "ownerName",
            ],
          ),
        lockedBy:
          readDatasetValue(
            element,
            [
              "playgroundLockedBy",
              "lockedBy",
              "lockOwner",
            ],
          ),
        layer:
          readDatasetValue(
            element,
            [
              "playgroundLayer",
              "layer",
              "layerName",
            ],
          ),
        tags:
          getTags(element),
        parentId:
          findParentObjectId(
            element,
            objectId,
          ),
        childIds:
          findChildObjectIds(
            element,
            objectId,
          ),
        createdAt:
          readDatasetValue(
            element,
            [
              "playgroundCreatedAt",
              "createdAt",
              "created",
            ],
          ),
        modifiedAt:
          readDatasetValue(
            element,
            [
              "playgroundModifiedAt",
              "modifiedAt",
              "updatedAt",
              "modified",
            ],
          ),
        element,
      });
    },
  );

  return objects;
}

export function focusInspectableObject(
  object:
    PlaygroundInspectableObject,
): void {
  object.element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  });

  object.element.classList.add(
    "playground-inspector-target",
  );

  window.setTimeout(() => {
    object.element.classList.remove(
      "playground-inspector-target",
    );
  }, 1_800);
}
EOF

# ------------------------------------------------------------
# Inspector panel
# ------------------------------------------------------------

cat > src/collaboration/inspector/ObjectInspectorPanel.tsx <<'EOF'
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
EOF

# ------------------------------------------------------------
# Inspector styling
# ------------------------------------------------------------

cat > src/collaboration/inspector/object-inspector-panel.css <<'EOF'
.playground-inspector-launcher {
  position: fixed;
  right: 18px;
  bottom: 228px;
  z-index: 9998;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid
    rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  background:
    rgba(18, 18, 20, 0.94);
  color:
    rgba(255, 255, 255, 0.9);
  font:
    650 12px/1
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  cursor: pointer;
  box-shadow:
    0 12px 36px
    rgba(0, 0, 0, 0.32);
  backdrop-filter:
    blur(18px);
}

.playground-inspector-launcher:hover {
  background:
    rgba(28, 28, 31, 0.98);
  transform:
    translateY(-1px);
}

.playground-inspector-launcher__count {
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  margin-left: 2px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.08);
  color:
    rgba(255, 255, 255, 0.62);
  font-size: 9px;
}

.playground-inspector-overlay {
  position: fixed;
  inset: 0;
  z-index: 12300;
  display: grid;
  place-items: center;
  padding: 28px;
  background:
    rgba(0, 0, 0, 0.54);
  backdrop-filter:
    blur(16px);
  animation:
    playground-inspector-fade
    160ms ease-out;
}

.playground-inspector-panel {
  width:
    min(1040px, 96vw);
  height:
    min(720px, 88vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid
    rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  background:
    rgba(14, 14, 16, 0.98);
  color: #fff;
  box-shadow:
    0 36px 100px
    rgba(0, 0, 0, 0.58);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  animation:
    playground-inspector-rise
    210ms
    cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}

.playground-inspector-panel__header {
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.08);
}

.playground-inspector-panel__eyebrow {
  margin: 0 0 4px;
  color:
    rgba(255, 255, 255, 0.4);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.playground-inspector-panel__header h2 {
  margin: 0;
  font-size: 25px;
  font-weight: 680;
  letter-spacing: -0.035em;
}

.playground-inspector-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.playground-inspector-panel__object-count {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  padding: 0 11px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.playground-inspector-panel__close {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.07);
  color:
    rgba(255, 255, 255, 0.72);
  font-size: 20px;
  cursor: pointer;
}

.playground-inspector-panel__close:hover {
  background:
    rgba(255, 255, 255, 0.12);
  color: #fff;
}

.playground-inspector-panel__toolbar {
  min-height: 62px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.07);
}

.playground-inspector-panel__search {
  min-width: 0;
  flex: 1;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 11px;
  border: 1px solid
    rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background:
    rgba(255, 255, 255, 0.04);
}

.playground-inspector-panel__search > span {
  color:
    rgba(255, 255, 255, 0.34);
  font-size: 14px;
}

.playground-inspector-panel__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  color: #fff;
  font: inherit;
  font-size: 11px;
}

.playground-inspector-panel__search button {
  width: 25px;
  height: 25px;
  border: 0;
  border-radius: 7px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.55);
  cursor: pointer;
}

.playground-inspector-panel__toolbar select {
  height: 38px;
  padding: 0 30px 0 11px;
  border: 1px solid
    rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  outline: none;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.75);
  font: inherit;
  font-size: 10px;
}

.playground-inspector-panel__shortcut {
  color:
    rgba(255, 255, 255, 0.34);
  font-size: 11px;
}

.playground-inspector-panel__body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    320px;
}

.playground-inspector-panel__results {
  min-width: 0;
  overflow-y: auto;
  padding: 14px;
}

.playground-inspector-panel__results-header {
  display: flex;
  justify-content: space-between;
  padding: 3px 5px 12px;
  color:
    rgba(255, 255, 255, 0.35);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.playground-inspector-panel__object-list {
  display: grid;
  gap: 7px;
}

.playground-inspector-object {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    auto;
  align-items: center;
  gap: 10px;
  min-height: 62px;
  padding: 8px 10px;
  border: 1px solid
    transparent;
  border-radius: 14px;
  background:
    rgba(255, 255, 255, 0.025);
}

.playground-inspector-object:hover {
  background:
    rgba(255, 255, 255, 0.05);
}

.playground-inspector-object--selected {
  border-color:
    rgba(255, 255, 255, 0.15);
  background:
    rgba(255, 255, 255, 0.075);
}

.playground-inspector-object__main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.playground-inspector-object__icon {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.12),
      rgba(255, 255, 255, 0.045)
    );
  color:
    rgba(255, 255, 255, 0.76);
  font-size: 13px;
  font-weight: 700;
}

.playground-inspector-object__identity {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.playground-inspector-object__identity strong {
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 630;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-inspector-object__identity small {
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.38);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-inspector-object__badges {
  display: flex;
  align-items: center;
  gap: 5px;
}

.playground-inspector-object__badge {
  padding: 5px 7px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.06);
  color:
    rgba(255, 255, 255, 0.4);
  font-size: 8px;
}

.playground-inspector-object__badge--locked {
  color: #f1d58d;
  background:
    rgba(213, 170, 72, 0.12);
}

.playground-inspector-panel__details {
  min-width: 0;
  overflow-y: auto;
  padding: 22px;
  border-left: 1px solid
    rgba(255, 255, 255, 0.07);
  background:
    rgba(255, 255, 255, 0.016);
}

.playground-inspector-panel__preview {
  height: 122px;
  display: grid;
  place-items: center;
  margin-bottom: 17px;
  border: 1px solid
    rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background:
    radial-gradient(
      circle at 34% 24%,
      rgba(255, 255, 255, 0.12),
      transparent 43%
    ),
    rgba(255, 255, 255, 0.025);
}

.playground-inspector-panel__preview span {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background:
    rgba(255, 255, 255, 0.07);
  color:
    rgba(255, 255, 255, 0.46);
  font-size: 20px;
  font-weight: 700;
}

.playground-inspector-panel__detail-label {
  margin: 0 0 5px;
  color:
    rgba(255, 255, 255, 0.35);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.playground-inspector-panel__details h3 {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 650;
}

.playground-inspector-panel__detail-actions {
  display: flex;
  gap: 7px;
  margin-bottom: 16px;
}

.playground-inspector-panel__detail-actions button {
  flex: 1;
  min-height: 32px;
  border: 1px solid
    rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.75);
  font: inherit;
  font-size: 9px;
  cursor: pointer;
}

.playground-inspector-panel__detail-actions button:hover {
  background:
    rgba(255, 255, 255, 0.1);
}

.playground-inspector-panel__details dl {
  margin: 0 0 18px;
}

.playground-inspector-panel__details dl div {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 9px 0;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.055);
}

.playground-inspector-panel__details dt {
  color:
    rgba(255, 255, 255, 0.38);
  font-size: 10px;
}

.playground-inspector-panel__details dd {
  max-width: 170px;
  margin: 0;
  overflow-wrap: anywhere;
  color:
    rgba(255, 255, 255, 0.73);
  font-size: 10px;
  text-align: right;
}

.playground-inspector-panel__tags,
.playground-inspector-panel__relationship {
  margin-top: 17px;
}

.playground-inspector-panel__tags h4,
.playground-inspector-panel__relationship h4 {
  margin: 0 0 9px;
  color:
    rgba(255, 255, 255, 0.4);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.playground-inspector-panel__tags > div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.playground-inspector-panel__tags span {
  padding: 5px 8px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.06);
  color:
    rgba(255, 255, 255, 0.53);
  font-size: 8px;
}

.playground-inspector-panel__relationship > div {
  display: grid;
  gap: 5px;
}

.playground-inspector-panel__relationship button {
  width: 100%;
  min-height: 31px;
  padding: 0 9px;
  border: 1px solid
    rgba(255, 255, 255, 0.075);
  border-radius: 8px;
  background:
    rgba(255, 255, 255, 0.035);
  color:
    rgba(255, 255, 255, 0.62);
  font: inherit;
  font-size: 9px;
  text-align: left;
  cursor: pointer;
}

.playground-inspector-panel__relationship button:hover {
  background:
    rgba(255, 255, 255, 0.075);
}

.playground-inspector-panel__empty,
.playground-inspector-panel__details-empty {
  height: 100%;
  display: grid;
  place-items: center;
  align-content: center;
  color:
    rgba(255, 255, 255, 0.36);
  text-align: center;
}

.playground-inspector-panel__empty span {
  margin-bottom: 12px;
  font-size: 30px;
}

.playground-inspector-panel__empty h3 {
  margin: 0 0 7px;
  color:
    rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.playground-inspector-panel__empty p {
  max-width: 300px;
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
}

.playground-inspector-target {
  outline:
    2px solid
    rgba(255, 255, 255, 0.92) !important;
  outline-offset:
    4px !important;
  animation:
    playground-inspector-pulse
    650ms ease-in-out
    2 !important;
}

@keyframes playground-inspector-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes playground-inspector-rise {
  from {
    opacity: 0;
    transform:
      translateY(16px)
      scale(0.985);
  }

  to {
    opacity: 1;
    transform:
      translateY(0)
      scale(1);
  }
}

@keyframes playground-inspector-pulse {
  0%,
  100% {
    filter:
      brightness(1);
  }

  50% {
    filter:
      brightness(1.35);
  }
}

@media (max-width: 840px) {
  .playground-inspector-panel__body {
    grid-template-columns: 1fr;
  }

  .playground-inspector-panel__details {
    display: none;
  }
}

@media (max-width: 620px) {
  .playground-inspector-overlay {
    padding: 10px;
  }

  .playground-inspector-panel {
    width: 100%;
    height: 94vh;
    border-radius: 18px;
  }

  .playground-inspector-panel__header {
    padding: 16px;
  }

  .playground-inspector-panel__object-count,
  .playground-inspector-panel__shortcut {
    display: none;
  }

  .playground-inspector-panel__toolbar {
    padding-right: 16px;
    padding-left: 16px;
  }

  .playground-inspector-panel__toolbar select {
    max-width: 125px;
  }

  .playground-inspector-object {
    grid-template-columns: 1fr;
  }

  .playground-inspector-object__badges {
    padding-left: 52px;
  }

  .playground-inspector-launcher {
    right: 10px;
    bottom: 220px;
  }
}
EOF

# ------------------------------------------------------------
# Public exports
# ------------------------------------------------------------

cat > src/collaboration/inspector/index.ts <<'EOF'
export {
  default as ObjectInspectorPanel,
} from "./ObjectInspectorPanel";

export {
  PLAYGROUND_OBJECT_FOCUS_EVENT,
  PLAYGROUND_OBJECT_INSPECT_EVENT,
  PLAYGROUND_OBJECT_SELECTED_EVENT,
  PLAYGROUND_OBJECTS_CHANGED_EVENT,
} from "./events";

export {
  focusInspectableObject,
  scanInspectableObjects,
} from "./objectScanner";

export type {
  InspectorSortMode,
  PlaygroundInspectableObject,
  PlaygroundObjectSelectionDetail,
} from "./types";
EOF

# ------------------------------------------------------------
# Mount ObjectInspectorPanel in main.tsx
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path


def insert_import(
    source: str,
    statement: str,
    identity: str,
) -> str:
    if identity in source:
        return source

    lines = source.splitlines(
        keepends=True,
    )

    last_import_end = -1
    inside_import = False

    for index, line in enumerate(lines):
        stripped = line.strip()

        if not inside_import:
            if stripped.startswith("import "):
                inside_import = True
                last_import_end = index

                if stripped.endswith(";"):
                    inside_import = False

                continue

            if (
                stripped == ""
                or stripped.startswith("//")
                or stripped.startswith("/*")
            ):
                continue

            break

        last_import_end = index

        if stripped.endswith(";"):
            inside_import = False

    insertion_index = (
        last_import_end + 1
        if last_import_end >= 0
        else 0
    )

    lines.insert(
        insertion_index,
        statement,
    )

    return "".join(lines)


path = Path("src/main.tsx")
text = path.read_text()

text = insert_import(
    text,
    (
        'import ObjectInspectorPanel '
        'from "./collaboration/inspector/ObjectInspectorPanel";\n'
    ),
    'from "./collaboration/inspector/ObjectInspectorPanel"',
)

if "<ObjectInspectorPanel />" not in text:
    anchors = [
        "<CollaborationDashboard />",
        "<VisualHistoryPanel />",
        "<SessionManager />",
        "<SessionControls />",
        "<PersistentSessionBridge />",
        "<SharedRecoveryBridge />",
        "<EditorMutationAdapter />",
        "<SharedMutationBridge />",
        "<App />",
    ]

    selected_anchor = next(
        (
            anchor
            for anchor in anchors
            if anchor in text
        ),
        None,
    )

    if selected_anchor is None:
        raise SystemExit(
            "❌ No suitable ObjectInspectorPanel mount location was found in src/main.tsx."
        )

    text = text.replace(
        selected_anchor,
        (
            selected_anchor
            + "\n                "
            + "<ObjectInspectorPanel />"
        ),
        1,
    )

path.write_text(text)

print("✅ ObjectInspectorPanel imported.")
print("✅ ObjectInspectorPanel mounted.")
PY

echo ""
echo "Running clean build..."
echo ""

npm run build

touch "$MARKER"

trap - EXIT

echo ""
echo "✅ Sprint $SPRINT_ID installed successfully."
echo "✅ Clean build completed."
echo ""
echo "Backup:"
echo "  $BACKUP_DIR"
echo ""
echo "Inspector and Search features:"
echo "  • Live object discovery"
echo "  • Search by name, ID, owner, type, tag, or layer"
echo "  • Object metadata inspector"
echo "  • Parent and child relationships"
echo "  • Owner and lock information"
echo "  • Created and modified metadata"
echo "  • Click-to-select"
echo "  • Double-click-to-focus"
echo "  • Selection synchronization"
echo "  • Command/Ctrl + F shortcut"
echo ""
echo "Launch the Tauri app with:"
echo "  ./open-playground-tauri.sh"
