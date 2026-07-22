#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.9"
MARKER=".playground-sprint-21B9-installed"
BACKUP_DIR=".playground-backups/sprint-21B9-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the Playground project root."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."
[[ -f src/collaboration/mutations/types.ts ]] || fail "Sprint 21B.8 is required."
[[ -f src/collaboration/mutations/events.ts ]] || fail "Mutation events were not found."
[[ -f src/collaboration/mutations/SharedMutationContext.tsx ]] || fail "SharedMutationContext was not found."
[[ -f src/collaboration/transport/types.ts ]] || fail "Collaboration transport types were not found."
[[ -f src/collaboration/transport/CollaborationTransportContext.tsx ]] || fail "Transport context was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/recovery

FILES_TO_BACK_UP=(
  "src/main.tsx"
  "src/collaboration/transport/types.ts"
  "src/collaboration/transport/CollaborationTransportContext.tsx"
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

    rm -rf src/collaboration/recovery
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Recovery and history types
# ------------------------------------------------------------

cat > src/collaboration/recovery/types.ts <<'EOF'
import type {
  SharedMutationInput,
  SharedObjectPosition,
  SharedObjectSize,
  SharedWorldMutation,
} from "../mutations/types";

export type SharedObjectSnapshot = {
  objectId: string;
  exists: boolean;
  position?: SharedObjectPosition;
  size?: SharedObjectSize;
  properties?: Record<string, unknown>;
  html?: string;
  parentObjectId?: string;
  parentSelector?: string;
  siblingIndex?: number;
};

export type SharedHistoryEntry = {
  id: string;
  participantId: string;
  participantName: string;
  mutation: SharedWorldMutation;
  before: SharedObjectSnapshot;
  after: SharedObjectSnapshot;
  createdAt: number;
};

export type SharedUndoRequest = {
  historyEntryId: string;
  participantId: string;
  requestedAt: number;
};

export type SharedRedoRequest = {
  historyEntryId: string;
  participantId: string;
  requestedAt: number;
};

export type SharedResyncRequest = {
  id: string;
  participantId: string;
  requestedAt: number;
};

export type SharedResyncSnapshot = {
  id: string;
  sourceParticipantId: string;
  createdAt: number;
  objects: SharedObjectSnapshot[];
};

export type SharedRecoveryAction =
  | {
      type: "undo";
      entry: SharedHistoryEntry;
      inverse: SharedMutationInput;
    }
  | {
      type: "redo";
      entry: SharedHistoryEntry;
      mutation: SharedMutationInput;
    };
EOF

# ------------------------------------------------------------
# Snapshot utilities
# ------------------------------------------------------------

cat > src/collaboration/recovery/snapshot.ts <<'EOF'
import type {
  SharedObjectSnapshot,
} from "./types";

const OBJECT_SELECTOR =
  "[data-playground-object-id]";

function readNumber(
  value: string | undefined,
): number | undefined {
  if (
    value === undefined ||
    value.trim() === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
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
    return {};
  }

  return {};
}

export function findSharedObjectElement(
  objectId: string,
): HTMLElement | null {
  const elements =
    document.querySelectorAll<HTMLElement>(
      OBJECT_SELECTOR,
    );

  for (const element of elements) {
    if (
      element.dataset
        .playgroundObjectId === objectId
    ) {
      return element;
    }
  }

  return null;
}

export function captureSharedObjectSnapshot(
  objectId: string,
): SharedObjectSnapshot {
  const element =
    findSharedObjectElement(
      objectId,
    );

  if (!element) {
    return {
      objectId,
      exists: false,
    };
  }

  const rect =
    element.getBoundingClientRect();

  const parent =
    element.parentElement;

  const siblings =
    parent
      ? Array.from(
          parent.children,
        )
      : [];

  const siblingIndex =
    siblings.indexOf(element);

  const parentObjectId =
    parent?.dataset
      .playgroundObjectId;

  return {
    objectId,
    exists: true,
    position: {
      x:
        readNumber(
          element.dataset
            .playgroundX,
        ) ?? rect.left,
      y:
        readNumber(
          element.dataset
            .playgroundY,
        ) ?? rect.top,
    },
    size: {
      width:
        readNumber(
          element.dataset
            .playgroundWidth,
        ) ?? rect.width,
      height:
        readNumber(
          element.dataset
            .playgroundHeight,
        ) ?? rect.height,
    },
    properties: {
      style:
        element.getAttribute(
          "style",
        ) ?? "",
      className:
        element.className,
      playgroundProperties:
        readProperties(element),
    },
    html:
      element.outerHTML,
    parentObjectId,
    parentSelector:
      parentObjectId
        ? undefined
        : parent === document.body
          ? "body"
          : undefined,
    siblingIndex:
      siblingIndex >= 0
        ? siblingIndex
        : undefined,
  };
}

export function captureAllSharedObjectSnapshots(): SharedObjectSnapshot[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      OBJECT_SELECTOR,
    ),
  ).flatMap((element) => {
    const objectId =
      element.dataset
        .playgroundObjectId;

    if (!objectId) {
      return [];
    }

    return [
      captureSharedObjectSnapshot(
        objectId,
      ),
    ];
  });
}

function applyStyleAttribute(
  element: HTMLElement,
  value: unknown,
) {
  if (typeof value !== "string") {
    return;
  }

  if (value.trim() === "") {
    element.removeAttribute(
      "style",
    );

    return;
  }

  element.setAttribute(
    "style",
    value,
  );
}

export function restoreSharedObjectSnapshot(
  snapshot: SharedObjectSnapshot,
) {
  const existing =
    findSharedObjectElement(
      snapshot.objectId,
    );

  if (!snapshot.exists) {
    existing?.remove();
    return;
  }

  let element = existing;

  if (
    !element &&
    snapshot.html
  ) {
    const template =
      document.createElement(
        "template",
      );

    template.innerHTML =
      snapshot.html.trim();

    const restored =
      template.content
        .firstElementChild;

    if (
      restored instanceof
      HTMLElement
    ) {
      element = restored;

      let parent:
        HTMLElement | null = null;

      if (
        snapshot.parentObjectId
      ) {
        parent =
          findSharedObjectElement(
            snapshot.parentObjectId,
          );
      }

      if (
        !parent &&
        snapshot.parentSelector
      ) {
        parent =
          document.querySelector<HTMLElement>(
            snapshot.parentSelector,
          );
      }

      if (!parent) {
        parent = document.body;
      }

      const children =
        Array.from(
          parent.children,
        );

      const reference =
        snapshot.siblingIndex !==
          undefined
          ? children[
              snapshot.siblingIndex
            ]
          : undefined;

      if (reference) {
        parent.insertBefore(
          element,
          reference,
        );
      } else {
        parent.appendChild(
          element,
        );
      }
    }
  }

  if (!element) {
    return;
  }

  if (snapshot.position) {
    element.dataset.playgroundX =
      String(
        snapshot.position.x,
      );

    element.dataset.playgroundY =
      String(
        snapshot.position.y,
      );

    const computed =
      window.getComputedStyle(
        element,
      );

    if (
      computed.position ===
        "absolute" ||
      computed.position ===
        "fixed" ||
      element.style.left !== "" ||
      element.style.top !== ""
    ) {
      element.style.left =
        `${snapshot.position.x}px`;

      element.style.top =
        `${snapshot.position.y}px`;
    }
  }

  if (snapshot.size) {
    element.dataset.playgroundWidth =
      String(
        snapshot.size.width,
      );

    element.dataset.playgroundHeight =
      String(
        snapshot.size.height,
      );

    element.style.width =
      `${snapshot.size.width}px`;

    element.style.height =
      `${snapshot.size.height}px`;
  }

  const properties =
    snapshot.properties ?? {};

  applyStyleAttribute(
    element,
    properties.style,
  );

  if (
    typeof properties.className ===
    "string"
  ) {
    element.className =
      properties.className;
  }

  const playgroundProperties =
    properties.playgroundProperties;

  if (
    playgroundProperties &&
    typeof playgroundProperties ===
      "object" &&
    !Array.isArray(
      playgroundProperties,
    )
  ) {
    element.dataset.playgroundProperties =
      JSON.stringify(
        playgroundProperties,
      );
  }
}
EOF

# ------------------------------------------------------------
# Recovery context
# ------------------------------------------------------------

cat > src/collaboration/recovery/SharedRecoveryContext.tsx <<'EOF'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  SharedHistoryEntry,
} from "./types";

const MAX_HISTORY = 150;

type SharedRecoveryContextValue = {
  undoStack: SharedHistoryEntry[];
  redoStack: SharedHistoryEntry[];

  pushHistoryEntry: (
    entry: SharedHistoryEntry,
  ) => void;

  popUndoEntry: (
    participantId: string,
  ) => SharedHistoryEntry | null;

  popRedoEntry: (
    participantId: string,
  ) => SharedHistoryEntry | null;

  pushRedoEntry: (
    entry: SharedHistoryEntry,
  ) => void;

  pushUndoEntry: (
    entry: SharedHistoryEntry,
  ) => void;

  clearRecoveryHistory: () => void;
};

const SharedRecoveryContext =
  createContext<
    SharedRecoveryContextValue | null
  >(null);

type SharedRecoveryProviderProps = {
  children: ReactNode;
};

export function SharedRecoveryProvider({
  children,
}: SharedRecoveryProviderProps) {
  const [
    undoStack,
    setUndoStack,
  ] = useState<
    SharedHistoryEntry[]
  >([]);

  const [
    redoStack,
    setRedoStack,
  ] = useState<
    SharedHistoryEntry[]
  >([]);

  const pushHistoryEntry =
    useCallback(
      (entry: SharedHistoryEntry) => {
        setUndoStack((current) =>
          [
            ...current,
            entry,
          ].slice(-MAX_HISTORY),
        );

        setRedoStack([]);
      },
      [],
    );

  const popUndoEntry =
    useCallback(
      (
        participantId: string,
      ): SharedHistoryEntry | null => {
        let selected:
          SharedHistoryEntry | null =
          null;

        setUndoStack((current) => {
          const index =
            [...current]
              .reverse()
              .findIndex(
                (entry) =>
                  entry.participantId ===
                  participantId,
              );

          if (index === -1) {
            return current;
          }

          const actualIndex =
            current.length -
            1 -
            index;

          selected =
            current[actualIndex];

          return current.filter(
            (_, entryIndex) =>
              entryIndex !==
              actualIndex,
          );
        });

        return selected;
      },
      [],
    );

  const popRedoEntry =
    useCallback(
      (
        participantId: string,
      ): SharedHistoryEntry | null => {
        let selected:
          SharedHistoryEntry | null =
          null;

        setRedoStack((current) => {
          const index =
            [...current]
              .reverse()
              .findIndex(
                (entry) =>
                  entry.participantId ===
                  participantId,
              );

          if (index === -1) {
            return current;
          }

          const actualIndex =
            current.length -
            1 -
            index;

          selected =
            current[actualIndex];

          return current.filter(
            (_, entryIndex) =>
              entryIndex !==
              actualIndex,
          );
        });

        return selected;
      },
      [],
    );

  const pushRedoEntry =
    useCallback(
      (entry: SharedHistoryEntry) => {
        setRedoStack((current) =>
          [
            ...current,
            entry,
          ].slice(-MAX_HISTORY),
        );
      },
      [],
    );

  const pushUndoEntry =
    useCallback(
      (entry: SharedHistoryEntry) => {
        setUndoStack((current) =>
          [
            ...current,
            entry,
          ].slice(-MAX_HISTORY),
        );
      },
      [],
    );

  const clearRecoveryHistory =
    useCallback(() => {
      setUndoStack([]);
      setRedoStack([]);
    }, []);

  const value = useMemo(
    () => ({
      undoStack,
      redoStack,
      pushHistoryEntry,
      popUndoEntry,
      popRedoEntry,
      pushRedoEntry,
      pushUndoEntry,
      clearRecoveryHistory,
    }),
    [
      undoStack,
      redoStack,
      pushHistoryEntry,
      popUndoEntry,
      popRedoEntry,
      pushRedoEntry,
      pushUndoEntry,
      clearRecoveryHistory,
    ],
  );

  return (
    <SharedRecoveryContext.Provider
      value={value}
    >
      {children}
    </SharedRecoveryContext.Provider>
  );
}

export function useSharedRecovery() {
  const context =
    useContext(
      SharedRecoveryContext,
    );

  if (!context) {
    throw new Error(
      "useSharedRecovery must be used inside SharedRecoveryProvider.",
    );
  }

  return context;
}
EOF

# ------------------------------------------------------------
# Transport extensions
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/collaboration/transport/types.ts"
)

text = path.read_text()

recovery_import = '''import type {
  SharedResyncRequest,
  SharedResyncSnapshot,
} from "../recovery/types";

'''

if 'from "../recovery/types"' not in text:
    lines = text.splitlines(
        keepends=True
    )

    last_import_end = -1
    in_import = False

    for index, line in enumerate(lines):
        stripped = line.strip()

        if not in_import:
            if stripped.startswith("import "):
                in_import = True
                last_import_end = index

                if stripped.endswith(";"):
                    in_import = False

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
            in_import = False

    insertion_index = (
        last_import_end + 1
        if last_import_end >= 0
        else 0
    )

    lines.insert(
        insertion_index,
        "\n" + recovery_import,
    )

    text = "".join(lines)

anchor = '''  | {
      id: string;
      type: "world-mutation";
      sessionId: string;
      senderId: string;
      sentAt: number;
      mutation: SharedWorldMutation;
    };
'''

replacement = '''  | {
      id: string;
      type: "world-mutation";
      sessionId: string;
      senderId: string;
      sentAt: number;
      mutation: SharedWorldMutation;
    }
  | {
      id: string;
      type: "session-resync-requested";
      sessionId: string;
      senderId: string;
      sentAt: number;
      request: SharedResyncRequest;
    }
  | {
      id: string;
      type: "session-resync-snapshot";
      sessionId: string;
      senderId: string;
      sentAt: number;
      snapshot: SharedResyncSnapshot;
    };
'''

if '"session-resync-requested"' not in text:
    if anchor not in text:
        raise SystemExit(
            "❌ Sprint 21B.8 world-mutation transport anchor was not found."
        )

    text = text.replace(
        anchor,
        replacement,
        1,
    )

path.write_text(text)

print("✅ Recovery transport messages added.")
PY

# ------------------------------------------------------------
# Recovery bridge
# ------------------------------------------------------------

cat > src/collaboration/recovery/SharedRecoveryBridge.tsx <<'EOF'
import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import {
  dispatchSharedWorldMutation,
  SHARED_WORLD_MUTATION_APPLIED_EVENT,
  SHARED_WORLD_MUTATION_REJECTED_EVENT,
} from "../mutations/events";

import {
  useSharedMutations,
} from "../mutations/SharedMutationContext";

import {
  collaborationTransport,
} from "../transport";

import {
  useCollaborationTransport,
} from "../transport/CollaborationTransportContext";

import {
  createTransportMessage,
} from "../transport/messageFactory";

import {
  captureAllSharedObjectSnapshots,
  captureSharedObjectSnapshot,
  restoreSharedObjectSnapshot,
} from "./snapshot";

import {
  useSharedRecovery,
} from "./SharedRecoveryContext";

import type {
  SharedMutationDispatchDetail,
  SharedMutationInput,
  SharedWorldMutation,
} from "../mutations/types";

import type {
  SharedHistoryEntry,
  SharedObjectSnapshot,
  SharedResyncRequest,
  SharedResyncSnapshot,
} from "./types";

function createId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
  ].join("-");
}

function mutationToInput(
  mutation: SharedWorldMutation,
): SharedMutationInput {
  switch (mutation.kind) {
    case "object-moved":
      return {
        kind: mutation.kind,
        objectId:
          mutation.objectId,
        position:
          mutation.position,
      };

    case "object-resized":
      return {
        kind: mutation.kind,
        objectId:
          mutation.objectId,
        size: mutation.size,
      };

    case "object-properties-updated":
      return {
        kind: mutation.kind,
        objectId:
          mutation.objectId,
        properties:
          mutation.properties,
      };

    case "object-deleted":
      return {
        kind: mutation.kind,
        objectId:
          mutation.objectId,
      };

    default: {
      const exhaustiveCheck:
        never = mutation;

      return exhaustiveCheck;
    }
  }
}

function snapshotToMutationInput(
  snapshot: SharedObjectSnapshot,
): SharedMutationInput | null {
  if (!snapshot.exists) {
    return {
      kind: "object-deleted",
      objectId:
        snapshot.objectId,
    };
  }

  if (snapshot.position) {
    return {
      kind: "object-moved",
      objectId:
        snapshot.objectId,
      position:
        snapshot.position,
    };
  }

  if (snapshot.size) {
    return {
      kind: "object-resized",
      objectId:
        snapshot.objectId,
      size: snapshot.size,
    };
  }

  if (snapshot.properties) {
    return {
      kind:
        "object-properties-updated",
      objectId:
        snapshot.objectId,
      properties:
        snapshot.properties,
    };
  }

  return null;
}

function restoreWorld(
  objects:
    SharedObjectSnapshot[],
) {
  const incomingIds =
    new Set(
      objects
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
        !incomingIds.has(
          objectId,
        )
      ) {
        element.remove();
      }
    });

  for (const snapshot of objects) {
    restoreSharedObjectSnapshot(
      snapshot,
    );
  }
}

export default function SharedRecoveryBridge() {
  const {
    session,
  } = useCollaborationSession();

  const {
    send,
  } = useCollaborationTransport();

  const {
    clearMutationHistory,
  } = useSharedMutations();

  const {
    pushHistoryEntry,
    popUndoEntry,
    popRedoEntry,
    pushRedoEntry,
    pushUndoEntry,
    clearRecoveryHistory,
  } = useSharedRecovery();

  const beforeSnapshotsRef =
    useRef<
      Map<
        string,
        SharedObjectSnapshot
      >
    >(new Map());

  const resyncInProgressRef =
    useRef(false);

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  const performUndo =
    useCallback(() => {
      if (!localParticipant) {
        return;
      }

      const entry =
        popUndoEntry(
          localParticipant.id,
        );

      if (!entry) {
        return;
      }

      restoreSharedObjectSnapshot(
        entry.before,
      );

      const inverse =
        snapshotToMutationInput(
          entry.before,
        );

      if (inverse) {
        dispatchSharedWorldMutation(
          inverse,
        );
      }

      pushRedoEntry(entry);

      document.dispatchEvent(
        new CustomEvent(
          "playground:undo-completed",
          {
            detail: {
              entry,
            },
          },
        ),
      );
    }, [
      localParticipant,
      popUndoEntry,
      pushRedoEntry,
    ]);

  const performRedo =
    useCallback(() => {
      if (!localParticipant) {
        return;
      }

      const entry =
        popRedoEntry(
          localParticipant.id,
        );

      if (!entry) {
        return;
      }

      restoreSharedObjectSnapshot(
        entry.after,
      );

      dispatchSharedWorldMutation(
        mutationToInput(
          entry.mutation,
        ),
      );

      pushUndoEntry(entry);

      document.dispatchEvent(
        new CustomEvent(
          "playground:redo-completed",
          {
            detail: {
              entry,
            },
          },
        ),
      );
    }, [
      localParticipant,
      popRedoEntry,
      pushUndoEntry,
    ]);

  const requestResync =
    useCallback(() => {
      if (!localParticipant) {
        return;
      }

      const request:
        SharedResyncRequest = {
          id: createId(),
          participantId:
            localParticipant.id,
          requestedAt:
            Date.now(),
        };

      resyncInProgressRef.current =
        true;

      send(
        createTransportMessage({
          type:
            "session-resync-requested",
          sessionId:
            session.id,
          senderId:
            localParticipant.id,
          request,
        }),
      );
    }, [
      session.id,
      localParticipant,
      send,
    ]);

  useEffect(() => {
    const handlePointerDown = (
      event: PointerEvent,
    ) => {
      const target =
        event.target;

      if (
        !(target instanceof Element)
      ) {
        return;
      }

      const element =
        target.closest<HTMLElement>(
          "[data-playground-object-id]",
        );

      const objectId =
        element?.dataset
          .playgroundObjectId;

      if (!objectId) {
        return;
      }

      beforeSnapshotsRef.current.set(
        objectId,
        captureSharedObjectSnapshot(
          objectId,
        ),
      );
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true,
      );
    };
  }, []);

  useEffect(() => {
    const handleMutationApplied = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          SharedMutationDispatchDetail
        >;

      const detail =
        customEvent.detail;

      if (
        !detail ||
        !detail.mutation ||
        detail.remote
      ) {
        return;
      }

      const mutation =
        detail.mutation;

      const before =
        beforeSnapshotsRef.current.get(
          mutation.objectId,
        ) ?? {
          objectId:
            mutation.objectId,
          exists:
            mutation.kind ===
              "object-deleted",
        };

      const after =
        captureSharedObjectSnapshot(
          mutation.objectId,
        );

      const entry:
        SharedHistoryEntry = {
          id: createId(),
          participantId:
            mutation.participantId,
          participantName:
            mutation.participantName,
          mutation,
          before,
          after,
          createdAt:
            Date.now(),
        };

      pushHistoryEntry(
        entry,
      );

      beforeSnapshotsRef.current.delete(
        mutation.objectId,
      );
    };

    document.addEventListener(
      SHARED_WORLD_MUTATION_APPLIED_EVENT,
      handleMutationApplied,
    );

    return () => {
      document.removeEventListener(
        SHARED_WORLD_MUTATION_APPLIED_EVENT,
        handleMutationApplied,
      );
    };
  }, [pushHistoryEntry]);

  useEffect(() => {
    const handleRejectedMutation = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          input?:
            SharedMutationInput;
          reason?: string;
        }>;

      const input =
        customEvent.detail
          ?.input;

      if (!input) {
        return;
      }

      const snapshot =
        beforeSnapshotsRef.current.get(
          input.objectId,
        );

      if (snapshot) {
        restoreSharedObjectSnapshot(
          snapshot,
        );
      }

      document.dispatchEvent(
        new CustomEvent(
          "playground:mutation-recovered",
          {
            detail: {
              input,
              reason:
                customEvent.detail
                  ?.reason ??
                "Mutation rejected.",
            },
          },
        ),
      );
    };

    document.addEventListener(
      SHARED_WORLD_MUTATION_REJECTED_EVENT,
      handleRejectedMutation,
    );

    return () => {
      document.removeEventListener(
        SHARED_WORLD_MUTATION_REJECTED_EVENT,
        handleRejectedMutation,
      );
    };
  }, []);

  useEffect(() => {
    const handleKeyboard = (
      event: KeyboardEvent,
    ) => {
      const target =
        event.target;

      if (
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement ||
        (
          target instanceof
            HTMLElement &&
          target.isContentEditable
        )
      ) {
        return;
      }

      const command =
        event.metaKey ||
        event.ctrlKey;

      if (!command) {
        return;
      }

      const key =
        event.key.toLowerCase();

      if (
        key === "z" &&
        event.shiftKey
      ) {
        event.preventDefault();
        performRedo();
        return;
      }

      if (key === "z") {
        event.preventDefault();
        performUndo();
        return;
      }

      if (
        key === "y" &&
        event.ctrlKey
      ) {
        event.preventDefault();
        performRedo();
      }
    };

    const handleUndoEvent = () => {
      performUndo();
    };

    const handleRedoEvent = () => {
      performRedo();
    };

    const handleResyncEvent = () => {
      requestResync();
    };

    window.addEventListener(
      "keydown",
      handleKeyboard,
    );

    document.addEventListener(
      "playground:undo",
      handleUndoEvent,
    );

    document.addEventListener(
      "playground:redo",
      handleRedoEvent,
    );

    document.addEventListener(
      "playground:request-resync",
      handleResyncEvent,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard,
      );

      document.removeEventListener(
        "playground:undo",
        handleUndoEvent,
      );

      document.removeEventListener(
        "playground:redo",
        handleRedoEvent,
      );

      document.removeEventListener(
        "playground:request-resync",
        handleResyncEvent,
      );
    };
  }, [
    performUndo,
    performRedo,
    requestResync,
  ]);

  useEffect(() => {
    return collaborationTransport.subscribe(
      (message) => {
        if (!localParticipant) {
          return;
        }

        switch (message.type) {
          case "session-resync-requested": {
            if (
              message.request
                .participantId ===
              localParticipant.id
            ) {
              return;
            }

            const snapshot:
              SharedResyncSnapshot = {
                id: createId(),
                sourceParticipantId:
                  localParticipant.id,
                createdAt:
                  Date.now(),
                objects:
                  captureAllSharedObjectSnapshots(),
              };

            send(
              createTransportMessage({
                type:
                  "session-resync-snapshot",
                sessionId:
                  session.id,
                senderId:
                  localParticipant.id,
                snapshot,
              }),
            );

            break;
          }

          case "session-resync-snapshot": {
            if (
              !resyncInProgressRef.current
            ) {
              return;
            }

            restoreWorld(
              message.snapshot
                .objects,
            );

            clearMutationHistory();
            clearRecoveryHistory();

            resyncInProgressRef.current =
              false;

            document.dispatchEvent(
              new CustomEvent(
                "playground:session-resynced",
                {
                  detail: {
                    snapshot:
                      message.snapshot,
                  },
                },
              ),
            );

            break;
          }

          default:
            break;
        }
      },
    );
  }, [
    session.id,
    localParticipant,
    send,
    clearMutationHistory,
    clearRecoveryHistory,
  ]);

  return null;
}
EOF

# ------------------------------------------------------------
# Public recovery API
# ------------------------------------------------------------

cat > src/collaboration/recovery/events.ts <<'EOF'
export const SHARED_UNDO_EVENT =
  "playground:undo";

export const SHARED_REDO_EVENT =
  "playground:redo";

export const SHARED_RESYNC_EVENT =
  "playground:request-resync";

export function dispatchSharedUndo() {
  document.dispatchEvent(
    new CustomEvent(
      SHARED_UNDO_EVENT,
    ),
  );
}

export function dispatchSharedRedo() {
  document.dispatchEvent(
    new CustomEvent(
      SHARED_REDO_EVENT,
    ),
  );
}

export function dispatchSharedResync() {
  document.dispatchEvent(
    new CustomEvent(
      SHARED_RESYNC_EVENT,
    ),
  );
}
EOF

cat > src/collaboration/recovery/index.ts <<'EOF'
export {
  dispatchSharedRedo,
  dispatchSharedResync,
  dispatchSharedUndo,
  SHARED_REDO_EVENT,
  SHARED_RESYNC_EVENT,
  SHARED_UNDO_EVENT,
} from "./events";

export {
  SharedRecoveryProvider,
  useSharedRecovery,
} from "./SharedRecoveryContext";

export {
  captureAllSharedObjectSnapshots,
  captureSharedObjectSnapshot,
  findSharedObjectElement,
  restoreSharedObjectSnapshot,
} from "./snapshot";

export type {
  SharedHistoryEntry,
  SharedObjectSnapshot,
  SharedRecoveryAction,
  SharedRedoRequest,
  SharedResyncRequest,
  SharedResyncSnapshot,
  SharedUndoRequest,
} from "./types";
EOF

# ------------------------------------------------------------
# Update transport context
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/collaboration/transport/CollaborationTransportContext.tsx"
)

text = path.read_text()

old = '''          case "world-mutation": {
            break;
          }
'''

new = '''          case "world-mutation":
          case "session-resync-requested":
          case "session-resync-snapshot": {
            break;
          }
'''

if old in text:
    text = text.replace(
        old,
        new,
        1,
    )
elif 'case "session-resync-requested"' not in text:
    raise SystemExit(
        "❌ Could not add recovery messages to CollaborationTransportContext.tsx."
    )

path.write_text(text)

print("✅ Transport context updated.")
PY

# ------------------------------------------------------------
# Mount recovery provider and bridge
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
        keepends=True
    )

    last_import_end = -1
    in_import = False

    for index, line in enumerate(lines):
        stripped = line.strip()

        if not in_import:
            if stripped.startswith("import "):
                in_import = True
                last_import_end = index

                if stripped.endswith(";"):
                    in_import = False

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
            in_import = False

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
        'import { SharedRecoveryProvider } '
        'from "./collaboration/recovery/SharedRecoveryContext";\n'
    ),
    'from "./collaboration/recovery/SharedRecoveryContext"',
)

text = insert_import(
    text,
    (
        'import SharedRecoveryBridge '
        'from "./collaboration/recovery/SharedRecoveryBridge";\n'
    ),
    'from "./collaboration/recovery/SharedRecoveryBridge"',
)

if "<SharedRecoveryProvider>" not in text:
    open_tag = "<SharedMutationProvider>"

    close_tag = "</SharedMutationProvider>"

    open_index = text.find(open_tag)

    close_index = text.rfind(close_tag)

    if (
        open_index == -1
        or close_index == -1
        or close_index <= open_index
    ):
        raise SystemExit(
            "❌ SharedMutationProvider wrapper was not found in src/main.tsx."
        )

    inner_start = open_index + len(open_tag)

    inner = text[
        inner_start:close_index
    ].strip()

    wrapped = (
        "\n              "
        "<SharedRecoveryProvider>\n"
        + "\n".join(
            "                " + line
            if line.strip()
            else line
            for line in inner.splitlines()
        )
        + "\n              "
        "</SharedRecoveryProvider>\n            "
    )

    text = (
        text[:inner_start]
        + wrapped
        + text[close_index:]
    )

if "<SharedRecoveryBridge />" not in text:
    adapter_anchor = "<EditorMutationAdapter />"

    bridge_anchor = "<SharedMutationBridge />"

    if adapter_anchor in text:
        text = text.replace(
            adapter_anchor,
            (
                "<EditorMutationAdapter />\n"
                "                "
                "<SharedRecoveryBridge />"
            ),
            1,
        )
    elif bridge_anchor in text:
        text = text.replace(
            bridge_anchor,
            (
                "<SharedMutationBridge />\n"
                "                "
                "<SharedRecoveryBridge />"
            ),
            1,
        )
    else:
        app_anchor = "<App />"

        if app_anchor not in text:
            raise SystemExit(
                "❌ No valid bridge mounting anchor was found in src/main.tsx."
            )

        text = text.replace(
            app_anchor,
            (
                "<SharedRecoveryBridge />\n"
                "                "
                "<App />"
            ),
            1,
        )

path.write_text(text)

print("✅ SharedRecoveryProvider mounted.")
print("✅ SharedRecoveryBridge mounted.")
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
echo "Keyboard shortcuts:"
echo "  Command/Ctrl + Z         Undo"
echo "  Command/Ctrl + Shift + Z Redo"
echo "  Ctrl + Y                 Redo"
echo ""
echo "Toolbar events:"
echo "  playground:undo"
echo "  playground:redo"
echo "  playground:request-resync"
echo ""
echo "Recovery events:"
echo "  playground:undo-completed"
echo "  playground:redo-completed"
echo "  playground:mutation-recovered"
echo "  playground:session-resynced"
