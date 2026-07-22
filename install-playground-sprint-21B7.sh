#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.7"
MARKER=".playground-sprint-21B7-installed"
BACKUP_DIR=".playground-backups/sprint-21B7-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the Playground project root."
[[ -d src ]] || fail "The src directory was not found."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."
[[ -f src/collaboration/transport/types.ts ]] || fail "Sprint 21B.6 is required."
[[ -f src/collaboration/transport/CollaborationTransportContext.tsx ]] || fail "Transport context was not found."
[[ -f src/collaboration/CollaborationSessionContext.tsx ]] || fail "Collaboration session context was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/selection
mkdir -p src/components/collaboration

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
    echo "⚠️ Installation failed. Restoring the previous project state..."

    for file in "${FILES_TO_BACK_UP[@]}"; do
      if [[ -f "$BACKUP_DIR/$file" ]]; then
        cp -p "$BACKUP_DIR/$file" "$file"
      fi
    done

    rm -rf src/collaboration/selection

    rm -f \
      src/components/collaboration/RemoteSelectionOverlay.tsx \
      src/components/collaboration/RemoteSelectionOverlay.css \
      "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Shared selection and lock types
# ------------------------------------------------------------

cat > src/collaboration/selection/types.ts <<'EOF'
export type SharedObjectSelection = {
  participantId: string;
  participantName: string;
  objectId: string;
  selectedAt: number;
};

export type SharedObjectLock = {
  objectId: string;
  ownerId: string;
  ownerName: string;
  acquiredAt: number;
  expiresAt: number;
};

export type SharedLockTakeoverRequest = {
  id: string;
  objectId: string;
  requesterId: string;
  requesterName: string;
  currentOwnerId: string;
  requestedAt: number;
};
EOF

# ------------------------------------------------------------
# Shared selection context
# ------------------------------------------------------------

cat > src/collaboration/selection/SharedSelectionContext.tsx <<'EOF'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  SharedLockTakeoverRequest,
  SharedObjectLock,
  SharedObjectSelection,
} from "./types";

type SharedSelectionContextValue = {
  selections: SharedObjectSelection[];
  locks: SharedObjectLock[];
  takeoverRequests:
    SharedLockTakeoverRequest[];

  upsertSelection: (
    selection: SharedObjectSelection,
  ) => void;

  removeSelection: (
    participantId: string,
  ) => void;

  upsertLock: (
    lock: SharedObjectLock,
  ) => void;

  removeLock: (
    objectId: string,
  ) => void;

  addTakeoverRequest: (
    request: SharedLockTakeoverRequest,
  ) => void;

  removeTakeoverRequest: (
    requestId: string,
  ) => void;

  getLock: (
    objectId: string,
  ) => SharedObjectLock | undefined;

  isLockedByOther: (
    objectId: string,
    participantId: string,
  ) => boolean;
};

const SharedSelectionContext =
  createContext<
    SharedSelectionContextValue | null
  >(null);

type SharedSelectionProviderProps = {
  children: ReactNode;
};

export function SharedSelectionProvider({
  children,
}: SharedSelectionProviderProps) {
  const [
    selections,
    setSelections,
  ] = useState<
    SharedObjectSelection[]
  >([]);

  const [
    locks,
    setLocks,
  ] = useState<
    SharedObjectLock[]
  >([]);

  const [
    takeoverRequests,
    setTakeoverRequests,
  ] = useState<
    SharedLockTakeoverRequest[]
  >([]);

  const upsertSelection =
    useCallback(
      (
        incoming:
          SharedObjectSelection,
      ) => {
        setSelections((current) => {
          const exists =
            current.some(
              (selection) =>
                selection.participantId ===
                incoming.participantId,
            );

          if (!exists) {
            return [
              ...current,
              incoming,
            ];
          }

          return current.map(
            (selection) =>
              selection.participantId ===
                incoming.participantId
                ? incoming
                : selection,
          );
        });
      },
      [],
    );

  const removeSelection =
    useCallback(
      (participantId: string) => {
        setSelections((current) =>
          current.filter(
            (selection) =>
              selection.participantId !==
              participantId,
          ),
        );
      },
      [],
    );

  const upsertLock =
    useCallback(
      (incoming: SharedObjectLock) => {
        setLocks((current) => {
          const exists =
            current.some(
              (lock) =>
                lock.objectId ===
                incoming.objectId,
            );

          if (!exists) {
            return [
              ...current,
              incoming,
            ];
          }

          return current.map(
            (lock) =>
              lock.objectId ===
                incoming.objectId
                ? incoming
                : lock,
          );
        });
      },
      [],
    );

  const removeLock =
    useCallback(
      (objectId: string) => {
        setLocks((current) =>
          current.filter(
            (lock) =>
              lock.objectId !==
              objectId,
          ),
        );
      },
      [],
    );

  const addTakeoverRequest =
    useCallback(
      (
        incoming:
          SharedLockTakeoverRequest,
      ) => {
        setTakeoverRequests(
          (current) => {
            const exists =
              current.some(
                (request) =>
                  request.id ===
                  incoming.id,
              );

            if (exists) {
              return current;
            }

            return [
              ...current,
              incoming,
            ];
          },
        );
      },
      [],
    );

  const removeTakeoverRequest =
    useCallback(
      (requestId: string) => {
        setTakeoverRequests(
          (current) =>
            current.filter(
              (request) =>
                request.id !==
                requestId,
            ),
        );
      },
      [],
    );

  const getLock = useCallback(
    (objectId: string) =>
      locks.find(
        (lock) =>
          lock.objectId === objectId,
      ),
    [locks],
  );

  const isLockedByOther =
    useCallback(
      (
        objectId: string,
        participantId: string,
      ) => {
        const lock = locks.find(
          (item) =>
            item.objectId === objectId,
        );

        if (!lock) {
          return false;
        }

        return (
          lock.ownerId !== participantId &&
          lock.expiresAt > Date.now()
        );
      },
      [locks],
    );

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        const now = Date.now();

        setLocks((current) =>
          current.filter(
            (lock) =>
              lock.expiresAt > now,
          ),
        );
      }, 2_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const value = useMemo(
    () => ({
      selections,
      locks,
      takeoverRequests,
      upsertSelection,
      removeSelection,
      upsertLock,
      removeLock,
      addTakeoverRequest,
      removeTakeoverRequest,
      getLock,
      isLockedByOther,
    }),
    [
      selections,
      locks,
      takeoverRequests,
      upsertSelection,
      removeSelection,
      upsertLock,
      removeLock,
      addTakeoverRequest,
      removeTakeoverRequest,
      getLock,
      isLockedByOther,
    ],
  );

  return (
    <SharedSelectionContext.Provider
      value={value}
    >
      {children}
    </SharedSelectionContext.Provider>
  );
}

export function useSharedSelection() {
  const context = useContext(
    SharedSelectionContext,
  );

  if (!context) {
    throw new Error(
      "useSharedSelection must be used inside SharedSelectionProvider.",
    );
  }

  return context;
}
EOF

# ------------------------------------------------------------
# Extend transport messages
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/collaboration/transport/types.ts"
)

text = path.read_text()

selection_import = '''import type {
  SharedLockTakeoverRequest,
  SharedObjectLock,
  SharedObjectSelection,
} from "../selection/types";

'''

if 'from "../selection/types"' not in text:
    imports_end = 0

    lines = text.splitlines(
        keepends=True
    )

    in_import = False

    for index, line in enumerate(lines):
        stripped = line.strip()

        if stripped.startswith("import "):
            in_import = True

        if in_import:
            imports_end = index + 1

            if stripped.endswith(";"):
                in_import = False
                continue

        elif stripped:
            break

    lines.insert(
        imports_end,
        "\n" + selection_import,
    )

    text = "".join(lines)

anchor = '''  | {
      id: string;
      type: "cursor-left";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participantId: string;
    };
'''

replacement = '''  | {
      id: string;
      type: "cursor-left";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participantId: string;
    }
  | {
      id: string;
      type: "selection-updated";
      sessionId: string;
      senderId: string;
      sentAt: number;
      selection: SharedObjectSelection;
    }
  | {
      id: string;
      type: "selection-cleared";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participantId: string;
    }
  | {
      id: string;
      type: "lock-acquired";
      sessionId: string;
      senderId: string;
      sentAt: number;
      lock: SharedObjectLock;
    }
  | {
      id: string;
      type: "lock-released";
      sessionId: string;
      senderId: string;
      sentAt: number;
      objectId: string;
    }
  | {
      id: string;
      type: "lock-takeover-requested";
      sessionId: string;
      senderId: string;
      sentAt: number;
      request: SharedLockTakeoverRequest;
    };
'''

if '"selection-updated"' not in text:
    if anchor not in text:
        raise SystemExit(
            "❌ Cursor transport message anchor was not found."
        )

    text = text.replace(
        anchor,
        replacement,
        1,
    )

path.write_text(text)

print("✅ Shared-selection transport messages added.")
PY

# ------------------------------------------------------------
# Shared selection controller hook
# ------------------------------------------------------------

cat > src/collaboration/selection/useSharedSelectionController.ts <<'EOF'
import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import {
  useCollaborationTransport,
} from "../transport/CollaborationTransportContext";

import {
  createTransportMessage,
} from "../transport/messageFactory";

import {
  useSharedSelection,
} from "./SharedSelectionContext";

import type {
  SharedLockTakeoverRequest,
  SharedObjectLock,
  SharedObjectSelection,
} from "./types";

const DEFAULT_LOCK_DURATION_MS =
  30_000;

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

export function useSharedSelectionController() {
  const {
    session,
  } = useCollaborationSession();

  const {
    send,
  } = useCollaborationTransport();

  const {
    selections,
    locks,
    takeoverRequests,
    upsertSelection,
    removeSelection,
    upsertLock,
    removeLock,
    addTakeoverRequest,
    removeTakeoverRequest,
    getLock,
    isLockedByOther,
  } = useSharedSelection();

  const localSelectionRef =
    useRef<string | null>(null);

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  const releaseLock = useCallback(
    (objectId: string) => {
      if (!localParticipant) {
        return;
      }

      const lock =
        getLock(objectId);

      if (
        lock &&
        lock.ownerId !==
          localParticipant.id
      ) {
        return;
      }

      removeLock(objectId);

      send(
        createTransportMessage({
          type: "lock-released",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          objectId,
        }),
      );
    },
    [
      session.id,
      localParticipant,
      getLock,
      removeLock,
      send,
    ],
  );

  const acquireLock = useCallback(
    (
      objectId: string,
      durationMs =
        DEFAULT_LOCK_DURATION_MS,
    ): boolean => {
      if (!localParticipant) {
        return false;
      }

      if (
        isLockedByOther(
          objectId,
          localParticipant.id,
        )
      ) {
        return false;
      }

      const now = Date.now();

      const lock:
        SharedObjectLock = {
          objectId,
          ownerId:
            localParticipant.id,
          ownerName:
            localParticipant.name,
          acquiredAt: now,
          expiresAt:
            now + durationMs,
        };

      upsertLock(lock);

      send(
        createTransportMessage({
          type: "lock-acquired",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          lock,
        }),
      );

      return true;
    },
    [
      session.id,
      localParticipant,
      isLockedByOther,
      upsertLock,
      send,
    ],
  );

  const selectObject = useCallback(
    (
      objectId: string,
      acquireEditingLock = true,
    ): boolean => {
      if (!localParticipant) {
        return false;
      }

      if (
        acquireEditingLock &&
        !acquireLock(objectId)
      ) {
        return false;
      }

      const previousObjectId =
        localSelectionRef.current;

      if (
        previousObjectId &&
        previousObjectId !== objectId
      ) {
        releaseLock(
          previousObjectId,
        );
      }

      localSelectionRef.current =
        objectId;

      const selection:
        SharedObjectSelection = {
          participantId:
            localParticipant.id,
          participantName:
            localParticipant.name,
          objectId,
          selectedAt: Date.now(),
        };

      upsertSelection(selection);

      send(
        createTransportMessage({
          type: "selection-updated",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          selection,
        }),
      );

      return true;
    },
    [
      session.id,
      localParticipant,
      acquireLock,
      releaseLock,
      upsertSelection,
      send,
    ],
  );

  const clearSelection =
    useCallback(() => {
      if (!localParticipant) {
        return;
      }

      const objectId =
        localSelectionRef.current;

      if (objectId) {
        releaseLock(objectId);
      }

      localSelectionRef.current =
        null;

      removeSelection(
        localParticipant.id,
      );

      send(
        createTransportMessage({
          type: "selection-cleared",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          participantId:
            localParticipant.id,
        }),
      );
    }, [
      session.id,
      localParticipant,
      releaseLock,
      removeSelection,
      send,
    ]);

  const requestTakeover =
    useCallback(
      (objectId: string) => {
        if (!localParticipant) {
          return;
        }

        const lock =
          getLock(objectId);

        if (
          !lock ||
          lock.ownerId ===
            localParticipant.id
        ) {
          return;
        }

        const request:
          SharedLockTakeoverRequest = {
            id: createId(),
            objectId,
            requesterId:
              localParticipant.id,
            requesterName:
              localParticipant.name,
            currentOwnerId:
              lock.ownerId,
            requestedAt:
              Date.now(),
          };

        addTakeoverRequest(
          request,
        );

        send(
          createTransportMessage({
            type:
              "lock-takeover-requested",
            sessionId:
              session.id,
            senderId:
              localParticipant.id,
            request,
          }),
        );
      },
      [
        session.id,
        localParticipant,
        getLock,
        addTakeoverRequest,
        send,
      ],
    );

  const approveTakeover =
    useCallback(
      (requestId: string) => {
        const request =
          takeoverRequests.find(
            (item) =>
              item.id === requestId,
          );

        if (!request) {
          return;
        }

        releaseLock(
          request.objectId,
        );

        removeTakeoverRequest(
          requestId,
        );
      },
      [
        takeoverRequests,
        releaseLock,
        removeTakeoverRequest,
      ],
    );

  useEffect(() => {
    return () => {
      const objectId =
        localSelectionRef.current;

      if (objectId) {
        releaseLock(objectId);
      }
    };
  }, [releaseLock]);

  return {
    selections,
    locks,
    takeoverRequests,
    selectObject,
    clearSelection,
    acquireLock,
    releaseLock,
    requestTakeover,
    approveTakeover,
    removeTakeoverRequest,
    getLock,
    isLockedByOther,
  };
}
EOF

# ------------------------------------------------------------
# Shared selection bridge
# ------------------------------------------------------------

cat > src/collaboration/selection/SharedSelectionBridge.tsx <<'EOF'
import {
  useEffect,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import {
  collaborationTransport,
} from "../transport";

import {
  useSharedSelection,
} from "./SharedSelectionContext";

import {
  useSharedSelectionController,
} from "./useSharedSelectionController";

export default function SharedSelectionBridge() {
  const {
    session,
  } = useCollaborationSession();

  const {
    upsertSelection,
    removeSelection,
    upsertLock,
    removeLock,
    addTakeoverRequest,
  } = useSharedSelection();

  const {
    selectObject,
    clearSelection,
    isLockedByOther,
    requestTakeover,
  } = useSharedSelectionController();

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  useEffect(() => {
    return collaborationTransport.subscribe(
      (message) => {
        switch (message.type) {
          case "selection-updated": {
            upsertSelection(
              message.selection,
            );

            break;
          }

          case "selection-cleared": {
            removeSelection(
              message.participantId,
            );

            break;
          }

          case "lock-acquired": {
            upsertLock(
              message.lock,
            );

            break;
          }

          case "lock-released": {
            removeLock(
              message.objectId,
            );

            break;
          }

          case "lock-takeover-requested": {
            addTakeoverRequest(
              message.request,
            );

            break;
          }

          case "session-leave": {
            removeSelection(
              message.participantId,
            );

            break;
          }

          default:
            break;
        }
      },
    );
  }, [
    upsertSelection,
    removeSelection,
    upsertLock,
    removeLock,
    addTakeoverRequest,
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

      const objectElement =
        target.closest<HTMLElement>(
          "[data-playground-object-id]",
        );

      if (!objectElement) {
        clearSelection();
        return;
      }

      const objectId =
        objectElement.dataset
          .playgroundObjectId;

      if (
        !objectId ||
        !localParticipant
      ) {
        return;
      }

      if (
        isLockedByOther(
          objectId,
          localParticipant.id,
        )
      ) {
        event.preventDefault();
        event.stopPropagation();

        objectElement.dispatchEvent(
          new CustomEvent(
            "playground:object-locked",
            {
              bubbles: true,
              detail: {
                objectId,
              },
            },
          ),
        );

        return;
      }

      selectObject(
        objectId,
        true,
      );
    };

    const handleTakeoverRequest = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          objectId?: string;
        }>;

      const objectId =
        customEvent.detail?.objectId;

      if (objectId) {
        requestTakeover(
          objectId,
        );
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true,
    );

    document.addEventListener(
      "playground:request-lock-takeover",
      handleTakeoverRequest,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true,
      );

      document.removeEventListener(
        "playground:request-lock-takeover",
        handleTakeoverRequest,
      );
    };
  }, [
    localParticipant,
    selectObject,
    clearSelection,
    isLockedByOther,
    requestTakeover,
  ]);

  return null;
}
EOF

# ------------------------------------------------------------
# Remote selection overlay
# ------------------------------------------------------------

cat > src/components/collaboration/RemoteSelectionOverlay.tsx <<'EOF'
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useCollaborationSession,
} from "../../collaboration/CollaborationSessionContext";

import {
  useSharedSelection,
} from "../../collaboration/selection/SharedSelectionContext";

import type {
  SharedObjectLock,
  SharedObjectSelection,
} from "../../collaboration/selection/types";

import "./RemoteSelectionOverlay.css";

type SelectionRect = {
  selection:
    SharedObjectSelection;

  lock:
    SharedObjectLock | undefined;

  top: number;
  left: number;
  width: number;
  height: number;
};

function findObjectElement(
  objectId: string,
): HTMLElement | null {
  const elements =
    document.querySelectorAll<HTMLElement>(
      "[data-playground-object-id]",
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

export default function RemoteSelectionOverlay() {
  const {
    session,
  } = useCollaborationSession();

  const {
    selections,
    locks,
  } = useSharedSelection();

  const [
    layoutVersion,
    setLayoutVersion,
  ] = useState(0);

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  useEffect(() => {
    let frameId = 0;

    const update = () => {
      setLayoutVersion(
        (current) =>
          current + 1,
      );

      frameId =
        window.requestAnimationFrame(
          update,
        );
    };

    frameId =
      window.requestAnimationFrame(
        update,
      );

    return () => {
      window.cancelAnimationFrame(
        frameId,
      );
    };
  }, []);

  const rects = useMemo(
    () => {
      void layoutVersion;

      return selections
        .filter(
          (selection) =>
            selection.participantId !==
            localParticipant?.id,
        )
        .map((selection) => {
          const element =
            findObjectElement(
              selection.objectId,
            );

          if (!element) {
            return null;
          }

          const rect =
            element.getBoundingClientRect();

          return {
            selection,
            lock: locks.find(
              (lock) =>
                lock.objectId ===
                selection.objectId,
            ),
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
        })
        .filter(
          (
            item,
          ): item is SelectionRect =>
            item !== null,
        );
    },
    [
      selections,
      locks,
      localParticipant?.id,
      layoutVersion,
    ],
  );

  return (
    <div
      className="remote-selection-overlay"
      aria-hidden="true"
    >
      {rects.map((item) => (
        <div
          key={
            item.selection
              .participantId
          }
          className="remote-selection-outline"
          data-locked={
            Boolean(item.lock)
          }
          style={{
            top: item.top,
            left: item.left,
            width: item.width,
            height: item.height,
          }}
        >
          <span className="remote-selection-outline__label">
            {
              item.selection
                .participantName
            }

            {item.lock && (
              <small>
                Editing
              </small>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
EOF

cat > src/components/collaboration/RemoteSelectionOverlay.css <<'EOF'
.remote-selection-overlay {
  position: fixed;
  z-index: 9998;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.remote-selection-outline {
  position: fixed;
  border:
    2px solid
    rgba(255, 255, 255, 0.82);
  border-radius: 6px;
  box-shadow:
    0 0 0 1px
    rgba(0, 0, 0, 0.38);
  pointer-events: none;
}

.remote-selection-outline[data-locked="true"] {
  border-style: solid;
  box-shadow:
    0 0 0 1px
    rgba(0, 0, 0, 0.38),
    0 0 16px
    rgba(255, 255, 255, 0.12);
}

.remote-selection-outline__label {
  position: absolute;
  top: -27px;
  left: -2px;
  display: inline-flex;
  min-height: 23px;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border-radius: 7px 7px 7px 0;
  background:
    rgba(18, 18, 20, 0.94);
  color: #ffffff;
  font-size: 9px;
  font-weight: 650;
  white-space: nowrap;
  backdrop-filter: blur(12px);
}

.remote-selection-outline__label small {
  color:
    rgba(255, 255, 255, 0.48);
  font-size: 8px;
  font-weight: 500;
}
EOF

# ------------------------------------------------------------
# Add new transport cases to the main transport context
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/collaboration/transport/CollaborationTransportContext.tsx"
)

text = path.read_text()

old = '''          case "invitation-created":
          case "cursor-updated":
          case "cursor-left": {
            break;
          }
'''

new = '''          case "invitation-created":
          case "cursor-updated":
          case "cursor-left":
          case "selection-updated":
          case "selection-cleared":
          case "lock-acquired":
          case "lock-released":
          case "lock-takeover-requested": {
            break;
          }
'''

if old in text:
    text = text.replace(
        old,
        new,
        1,
    )
elif (
    'case "selection-updated"' not in text
    or 'case "lock-acquired"' not in text
):
    raise SystemExit(
        "❌ Could not add shared-selection cases to CollaborationTransportContext.tsx."
    )

path.write_text(text)

print("✅ Main transport context updated.")
PY

# ------------------------------------------------------------
# Safely patch main.tsx
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

    for index, line in enumerate(
        lines
    ):
        stripped = line.strip()

        if not in_import:
            if stripped.startswith(
                "import "
            ):
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
        'import { SharedSelectionProvider } '
        'from "./collaboration/selection/SharedSelectionContext";\n'
    ),
    'from "./collaboration/selection/SharedSelectionContext"',
)

text = insert_import(
    text,
    (
        'import SharedSelectionBridge '
        'from "./collaboration/selection/SharedSelectionBridge";\n'
    ),
    'from "./collaboration/selection/SharedSelectionBridge"',
)

text = insert_import(
    text,
    (
        'import RemoteSelectionOverlay '
        'from "./components/collaboration/RemoteSelectionOverlay";\n'
    ),
    'from "./components/collaboration/RemoteSelectionOverlay"',
)

if "<SharedSelectionProvider>" not in text:
    open_tag = (
        "<SharedCursorProvider>"
    )

    close_tag = (
        "</SharedCursorProvider>"
    )

    open_index = text.find(open_tag)
    close_index = text.rfind(
        close_tag
    )

    if (
        open_index == -1
        or close_index == -1
        or close_index <= open_index
    ):
        raise SystemExit(
            "❌ SharedCursorProvider wrapper was not found in src/main.tsx."
        )

    inner_start = (
        open_index + len(open_tag)
    )

    inner = text[
        inner_start:close_index
    ].strip()

    wrapped = (
        "\n          "
        "<SharedSelectionProvider>\n"
        + "\n".join(
            "            " + line
            if line.strip()
            else line
            for line in inner.splitlines()
        )
        + "\n          "
        "</SharedSelectionProvider>\n        "
    )

    text = (
        text[:inner_start]
        + wrapped
        + text[close_index:]
    )

if "<SharedSelectionBridge />" not in text:
    app_anchor = "<App />"

    if app_anchor not in text:
        raise SystemExit(
            "❌ <App /> was not found in src/main.tsx."
        )

    text = text.replace(
        app_anchor,
        (
            "<SharedSelectionBridge />\n"
            "            "
            "<RemoteSelectionOverlay />\n"
            "            "
            "<App />"
        ),
        1,
    )

path.write_text(text)

print("✅ SharedSelectionProvider mounted.")
print("✅ SharedSelectionBridge mounted.")
print("✅ RemoteSelectionOverlay mounted.")
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
echo "Object integration:"
echo '  Add data-playground-object-id="OBJECT_ID" to editable object elements.'
echo ""
echo "Example:"
echo '  <div data-playground-object-id={object.id}>...</div>'
echo ""
echo "Test:"
echo "  1. Run npm run dev"
echo "  2. Open the same session in two tabs"
echo "  3. Click an element with data-playground-object-id"
echo "  4. Confirm the remote selection outline appears"
echo "  5. Try selecting the same object in the other tab"
echo "  6. Confirm the existing lock blocks the second selection"
