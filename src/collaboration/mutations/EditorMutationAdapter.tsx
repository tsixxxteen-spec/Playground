import {
  useEffect,
} from "react";

import {
  dispatchSharedWorldMutation,
  SHARED_WORLD_MUTATION_APPLIED_EVENT,
} from "./events";

import type {
  SharedMutationDispatchDetail,
  SharedObjectPosition,
  SharedObjectSize,
} from "./types";

const OBJECT_SELECTOR =
  "[data-playground-object-id]";

const APPLY_SUPPRESSION_MS = 120;
const LOCAL_CHANGE_DEBOUNCE_MS = 50;

type ObjectSnapshot = {
  objectId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  left: string;
  top: string;
  transform: string;
  opacity: string;
  visibility: string;
  display: string;
  className: string;
  properties: Record<string, unknown>;
};

type PendingTimerMap =
  Map<string, ReturnType<typeof setTimeout>>;

function isHTMLElement(
  value: unknown,
): value is HTMLElement {
  return value instanceof HTMLElement;
}

function getObjectId(
  element: HTMLElement,
): string | null {
  return (
    element.dataset.playgroundObjectId ??
    null
  );
}

function readNumericDataset(
  element: HTMLElement,
  key:
    | "playgroundX"
    | "playgroundY"
    | "playgroundWidth"
    | "playgroundHeight",
): number | null {
  const value = element.dataset[key];

  if (
    value === undefined ||
    value.trim() === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function readProperties(
  element: HTMLElement,
): Record<string, unknown> {
  const raw =
    element.dataset.playgroundProperties;

  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown =
      JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<
        string,
        unknown
      >;
    }
  } catch {
    // Ignore invalid optional property metadata.
  }

  return {};
}

function takeSnapshot(
  element: HTMLElement,
): ObjectSnapshot | null {
  const objectId =
    getObjectId(element);

  if (!objectId) {
    return null;
  }

  const rect =
    element.getBoundingClientRect();

  return {
    objectId,
    x:
      readNumericDataset(
        element,
        "playgroundX",
      ) ?? rect.left,
    y:
      readNumericDataset(
        element,
        "playgroundY",
      ) ?? rect.top,
    width:
      readNumericDataset(
        element,
        "playgroundWidth",
      ) ?? rect.width,
    height:
      readNumericDataset(
        element,
        "playgroundHeight",
      ) ?? rect.height,
    left: element.style.left,
    top: element.style.top,
    transform:
      element.style.transform,
    opacity:
      element.style.opacity,
    visibility:
      element.style.visibility,
    display:
      element.style.display,
    className:
      element.className,
    properties:
      readProperties(element),
  };
}

function approximatelyEqual(
  first: number,
  second: number,
): boolean {
  return Math.abs(first - second) < 0.5;
}

function positionsEqual(
  first: ObjectSnapshot,
  second: ObjectSnapshot,
): boolean {
  return (
    approximatelyEqual(
      first.x,
      second.x,
    ) &&
    approximatelyEqual(
      first.y,
      second.y,
    )
  );
}

function sizesEqual(
  first: ObjectSnapshot,
  second: ObjectSnapshot,
): boolean {
  return (
    approximatelyEqual(
      first.width,
      second.width,
    ) &&
    approximatelyEqual(
      first.height,
      second.height,
    )
  );
}

function stableStringify(
  value: unknown,
): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function propertiesEqual(
  first: ObjectSnapshot,
  second: ObjectSnapshot,
): boolean {
  return (
    first.left === second.left &&
    first.top === second.top &&
    first.transform ===
      second.transform &&
    first.opacity ===
      second.opacity &&
    first.visibility ===
      second.visibility &&
    first.display ===
      second.display &&
    first.className ===
      second.className &&
    stableStringify(
      first.properties,
    ) ===
      stableStringify(
        second.properties,
      )
  );
}

function findObjectElement(
  objectId: string,
): HTMLElement | null {
  const elements =
    document.querySelectorAll<HTMLElement>(
      OBJECT_SELECTOR,
    );

  for (const element of elements) {
    if (
      getObjectId(element) === objectId
    ) {
      return element;
    }
  }

  return null;
}

function collectObjectElements(
  node: Node,
): HTMLElement[] {
  const results: HTMLElement[] = [];

  if (isHTMLElement(node)) {
    if (node.matches(OBJECT_SELECTOR)) {
      results.push(node);
    }

    results.push(
      ...node.querySelectorAll<HTMLElement>(
        OBJECT_SELECTOR,
      ),
    );
  }

  return results;
}

function setDatasetNumber(
  element: HTMLElement,
  key:
    | "playgroundX"
    | "playgroundY"
    | "playgroundWidth"
    | "playgroundHeight",
  value: number,
) {
  element.dataset[key] =
    String(value);
}

function applyPosition(
  element: HTMLElement,
  position: SharedObjectPosition,
) {
  setDatasetNumber(
    element,
    "playgroundX",
    position.x,
  );

  setDatasetNumber(
    element,
    "playgroundY",
    position.y,
  );

  const computed =
    window.getComputedStyle(element);

  const canApplyLeftTop =
    computed.position === "absolute" ||
    computed.position === "fixed" ||
    element.style.left !== "" ||
    element.style.top !== "";

  if (canApplyLeftTop) {
    element.style.left =
      `${position.x}px`;

    element.style.top =
      `${position.y}px`;
  }

  element.dispatchEvent(
    new CustomEvent(
      "playground:object-position-applied",
      {
        bubbles: true,
        detail: {
          objectId:
            getObjectId(element),
          position,
        },
      },
    ),
  );
}

function applySize(
  element: HTMLElement,
  size: SharedObjectSize,
) {
  setDatasetNumber(
    element,
    "playgroundWidth",
    size.width,
  );

  setDatasetNumber(
    element,
    "playgroundHeight",
    size.height,
  );

  element.style.width =
    `${size.width}px`;

  element.style.height =
    `${size.height}px`;

  element.dispatchEvent(
    new CustomEvent(
      "playground:object-size-applied",
      {
        bubbles: true,
        detail: {
          objectId:
            getObjectId(element),
          size,
        },
      },
    ),
  );
}

function applyProperties(
  element: HTMLElement,
  properties:
    Record<string, unknown>,
) {
  const style =
    properties.style;

  if (
    style &&
    typeof style === "object" &&
    !Array.isArray(style)
  ) {
    for (
      const [key, value]
      of Object.entries(style)
    ) {
      if (
        typeof value === "string" ||
        typeof value === "number"
      ) {
        element.style.setProperty(
          key,
          String(value),
        );
      }
    }
  }

  if (
    typeof properties.className ===
    "string"
  ) {
    element.className =
      properties.className;
  }

  if (
    properties.attributes &&
    typeof properties.attributes ===
      "object" &&
    !Array.isArray(
      properties.attributes,
    )
  ) {
    for (
      const [name, value]
      of Object.entries(
        properties.attributes,
      )
    ) {
      if (
        value === null ||
        value === false
      ) {
        element.removeAttribute(
          name,
        );
      } else if (
        typeof value === "string" ||
        typeof value === "number" ||
        value === true
      ) {
        element.setAttribute(
          name,
          value === true
            ? ""
            : String(value),
        );
      }
    }
  }

  if (
    properties.playgroundProperties &&
    typeof properties.playgroundProperties ===
      "object" &&
    !Array.isArray(
      properties.playgroundProperties,
    )
  ) {
    element.dataset.playgroundProperties =
      JSON.stringify(
        properties.playgroundProperties,
      );
  }

  element.dispatchEvent(
    new CustomEvent(
      "playground:object-properties-applied",
      {
        bubbles: true,
        detail: {
          objectId:
            getObjectId(element),
          properties,
        },
      },
    ),
  );
}

function buildPropertyPayload(
  snapshot: ObjectSnapshot,
): Record<string, unknown> {
  const style:
    Record<string, string> = {};

  if (snapshot.left) {
    style.left =
      snapshot.left;
  }

  if (snapshot.top) {
    style.top =
      snapshot.top;
  }

  if (snapshot.transform) {
    style.transform =
      snapshot.transform;
  }

  if (snapshot.opacity) {
    style.opacity =
      snapshot.opacity;
  }

  if (snapshot.visibility) {
    style.visibility =
      snapshot.visibility;
  }

  if (snapshot.display) {
    style.display =
      snapshot.display;
  }

  return {
    style,
    className:
      snapshot.className,
    playgroundProperties:
      snapshot.properties,
  };
}

export default function EditorMutationAdapter() {
  useEffect(() => {
    const snapshots =
      new Map<
        string,
        ObjectSnapshot
      >();

    const suppressedObjects =
      new Map<string, number>();

    const pendingTimers:
      PendingTimerMap =
        new Map();

    const pointerStartSnapshots =
      new Map<
        string,
        ObjectSnapshot
      >();

    const resizeObserver =
      new ResizeObserver(
        (entries) => {
          for (const entry of entries) {
            const element =
              entry.target;

            if (
              !isHTMLElement(element)
            ) {
              continue;
            }

            scheduleInspection(
              element,
            );
          }
        },
      );

    function isSuppressed(
      objectId: string,
    ) {
      const until =
        suppressedObjects.get(
          objectId,
        );

      if (!until) {
        return false;
      }

      if (Date.now() > until) {
        suppressedObjects.delete(
          objectId,
        );

        return false;
      }

      return true;
    }

    function suppressObject(
      objectId: string,
    ) {
      suppressedObjects.set(
        objectId,
        Date.now() +
          APPLY_SUPPRESSION_MS,
      );
    }

    function registerElement(
      element: HTMLElement,
    ) {
      const snapshot =
        takeSnapshot(element);

      if (!snapshot) {
        return;
      }

      snapshots.set(
        snapshot.objectId,
        snapshot,
      );

      resizeObserver.observe(
        element,
      );
    }

    function unregisterElement(
      element: HTMLElement,
    ) {
      resizeObserver.unobserve(
        element,
      );
    }

    function inspectElement(
      element: HTMLElement,
    ) {
      const current =
        takeSnapshot(element);

      if (!current) {
        return;
      }

      const previous =
        snapshots.get(
          current.objectId,
        );

      snapshots.set(
        current.objectId,
        current,
      );

      if (
        !previous ||
        isSuppressed(
          current.objectId,
        )
      ) {
        return;
      }

      if (
        !positionsEqual(
          previous,
          current,
        )
      ) {
        dispatchSharedWorldMutation({
          kind: "object-moved",
          objectId:
            current.objectId,
          position: {
            x: current.x,
            y: current.y,
          },
        });
      }

      if (
        !sizesEqual(
          previous,
          current,
        )
      ) {
        dispatchSharedWorldMutation({
          kind: "object-resized",
          objectId:
            current.objectId,
          size: {
            width:
              current.width,
            height:
              current.height,
          },
        });
      }

      if (
        !propertiesEqual(
          previous,
          current,
        )
      ) {
        dispatchSharedWorldMutation({
          kind:
            "object-properties-updated",
          objectId:
            current.objectId,
          properties:
            buildPropertyPayload(
              current,
            ),
        });
      }
    }

    function scheduleInspection(
      element: HTMLElement,
    ) {
      const objectId =
        getObjectId(element);

      if (!objectId) {
        return;
      }

      const existingTimer =
        pendingTimers.get(
          objectId,
        );

      if (existingTimer) {
        clearTimeout(
          existingTimer,
        );
      }

      const timer =
        setTimeout(() => {
          pendingTimers.delete(
            objectId,
          );

          inspectElement(
            element,
          );
        }, LOCAL_CHANGE_DEBOUNCE_MS);

      pendingTimers.set(
        objectId,
        timer,
      );
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      const target =
        event.target;

      if (
        !(target instanceof Element)
      ) {
        return;
      }

      const element =
        target.closest<HTMLElement>(
          OBJECT_SELECTOR,
        );

      if (!element) {
        return;
      }

      const snapshot =
        takeSnapshot(element);

      if (!snapshot) {
        return;
      }

      pointerStartSnapshots.set(
        snapshot.objectId,
        snapshot,
      );
    }

    function handlePointerUp(
      event: PointerEvent,
    ) {
      const target =
        event.target;

      if (
        !(target instanceof Element)
      ) {
        return;
      }

      const element =
        target.closest<HTMLElement>(
          OBJECT_SELECTOR,
        );

      if (!element) {
        return;
      }

      const current =
        takeSnapshot(element);

      if (!current) {
        return;
      }

      const start =
        pointerStartSnapshots.get(
          current.objectId,
        );

      pointerStartSnapshots.delete(
        current.objectId,
      );

      if (!start) {
        scheduleInspection(
          element,
        );

        return;
      }

      snapshots.set(
        current.objectId,
        current,
      );

      if (
        !positionsEqual(
          start,
          current,
        )
      ) {
        dispatchSharedWorldMutation({
          kind: "object-moved",
          objectId:
            current.objectId,
          position: {
            x: current.x,
            y: current.y,
          },
        });
      }

      if (
        !sizesEqual(
          start,
          current,
        )
      ) {
        dispatchSharedWorldMutation({
          kind: "object-resized",
          objectId:
            current.objectId,
          size: {
            width:
              current.width,
            height:
              current.height,
          },
        });
      }

      if (
        !propertiesEqual(
          start,
          current,
        )
      ) {
        dispatchSharedWorldMutation({
          kind:
            "object-properties-updated",
          objectId:
            current.objectId,
          properties:
            buildPropertyPayload(
              current,
            ),
        });
      }
    }

    function handleMutationApplied(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<
          SharedMutationDispatchDetail
        >;

      const detail =
        customEvent.detail;

      if (
        !detail ||
        !detail.mutation
      ) {
        return;
      }

      const mutation =
        detail.mutation;

      const element =
        findObjectElement(
          mutation.objectId,
        );

      if (
        mutation.kind ===
          "object-deleted"
      ) {
        if (element) {
          suppressObject(
            mutation.objectId,
          );

          unregisterElement(
            element,
          );

          element.remove();
        }

        snapshots.delete(
          mutation.objectId,
        );

        return;
      }

      if (!element) {
        document.dispatchEvent(
          new CustomEvent(
            "playground:mutation-target-missing",
            {
              detail: {
                mutation,
              },
            },
          ),
        );

        return;
      }

      suppressObject(
        mutation.objectId,
      );

      switch (mutation.kind) {
        case "object-moved":
          applyPosition(
            element,
            mutation.position,
          );
          break;

        case "object-resized":
          applySize(
            element,
            mutation.size,
          );
          break;

        case "object-properties-updated":
          applyProperties(
            element,
            mutation.properties,
          );
          break;

        default: {
          const exhaustiveCheck:
            never = mutation;

          return exhaustiveCheck;
        }
      }

      const nextSnapshot =
        takeSnapshot(element);

      if (nextSnapshot) {
        snapshots.set(
          mutation.objectId,
          nextSnapshot,
        );
      }
    }

    function publishDeletion(
      element: HTMLElement,
    ) {
      const objectId =
        getObjectId(element);

      if (
        !objectId ||
        isSuppressed(objectId)
      ) {
        return;
      }

      snapshots.delete(
        objectId,
      );

      dispatchSharedWorldMutation({
        kind: "object-deleted",
        objectId,
      });
    }

    const mutationObserver =
      new MutationObserver(
        (records) => {
          for (const record of records) {
            if (
              record.type ===
              "attributes"
            ) {
              const element =
                record.target;

              if (
                isHTMLElement(
                  element,
                ) &&
                element.matches(
                  OBJECT_SELECTOR,
                )
              ) {
                scheduleInspection(
                  element,
                );
              }

              continue;
            }

            for (
              const addedNode
              of record.addedNodes
            ) {
              const elements =
                collectObjectElements(
                  addedNode,
                );

              for (
                const element
                of elements
              ) {
                registerElement(
                  element,
                );
              }
            }

            for (
              const removedNode
              of record.removedNodes
            ) {
              const elements =
                collectObjectElements(
                  removedNode,
                );

              for (
                const element
                of elements
              ) {
                unregisterElement(
                  element,
                );

                publishDeletion(
                  element,
                );
              }
            }
          }
        },
      );

    document
      .querySelectorAll<HTMLElement>(
        OBJECT_SELECTOR,
      )
      .forEach(registerElement);

    mutationObserver.observe(
      document.body,
      {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
          "style",
          "class",
          "data-playground-x",
          "data-playground-y",
          "data-playground-width",
          "data-playground-height",
          "data-playground-properties",
        ],
      },
    );

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true,
    );

    document.addEventListener(
      "pointerup",
      handlePointerUp,
      true,
    );

    document.addEventListener(
      SHARED_WORLD_MUTATION_APPLIED_EVENT,
      handleMutationApplied,
    );

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();

      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true,
      );

      document.removeEventListener(
        "pointerup",
        handlePointerUp,
        true,
      );

      document.removeEventListener(
        SHARED_WORLD_MUTATION_APPLIED_EVENT,
        handleMutationApplied,
      );

      for (
        const timer
        of pendingTimers.values()
      ) {
        clearTimeout(timer);
      }

      pendingTimers.clear();
    };
  }, []);

  return null;
}
