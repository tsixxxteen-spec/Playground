#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.8"
MARKER=".playground-sprint-21B8-installed"
BACKUP_DIR=".playground-backups/sprint-21B8-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the Playground project root."
[[ -d src ]] || fail "The src directory was not found."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."
[[ -f src/collaboration/transport/types.ts ]] || fail "Sprint 21B.7 is required."
[[ -f src/collaboration/transport/CollaborationTransportContext.tsx ]] || fail "Collaboration transport context was not found."
[[ -f src/collaboration/CollaborationSessionContext.tsx ]] || fail "Collaboration session context was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/mutations

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

    rm -rf src/collaboration/mutations
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Shared mutation types
# ------------------------------------------------------------

cat > src/collaboration/mutations/types.ts <<'EOF'
export type SharedMutationKind =
  | "object-moved"
  | "object-resized"
  | "object-properties-updated"
  | "object-deleted";

export type SharedObjectPosition = {
  x: number;
  y: number;
  z?: number;
};

export type SharedObjectSize = {
  width: number;
  height: number;
  depth?: number;
};

type SharedMutationBase = {
  id: string;
  objectId: string;
  participantId: string;
  participantName: string;
  revision: number;
  createdAt: number;
};

export type SharedObjectMovedMutation =
  SharedMutationBase & {
    kind: "object-moved";
    position: SharedObjectPosition;
  };

export type SharedObjectResizedMutation =
  SharedMutationBase & {
    kind: "object-resized";
    size: SharedObjectSize;
  };

export type SharedObjectPropertiesUpdatedMutation =
  SharedMutationBase & {
    kind: "object-properties-updated";
    properties: Record<string, unknown>;
  };

export type SharedObjectDeletedMutation =
  SharedMutationBase & {
    kind: "object-deleted";
  };

export type SharedWorldMutation =
  | SharedObjectMovedMutation
  | SharedObjectResizedMutation
  | SharedObjectPropertiesUpdatedMutation
  | SharedObjectDeletedMutation;

export type SharedMutationInput =
  | {
      kind: "object-moved";
      objectId: string;
      position: SharedObjectPosition;
    }
  | {
      kind: "object-resized";
      objectId: string;
      size: SharedObjectSize;
    }
  | {
      kind: "object-properties-updated";
      objectId: string;
      properties: Record<string, unknown>;
    }
  | {
      kind: "object-deleted";
      objectId: string;
    };

export type SharedMutationDispatchDetail = {
  mutation: SharedWorldMutation;
  remote: boolean;
};
EOF

# ------------------------------------------------------------
# Mutation helpers
# ------------------------------------------------------------

cat > src/collaboration/mutations/mutationFactory.ts <<'EOF'
import type {
  SharedMutationInput,
  SharedWorldMutation,
} from "./types";

type MutationIdentity = {
  participantId: string;
  participantName: string;
  revision: number;
};

function createMutationId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

export function createSharedMutation(
  input: SharedMutationInput,
  identity: MutationIdentity,
): SharedWorldMutation {
  const base = {
    id: createMutationId(),
    objectId: input.objectId,
    participantId: identity.participantId,
    participantName: identity.participantName,
    revision: identity.revision,
    createdAt: Date.now(),
  };

  switch (input.kind) {
    case "object-moved":
      return {
        ...base,
        kind: input.kind,
        position: input.position,
      };

    case "object-resized":
      return {
        ...base,
        kind: input.kind,
        size: input.size,
      };

    case "object-properties-updated":
      return {
        ...base,
        kind: input.kind,
        properties: input.properties,
      };

    case "object-deleted":
      return {
        ...base,
        kind: input.kind,
      };

    default: {
      const exhaustiveCheck: never = input;
      return exhaustiveCheck;
    }
  }
}
EOF

# ------------------------------------------------------------
# Mutation context
# ------------------------------------------------------------

cat > src/collaboration/mutations/SharedMutationContext.tsx <<'EOF'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  SharedWorldMutation,
} from "./types";

const MAX_HISTORY_LENGTH = 300;
const MAX_PROCESSED_IDS = 1_000;

type SharedMutationContextValue = {
  mutations: SharedWorldMutation[];

  applyMutation: (
    mutation: SharedWorldMutation,
  ) => boolean;

  getObjectRevision: (
    objectId: string,
  ) => number;

  getNextObjectRevision: (
    objectId: string,
  ) => number;

  clearMutationHistory: () => void;
};

const SharedMutationContext =
  createContext<
    SharedMutationContextValue | null
  >(null);

type SharedMutationProviderProps = {
  children: ReactNode;
};

export function SharedMutationProvider({
  children,
}: SharedMutationProviderProps) {
  const [
    mutations,
    setMutations,
  ] = useState<
    SharedWorldMutation[]
  >([]);

  const revisionMapRef =
    useRef<Map<string, number>>(
      new Map(),
    );

  const processedIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const processedIdOrderRef =
    useRef<string[]>([]);

  const rememberMutationId =
    useCallback(
      (mutationId: string) => {
        processedIdsRef.current.add(
          mutationId,
        );

        processedIdOrderRef.current.push(
          mutationId,
        );

        while (
          processedIdOrderRef.current
            .length >
          MAX_PROCESSED_IDS
        ) {
          const oldestId =
            processedIdOrderRef.current.shift();

          if (oldestId) {
            processedIdsRef.current.delete(
              oldestId,
            );
          }
        }
      },
      [],
    );

  const applyMutation =
    useCallback(
      (
        mutation:
          SharedWorldMutation,
      ): boolean => {
        if (
          processedIdsRef.current.has(
            mutation.id,
          )
        ) {
          return false;
        }

        const currentRevision =
          revisionMapRef.current.get(
            mutation.objectId,
          ) ?? 0;

        if (
          mutation.revision <=
          currentRevision
        ) {
          rememberMutationId(
            mutation.id,
          );

          return false;
        }

        revisionMapRef.current.set(
          mutation.objectId,
          mutation.revision,
        );

        rememberMutationId(
          mutation.id,
        );

        setMutations((current) => {
          const next = [
            ...current,
            mutation,
          ];

          if (
            next.length <=
            MAX_HISTORY_LENGTH
          ) {
            return next;
          }

          return next.slice(
            next.length -
              MAX_HISTORY_LENGTH,
          );
        });

        return true;
      },
      [rememberMutationId],
    );

  const getObjectRevision =
    useCallback(
      (objectId: string) =>
        revisionMapRef.current.get(
          objectId,
        ) ?? 0,
      [],
    );

  const getNextObjectRevision =
    useCallback(
      (objectId: string) =>
        (
          revisionMapRef.current.get(
            objectId,
          ) ?? 0
        ) + 1,
      [],
    );

  const clearMutationHistory =
    useCallback(() => {
      setMutations([]);
      revisionMapRef.current.clear();
      processedIdsRef.current.clear();
      processedIdOrderRef.current = [];
    }, []);

  const value = useMemo(
    () => ({
      mutations,
      applyMutation,
      getObjectRevision,
      getNextObjectRevision,
      clearMutationHistory,
    }),
    [
      mutations,
      applyMutation,
      getObjectRevision,
      getNextObjectRevision,
      clearMutationHistory,
    ],
  );

  return (
    <SharedMutationContext.Provider
      value={value}
    >
      {children}
    </SharedMutationContext.Provider>
  );
}

export function useSharedMutations() {
  const context = useContext(
    SharedMutationContext,
  );

  if (!context) {
    throw new Error(
      "useSharedMutations must be used inside SharedMutationProvider.",
    );
  }

  return context;
}
EOF

# ------------------------------------------------------------
# Extend transport message union
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/collaboration/transport/types.ts"
)

text = path.read_text()

mutation_import = '''import type {
  SharedWorldMutation,
} from "../mutations/types";

'''

if 'from "../mutations/types"' not in text:
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
        "\n" + mutation_import,
    )

    text = "".join(lines)

anchor = '''  | {
      id: string;
      type: "lock-takeover-requested";
      sessionId: string;
      senderId: string;
      sentAt: number;
      request: SharedLockTakeoverRequest;
    };
'''

replacement = '''  | {
      id: string;
      type: "lock-takeover-requested";
      sessionId: string;
      senderId: string;
      sentAt: number;
      request: SharedLockTakeoverRequest;
    }
  | {
      id: string;
      type: "world-mutation";
      sessionId: string;
      senderId: string;
      sentAt: number;
      mutation: SharedWorldMutation;
    };
'''

if '"world-mutation"' not in text:
    if anchor not in text:
        raise SystemExit(
            "❌ The Sprint 21B.7 transport anchor was not found."
        )

    text = text.replace(
        anchor,
        replacement,
        1,
    )

path.write_text(text)

print("✅ World-mutation transport message added.")
PY

# ------------------------------------------------------------
# Shared mutation controller
# ------------------------------------------------------------

cat > src/collaboration/mutations/useSharedMutationController.ts <<'EOF'
import {
  useCallback,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import {
  useSharedSelection,
} from "../selection/SharedSelectionContext";

import {
  useCollaborationTransport,
} from "../transport/CollaborationTransportContext";

import {
  createTransportMessage,
} from "../transport/messageFactory";

import {
  createSharedMutation,
} from "./mutationFactory";

import {
  useSharedMutations,
} from "./SharedMutationContext";

import type {
  SharedMutationInput,
  SharedWorldMutation,
} from "./types";

export function useSharedMutationController() {
  const {
    session,
  } = useCollaborationSession();

  const {
    send,
  } = useCollaborationTransport();

  const {
    getLock,
    isLockedByOther,
  } = useSharedSelection();

  const {
    applyMutation,
    getObjectRevision,
    getNextObjectRevision,
  } = useSharedMutations();

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  const publishMutation =
    useCallback(
      (
        input:
          SharedMutationInput,
      ): SharedWorldMutation | null => {
        if (!localParticipant) {
          return null;
        }

        if (
          isLockedByOther(
            input.objectId,
            localParticipant.id,
          )
        ) {
          return null;
        }

        const lock =
          getLock(input.objectId);

        if (
          lock &&
          lock.ownerId !==
            localParticipant.id
        ) {
          return null;
        }

        const mutation =
          createSharedMutation(
            input,
            {
              participantId:
                localParticipant.id,
              participantName:
                localParticipant.name,
              revision:
                getNextObjectRevision(
                  input.objectId,
                ),
            },
          );

        const accepted =
          applyMutation(
            mutation,
          );

        if (!accepted) {
          return null;
        }

        send(
          createTransportMessage({
            type: "world-mutation",
            sessionId: session.id,
            senderId:
              localParticipant.id,
            mutation,
          }),
        );

        return mutation;
      },
      [
        session.id,
        localParticipant,
        isLockedByOther,
        getLock,
        getNextObjectRevision,
        applyMutation,
        send,
      ],
    );

  return {
    publishMutation,
    applyMutation,
    getObjectRevision,
    getNextObjectRevision,
  };
}
EOF

# ------------------------------------------------------------
# Shared mutation bridge
# ------------------------------------------------------------

cat > src/collaboration/mutations/SharedMutationBridge.tsx <<'EOF'
import {
  useEffect,
} from "react";

import {
  collaborationTransport,
} from "../transport";

import {
  useSharedMutationController,
} from "./useSharedMutationController";

import type {
  SharedMutationDispatchDetail,
  SharedMutationInput,
  SharedWorldMutation,
} from "./types";

const LOCAL_MUTATION_EVENT =
  "playground:world-mutation";

const APPLIED_MUTATION_EVENT =
  "playground:world-mutation-applied";

function dispatchAppliedMutation(
  mutation: SharedWorldMutation,
  remote: boolean,
) {
  const detail:
    SharedMutationDispatchDetail = {
      mutation,
      remote,
    };

  document.dispatchEvent(
    new CustomEvent(
      APPLIED_MUTATION_EVENT,
      {
        detail,
      },
    ),
  );
}

export default function SharedMutationBridge() {
  const {
    publishMutation,
    applyMutation,
  } = useSharedMutationController();

  useEffect(() => {
    const handleLocalMutation = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          SharedMutationInput
        >;

      const input =
        customEvent.detail;

      if (
        !input ||
        typeof input.objectId !==
          "string" ||
        typeof input.kind !==
          "string"
      ) {
        return;
      }

      const mutation =
        publishMutation(input);

      if (mutation) {
        dispatchAppliedMutation(
          mutation,
          false,
        );
      } else {
        document.dispatchEvent(
          new CustomEvent(
            "playground:world-mutation-rejected",
            {
              detail: {
                input,
                reason:
                  "Object is locked or the mutation is stale.",
              },
            },
          ),
        );
      }
    };

    document.addEventListener(
      LOCAL_MUTATION_EVENT,
      handleLocalMutation,
    );

    return () => {
      document.removeEventListener(
        LOCAL_MUTATION_EVENT,
        handleLocalMutation,
      );
    };
  }, [publishMutation]);

  useEffect(() => {
    return collaborationTransport.subscribe(
      (message) => {
        if (
          message.type !==
          "world-mutation"
        ) {
          return;
        }

        const accepted =
          applyMutation(
            message.mutation,
          );

        if (!accepted) {
          return;
        }

        dispatchAppliedMutation(
          message.mutation,
          true,
        );
      },
    );
  }, [applyMutation]);

  return null;
}
EOF

# ------------------------------------------------------------
# Public mutation helpers
# ------------------------------------------------------------

cat > src/collaboration/mutations/events.ts <<'EOF'
import type {
  SharedMutationDispatchDetail,
  SharedMutationInput,
} from "./types";

export const SHARED_WORLD_MUTATION_EVENT =
  "playground:world-mutation";

export const SHARED_WORLD_MUTATION_APPLIED_EVENT =
  "playground:world-mutation-applied";

export const SHARED_WORLD_MUTATION_REJECTED_EVENT =
  "playground:world-mutation-rejected";

export function dispatchSharedWorldMutation(
  mutation: SharedMutationInput,
) {
  document.dispatchEvent(
    new CustomEvent(
      SHARED_WORLD_MUTATION_EVENT,
      {
        detail: mutation,
      },
    ),
  );
}

export function subscribeToSharedWorldMutations(
  listener: (
    detail:
      SharedMutationDispatchDetail,
  ) => void,
) {
  const handler = (
    event: Event,
  ) => {
    const customEvent =
      event as CustomEvent<
        SharedMutationDispatchDetail
      >;

    listener(
      customEvent.detail,
    );
  };

  document.addEventListener(
    SHARED_WORLD_MUTATION_APPLIED_EVENT,
    handler,
  );

  return () => {
    document.removeEventListener(
      SHARED_WORLD_MUTATION_APPLIED_EVENT,
      handler,
    );
  };
}
EOF

cat > src/collaboration/mutations/index.ts <<'EOF'
export {
  dispatchSharedWorldMutation,
  subscribeToSharedWorldMutations,
  SHARED_WORLD_MUTATION_APPLIED_EVENT,
  SHARED_WORLD_MUTATION_EVENT,
  SHARED_WORLD_MUTATION_REJECTED_EVENT,
} from "./events";

export {
  SharedMutationProvider,
  useSharedMutations,
} from "./SharedMutationContext";

export {
  useSharedMutationController,
} from "./useSharedMutationController";

export type {
  SharedMutationDispatchDetail,
  SharedMutationInput,
  SharedMutationKind,
  SharedObjectPosition,
  SharedObjectSize,
  SharedWorldMutation,
} from "./types";
EOF

# ------------------------------------------------------------
# Add world-mutation case to transport context
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/collaboration/transport/CollaborationTransportContext.tsx"
)

text = path.read_text()

old = '''          case "lock-takeover-requested": {
            break;
          }
'''

new = '''          case "lock-takeover-requested":
          case "world-mutation": {
            break;
          }
'''

if old in text:
    text = text.replace(
        old,
        new,
        1,
    )
elif 'case "world-mutation"' not in text:
    raise SystemExit(
        "❌ Could not add world-mutation to CollaborationTransportContext.tsx."
    )

path.write_text(text)

print("✅ Main transport context updated.")
PY

# ------------------------------------------------------------
# Mount provider and bridge in main.tsx
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
        'import { SharedMutationProvider } '
        'from "./collaboration/mutations/SharedMutationContext";\n'
    ),
    'from "./collaboration/mutations/SharedMutationContext"',
)

text = insert_import(
    text,
    (
        'import SharedMutationBridge '
        'from "./collaboration/mutations/SharedMutationBridge";\n'
    ),
    'from "./collaboration/mutations/SharedMutationBridge"',
)

if "<SharedMutationProvider>" not in text:
    open_tag = (
        "<SharedSelectionProvider>"
    )

    close_tag = (
        "</SharedSelectionProvider>"
    )

    open_index = text.find(
        open_tag
    )

    close_index = text.rfind(
        close_tag
    )

    if (
        open_index == -1
        or close_index == -1
        or close_index <= open_index
    ):
        raise SystemExit(
            "❌ SharedSelectionProvider wrapper was not found in src/main.tsx."
        )

    inner_start = (
        open_index + len(open_tag)
    )

    inner = text[
        inner_start:close_index
    ].strip()

    wrapped = (
        "\n            "
        "<SharedMutationProvider>\n"
        + "\n".join(
            "              " + line
            if line.strip()
            else line
            for line in inner.splitlines()
        )
        + "\n            "
        "</SharedMutationProvider>\n          "
    )

    text = (
        text[:inner_start]
        + wrapped
        + text[close_index:]
    )

if "<SharedMutationBridge />" not in text:
    app_anchor = "<App />"

    if app_anchor not in text:
        raise SystemExit(
            "❌ <App /> was not found in src/main.tsx."
        )

    text = text.replace(
        app_anchor,
        (
            "<SharedMutationBridge />\n"
            "              "
            "<App />"
        ),
        1,
    )

path.write_text(text)

print("✅ SharedMutationProvider mounted.")
print("✅ SharedMutationBridge mounted.")
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
echo "Integration events:"
echo "  playground:world-mutation"
echo "  playground:world-mutation-applied"
echo "  playground:world-mutation-rejected"
echo ""
echo "Supported mutations:"
echo "  object-moved"
echo "  object-resized"
echo "  object-properties-updated"
echo "  object-deleted"
