#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.6"
MARKER=".playground-sprint-21B6-installed"
BACKUP_DIR=".playground-backups/sprint-21B6-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the Playground project root."
[[ -d src ]] || fail "The src directory was not found."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."
[[ -f src/collaboration/transport/types.ts ]] || fail "Sprint 21B.5 is required."
[[ -f src/collaboration/transport/CollaborationTransportContext.tsx ]] || fail "Collaboration transport context was not found."
[[ -f src/collaboration/types.ts ]] || fail "Collaboration types were not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/cursors
mkdir -p src/components/collaboration

FILES_TO_BACK_UP=(
  "src/main.tsx"
  "src/collaboration/types.ts"
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

    rm -rf src/collaboration/cursors

    rm -f \
      src/components/collaboration/SharedCursor.tsx \
      src/components/collaboration/SharedCursor.css \
      src/components/collaboration/SharedCursorOverlay.tsx \
      src/components/collaboration/SharedCursorOverlay.css \
      "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Collaboration participant activity types
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path("src/collaboration/types.ts")
text = path.read_text()

if 'export type CollaborationActivityState' not in text:
    text = text.replace(
        'export type CollaborationRole =\n',
        '''export type CollaborationActivityState =
  | "active"
  | "idle"
  | "away";

export type CollaborationRole =
''',
        1,
    )

old = '''export type CollaborationParticipant = {
  id: string;
  name: string;
  avatarUrl?: string;
  role: CollaborationRole;
  isOnline: boolean;
};
'''

new = '''export type CollaborationParticipant = {
  id: string;
  name: string;
  avatarUrl?: string;
  role: CollaborationRole;
  isOnline: boolean;
  activityState?: CollaborationActivityState;
  selectedObjectId?: string | null;
};
'''

if old in text:
    text = text.replace(old, new, 1)
elif 'activityState?: CollaborationActivityState;' not in text:
    raise SystemExit(
        "❌ CollaborationParticipant shape did not match the expected Sprint 21B.5 structure."
    )

path.write_text(text)

print("✅ Collaboration participant activity fields added.")
PY

# ------------------------------------------------------------
# Cursor presence types
# ------------------------------------------------------------

cat > src/collaboration/cursors/types.ts <<'EOF'
import type {
  CollaborationActivityState,
} from "../types";

export type SharedCursorPosition = {
  x: number;
  y: number;
};

export type SharedCursorPresence = {
  participantId: string;
  participantName: string;
  position: SharedCursorPosition;
  activityState: CollaborationActivityState;
  selectedObjectId?: string | null;
  updatedAt: number;
};
EOF

# ------------------------------------------------------------
# Cursor store context
# ------------------------------------------------------------

cat > src/collaboration/cursors/SharedCursorContext.tsx <<'EOF'
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
  SharedCursorPresence,
} from "./types";

type SharedCursorContextValue = {
  cursors: SharedCursorPresence[];

  upsertCursor: (
    cursor: SharedCursorPresence,
  ) => void;

  removeCursor: (
    participantId: string,
  ) => void;

  clearCursors: () => void;
};

const SharedCursorContext =
  createContext<
    SharedCursorContextValue | null
  >(null);

type SharedCursorProviderProps = {
  children: ReactNode;
};

export function SharedCursorProvider({
  children,
}: SharedCursorProviderProps) {
  const [cursors, setCursors] =
    useState<SharedCursorPresence[]>([]);

  const upsertCursor = useCallback(
    (
      incoming:
        SharedCursorPresence,
    ) => {
      setCursors((current) => {
        const exists = current.some(
          (cursor) =>
            cursor.participantId ===
            incoming.participantId,
        );

        if (!exists) {
          return [
            ...current,
            incoming,
          ];
        }

        return current.map(
          (cursor) =>
            cursor.participantId ===
              incoming.participantId
              ? {
                  ...cursor,
                  ...incoming,
                }
              : cursor,
        );
      });
    },
    [],
  );

  const removeCursor = useCallback(
    (participantId: string) => {
      setCursors((current) =>
        current.filter(
          (cursor) =>
            cursor.participantId !==
            participantId,
        ),
      );
    },
    [],
  );

  const clearCursors = useCallback(
    () => {
      setCursors([]);
    },
    [],
  );

  const value = useMemo(
    () => ({
      cursors,
      upsertCursor,
      removeCursor,
      clearCursors,
    }),
    [
      cursors,
      upsertCursor,
      removeCursor,
      clearCursors,
    ],
  );

  return (
    <SharedCursorContext.Provider
      value={value}
    >
      {children}
    </SharedCursorContext.Provider>
  );
}

export function useSharedCursors() {
  const context = useContext(
    SharedCursorContext,
  );

  if (!context) {
    throw new Error(
      "useSharedCursors must be used inside SharedCursorProvider.",
    );
  }

  return context;
}
EOF

# ------------------------------------------------------------
# Extend transport messages safely
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/collaboration/transport/types.ts"
)

text = path.read_text()

cursor_import = '''import type {
  SharedCursorPresence,
} from "../cursors/types";

'''

if 'from "../cursors/types"' not in text:
    first_import_end = text.find(";\n")

    if first_import_end == -1:
        raise SystemExit(
            "❌ Could not locate the import section in transport/types.ts."
        )

    first_import_end += 2

    text = (
        text[:first_import_end]
        + "\n"
        + cursor_import
        + text[first_import_end:]
    )

anchor = '''  | {
      id: string;
      type: "session-renamed";
      sessionId: string;
      senderId: string;
      sentAt: number;
      name: string;
    };
'''

replacement = '''  | {
      id: string;
      type: "session-renamed";
      sessionId: string;
      senderId: string;
      sentAt: number;
      name: string;
    }
  | {
      id: string;
      type: "cursor-updated";
      sessionId: string;
      senderId: string;
      sentAt: number;
      cursor: SharedCursorPresence;
    }
  | {
      id: string;
      type: "cursor-left";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participantId: string;
    };
'''

if '"cursor-updated"' not in text:
    if anchor not in text:
        raise SystemExit(
            "❌ The transport message union did not match the expected Sprint 21B.5 structure."
        )

    text = text.replace(
        anchor,
        replacement,
        1,
    )

path.write_text(text)

print("✅ Cursor transport messages added.")
PY

# ------------------------------------------------------------
# Cursor publishing hook
# ------------------------------------------------------------

cat > src/collaboration/cursors/useSharedCursorPublisher.ts <<'EOF'
import {
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

import type {
  CollaborationActivityState,
} from "../types";

const IDLE_AFTER_MS = 45_000;
const AWAY_AFTER_MS = 120_000;
const CURSOR_SEND_INTERVAL_MS = 34;

type CursorSnapshot = {
  x: number;
  y: number;
};

export function useSharedCursorPublisher() {
  const {
    session,
  } = useCollaborationSession();

  const {
    send,
  } = useCollaborationTransport();

  const latestCursorRef =
    useRef<CursorSnapshot | null>(null);

  const lastSentAtRef =
    useRef(0);

  const lastActivityAtRef =
    useRef(Date.now());

  const activityStateRef =
    useRef<CollaborationActivityState>(
      "active",
    );

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  useEffect(() => {
    if (!localParticipant) {
      return;
    }

    const publishCursor = (
      activityState:
        CollaborationActivityState,
    ) => {
      const cursor =
        latestCursorRef.current;

      if (!cursor) {
        return;
      }

      send(
        createTransportMessage({
          type: "cursor-updated",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          cursor: {
            participantId:
              localParticipant.id,
            participantName:
              localParticipant.name,
            position: cursor,
            activityState,
            selectedObjectId:
              localParticipant
                .selectedObjectId ??
              null,
            updatedAt: Date.now(),
          },
        }),
      );
    };

    const markActive = () => {
      lastActivityAtRef.current =
        Date.now();

      if (
        activityStateRef.current !==
        "active"
      ) {
        activityStateRef.current =
          "active";

        publishCursor("active");
      }
    };

    const handlePointerMove = (
      event: PointerEvent,
    ) => {
      latestCursorRef.current = {
        x:
          event.clientX /
          Math.max(
            window.innerWidth,
            1,
          ),
        y:
          event.clientY /
          Math.max(
            window.innerHeight,
            1,
          ),
      };

      markActive();

      const now = Date.now();

      if (
        now - lastSentAtRef.current <
        CURSOR_SEND_INTERVAL_MS
      ) {
        return;
      }

      lastSentAtRef.current = now;

      publishCursor("active");
    };

    const handleActivity = () => {
      markActive();
    };

    const activityTimer =
      window.setInterval(() => {
        const elapsed =
          Date.now() -
          lastActivityAtRef.current;

        const nextState:
          CollaborationActivityState =
            elapsed >= AWAY_AFTER_MS
              ? "away"
              : elapsed >=
                  IDLE_AFTER_MS
                ? "idle"
                : "active";

        if (
          nextState !==
          activityStateRef.current
        ) {
          activityStateRef.current =
            nextState;

          publishCursor(nextState);
        }
      }, 5_000);

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "pointerdown",
      handleActivity,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "keydown",
      handleActivity,
    );

    return () => {
      window.clearInterval(
        activityTimer,
      );

      window.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      window.removeEventListener(
        "pointerdown",
        handleActivity,
      );

      window.removeEventListener(
        "keydown",
        handleActivity,
      );

      send(
        createTransportMessage({
          type: "cursor-left",
          sessionId: session.id,
          senderId:
            localParticipant.id,
          participantId:
            localParticipant.id,
        }),
      );
    };
  }, [
    session.id,
    localParticipant,
    send,
  ]);
}
EOF

# ------------------------------------------------------------
# Cursor bridge
# ------------------------------------------------------------

cat > src/collaboration/cursors/SharedCursorBridge.tsx <<'EOF'
import {
  useEffect,
} from "react";

import {
  collaborationTransport,
} from "../transport";

import {
  useSharedCursors,
} from "./SharedCursorContext";

import {
  useSharedCursorPublisher,
} from "./useSharedCursorPublisher";

export default function SharedCursorBridge() {
  useSharedCursorPublisher();

  const {
    upsertCursor,
    removeCursor,
  } = useSharedCursors();

  useEffect(() => {
    return collaborationTransport.subscribe(
      (message) => {
        switch (message.type) {
          case "cursor-updated": {
            upsertCursor(
              message.cursor,
            );
            break;
          }

          case "cursor-left":
          case "session-leave": {
            removeCursor(
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
    upsertCursor,
    removeCursor,
  ]);

  return null;
}
EOF

# ------------------------------------------------------------
# Shared cursor component
# ------------------------------------------------------------

cat > src/components/collaboration/SharedCursor.tsx <<'EOF'
import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  SharedCursorPresence,
} from "../../collaboration/cursors/types";

import "./SharedCursor.css";

type SharedCursorProps = {
  cursor:
    SharedCursorPresence;
};

type PixelPosition = {
  x: number;
  y: number;
};

export default function SharedCursor({
  cursor,
}: SharedCursorProps) {
  const targetRef =
    useRef<PixelPosition>({
      x:
        cursor.position.x *
        window.innerWidth,
      y:
        cursor.position.y *
        window.innerHeight,
    });

  const frameRef =
    useRef<number | null>(null);

  const [
    renderedPosition,
    setRenderedPosition,
  ] = useState<PixelPosition>(
    targetRef.current,
  );

  useEffect(() => {
    targetRef.current = {
      x:
        cursor.position.x *
        window.innerWidth,
      y:
        cursor.position.y *
        window.innerHeight,
    };
  }, [
    cursor.position.x,
    cursor.position.y,
  ]);

  useEffect(() => {
    const animate = () => {
      setRenderedPosition(
        (current) => {
          const target =
            targetRef.current;

          return {
            x:
              current.x +
              (target.x -
                current.x) *
                0.24,
            y:
              current.y +
              (target.y -
                current.y) *
                0.24,
          };
        },
      );

      frameRef.current =
        window.requestAnimationFrame(
          animate,
        );
    };

    frameRef.current =
      window.requestAnimationFrame(
        animate,
      );

    return () => {
      if (
        frameRef.current !== null
      ) {
        window.cancelAnimationFrame(
          frameRef.current,
        );
      }
    };
  }, []);

  return (
    <div
      className="shared-cursor"
      data-activity={
        cursor.activityState
      }
      style={{
        transform:
          `translate3d(${renderedPosition.x}px, ${renderedPosition.y}px, 0)`,
      }}
    >
      <svg
        className="shared-cursor__pointer"
        width="22"
        height="28"
        viewBox="0 0 22 28"
        aria-hidden="true"
      >
        <path
          d="M2 1.5V22.2L7.1 17.1L10.2 25.5L14.2 23.9L11 15.7H18.8L2 1.5Z"
          fill="currentColor"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      <div className="shared-cursor__label">
        {cursor.participantName}

        {cursor.activityState !==
          "active" && (
          <span>
            {cursor.activityState}
          </span>
        )}
      </div>
    </div>
  );
}
EOF

cat > src/components/collaboration/SharedCursor.css <<'EOF'
.shared-cursor {
  position: fixed;
  z-index: 10000;
  top: 0;
  left: 0;
  display: flex;
  pointer-events: none;
  align-items: flex-start;
  color: #ffffff;
  will-change: transform;
}

.shared-cursor__pointer {
  flex: 0 0 auto;
  filter:
    drop-shadow(
      0 3px 7px
      rgba(0, 0, 0, 0.35)
    );
}

.shared-cursor__label {
  display: inline-flex;
  min-height: 23px;
  align-items: center;
  gap: 6px;
  margin: 17px 0 0 -1px;
  padding: 0 8px;
  border:
    1px solid
    rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background:
    rgba(18, 18, 20, 0.88);
  box-shadow:
    0 5px 16px
    rgba(0, 0, 0, 0.2);
  color: #ffffff;
  font-size: 9px;
  font-weight: 650;
  white-space: nowrap;
  backdrop-filter: blur(12px);
}

.shared-cursor__label span {
  color:
    rgba(255, 255, 255, 0.45);
  font-size: 8px;
  font-weight: 500;
  text-transform: capitalize;
}

.shared-cursor[data-activity="idle"] {
  opacity: 0.7;
}

.shared-cursor[data-activity="away"] {
  opacity: 0.42;
}
EOF

# ------------------------------------------------------------
# Cursor overlay
# ------------------------------------------------------------

cat > src/components/collaboration/SharedCursorOverlay.tsx <<'EOF'
import {
  useCollaborationSession,
} from "../../collaboration/CollaborationSessionContext";

import {
  useSharedCursors,
} from "../../collaboration/cursors/SharedCursorContext";

import SharedCursor from "./SharedCursor";

import "./SharedCursorOverlay.css";

export default function SharedCursorOverlay() {
  const {
    session,
  } = useCollaborationSession();

  const {
    cursors,
  } = useSharedCursors();

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  return (
    <div
      className="shared-cursor-overlay"
      aria-hidden="true"
    >
      {cursors
        .filter(
          (cursor) =>
            cursor.participantId !==
            localParticipant?.id,
        )
        .map((cursor) => (
          <SharedCursor
            key={
              cursor.participantId
            }
            cursor={cursor}
          />
        ))}
    </div>
  );
}
EOF

cat > src/components/collaboration/SharedCursorOverlay.css <<'EOF'
.shared-cursor-overlay {
  position: fixed;
  z-index: 9999;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
EOF

# ------------------------------------------------------------
# Add cursor message handling to transport context
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/collaboration/transport/CollaborationTransportContext.tsx"
)

text = path.read_text()

anchor = '''          case "invitation-created": {
            break;
          }

          default: {
'''

replacement = '''          case "invitation-created":
          case "cursor-updated":
          case "cursor-left": {
            break;
          }

          default: {
'''

if anchor in text:
    text = text.replace(
        anchor,
        replacement,
        1,
    )
elif (
    'case "cursor-updated"' not in text
    or 'case "cursor-left"' not in text
):
    raise SystemExit(
        "❌ Could not add cursor cases to CollaborationTransportContext.tsx."
    )

path.write_text(text)

print("✅ Transport context cursor cases added.")
PY

# ------------------------------------------------------------
# Safely patch main.tsx
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path("src/main.tsx")
text = path.read_text()


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


text = insert_import(
    text,
    (
        'import { SharedCursorProvider } '
        'from "./collaboration/cursors/SharedCursorContext";\n'
    ),
    'from "./collaboration/cursors/SharedCursorContext"',
)

text = insert_import(
    text,
    (
        'import SharedCursorBridge '
        'from "./collaboration/cursors/SharedCursorBridge";\n'
    ),
    'from "./collaboration/cursors/SharedCursorBridge"',
)

text = insert_import(
    text,
    (
        'import SharedCursorOverlay '
        'from "./components/collaboration/SharedCursorOverlay";\n'
    ),
    'from "./components/collaboration/SharedCursorOverlay"',
)

if "<SharedCursorProvider>" not in text:
    open_tag = (
        "<CollaborationTransportProvider>"
    )

    close_tag = (
        "</CollaborationTransportProvider>"
    )

    open_index = text.find(open_tag)
    close_index = text.rfind(close_tag)

    if (
        open_index == -1
        or close_index == -1
        or close_index <= open_index
    ):
        raise SystemExit(
            "❌ CollaborationTransportProvider wrapper was not found in src/main.tsx."
        )

    inner_start = (
        open_index + len(open_tag)
    )

    inner = text[
        inner_start:close_index
    ].strip()

    wrapped = (
        "\n        "
        "<SharedCursorProvider>\n"
        + "\n".join(
            "          " + line
            if line.strip()
            else line
            for line in inner.splitlines()
        )
        + "\n        "
        "</SharedCursorProvider>\n      "
    )

    text = (
        text[:inner_start]
        + wrapped
        + text[close_index:]
    )

if "<SharedCursorBridge />" not in text:
    app_anchor = "<App />"

    if app_anchor not in text:
        raise SystemExit(
            "❌ <App /> was not found in src/main.tsx."
        )

    text = text.replace(
        app_anchor,
        (
            "<SharedCursorBridge />\n"
            "          "
            "<SharedCursorOverlay />\n"
            "          "
            "<App />"
        ),
        1,
    )

path.write_text(text)

print("✅ Shared cursor provider added to main.tsx.")
print("✅ Cursor bridge and overlay mounted.")
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
echo "Test:"
echo "  1. Run npm run dev"
echo "  2. Open the same shared session in two tabs"
echo "  3. Move the pointer in one tab"
echo "  4. Confirm the remote pointer appears in the other"
echo "  5. Stop moving for 45 seconds to test idle state"
echo "  6. Leave the tab untouched for 2 minutes to test away state"
