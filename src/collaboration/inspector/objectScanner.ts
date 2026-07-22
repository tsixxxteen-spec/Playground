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
