import {
  captureAllSharedObjectSnapshots,
  findSharedObjectElement,
  restoreSharedObjectSnapshot,
} from "../recovery/snapshot";

import {
  PLAYGROUND_CHECKPOINT_VERSION,
} from "./types";

import type {
  SharedObjectSnapshot,
} from "../recovery/types";

import type {
  PlaygroundSessionCheckpoint,
} from "./types";

const STORAGE_PREFIX =
  "playground:shared-session:";

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

export function getCheckpointStorageKey(): string {
  const path =
    window.location.pathname || "/";

  const search =
    window.location.search || "";

  return `${STORAGE_PREFIX}${path}${search}`;
}

export function createCheckpoint(): PlaygroundSessionCheckpoint {
  const storageKey =
    getCheckpointStorageKey();

  const previous =
    readCheckpoint(storageKey);

  const now =
    Date.now();

  return {
    version:
      PLAYGROUND_CHECKPOINT_VERSION,
    id:
      previous?.id ??
      createId(),
    storageKey,
    pathname:
      window.location.pathname,
    createdAt:
      previous?.createdAt ??
      now,
    updatedAt:
      now,
    objects:
      captureAllSharedObjectSnapshots(),
  };
}

export function isCheckpoint(
  value: unknown,
): value is PlaygroundSessionCheckpoint {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const candidate =
    value as Partial<
      PlaygroundSessionCheckpoint
    >;

  return (
    candidate.version ===
      PLAYGROUND_CHECKPOINT_VERSION &&
    typeof candidate.id === "string" &&
    typeof candidate.storageKey ===
      "string" &&
    typeof candidate.pathname ===
      "string" &&
    typeof candidate.createdAt ===
      "number" &&
    typeof candidate.updatedAt ===
      "number" &&
    Array.isArray(candidate.objects)
  );
}

export function saveCheckpoint(
  checkpoint:
    PlaygroundSessionCheckpoint,
): void {
  localStorage.setItem(
    checkpoint.storageKey,
    JSON.stringify(checkpoint),
  );
}

export function readCheckpoint(
  storageKey =
    getCheckpointStorageKey(),
): PlaygroundSessionCheckpoint | null {
  const raw =
    localStorage.getItem(storageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown =
      JSON.parse(raw);

    if (!isCheckpoint(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function deleteCheckpoint(
  storageKey =
    getCheckpointStorageKey(),
): void {
  localStorage.removeItem(
    storageKey,
  );
}

function removeObjectsMissingFromCheckpoint(
  snapshots:
    SharedObjectSnapshot[],
): void {
  const incomingIds =
    new Set(
      snapshots
        .filter(
          (snapshot) =>
            snapshot.exists,
        )
        .map(
          (snapshot) =>
            snapshot.objectId,
        ),
    );

  document
    .querySelectorAll<HTMLElement>(
      "[data-playground-object-id]",
    )
    .forEach((element) => {
      const objectId =
        element.dataset
          .playgroundObjectId;

      if (
        objectId &&
        !incomingIds.has(objectId)
      ) {
        element.remove();
      }
    });
}

function restoreSnapshotsInPasses(
  snapshots:
    SharedObjectSnapshot[],
): void {
  const pending =
    [...snapshots];

  const maximumPasses =
    Math.max(
      pending.length + 1,
      2,
    );

  for (
    let pass = 0;
    pass < maximumPasses;
    pass += 1
  ) {
    if (pending.length === 0) {
      break;
    }

    let restoredThisPass = 0;

    for (
      let index =
        pending.length - 1;
      index >= 0;
      index -= 1
    ) {
      const snapshot =
        pending[index];

      const parentReady =
        !snapshot.parentObjectId ||
        Boolean(
          findSharedObjectElement(
            snapshot.parentObjectId,
          ),
        );

      if (!parentReady) {
        continue;
      }

      restoreSharedObjectSnapshot(
        snapshot,
      );

      pending.splice(
        index,
        1,
      );

      restoredThisPass += 1;
    }

    if (restoredThisPass === 0) {
      break;
    }
  }

  for (const snapshot of pending) {
    restoreSharedObjectSnapshot(
      snapshot,
    );
  }
}

export function restoreCheckpoint(
  checkpoint:
    PlaygroundSessionCheckpoint,
): void {
  if (!isCheckpoint(checkpoint)) {
    throw new Error(
      "Invalid Playground checkpoint.",
    );
  }

  removeObjectsMissingFromCheckpoint(
    checkpoint.objects,
  );

  restoreSnapshotsInPasses(
    checkpoint.objects,
  );
}

export function checkpointToJson(
  checkpoint:
    PlaygroundSessionCheckpoint,
): string {
  return JSON.stringify(
    checkpoint,
    null,
    2,
  );
}

export function checkpointFromJson(
  json: string,
): PlaygroundSessionCheckpoint {
  const parsed: unknown =
    JSON.parse(json);

  if (!isCheckpoint(parsed)) {
    throw new Error(
      "The selected file is not a valid Playground session checkpoint.",
    );
  }

  return parsed;
}
