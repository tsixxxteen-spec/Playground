#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.5-R2"
MARKER=".playground-sprint-21B5-R2-installed"
BACKUP_DIR=".playground-backups/sprint-21B5-R2-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the Playground project root."
[[ -d src ]] || fail "The src directory was not found."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."
[[ -f src/collaboration/CollaborationSessionContext.tsx ]] || fail "Sprint 21B.4 is required."
[[ -f src/collaboration/types.ts ]] || fail "Collaboration types were not found."
[[ -f src/components/collaboration/CollaborationPanel.tsx ]] || fail "CollaborationPanel.tsx was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/transport
mkdir -p src/components/collaboration

FILES_TO_BACK_UP=(
  "src/main.tsx"
  "src/components/collaboration/CollaborationPanel.tsx"
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

    rm -rf src/collaboration/transport

    rm -f \
      src/components/collaboration/ConnectionBadge.tsx \
      src/components/collaboration/ConnectionBadge.css \
      "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Transport types
# ------------------------------------------------------------

cat > src/collaboration/transport/types.ts <<'EOF'
import type {
  CollaborationInvitation,
  IncomingCollaborationInvitation,
} from "../invitationTypes";

import type {
  CollaborationParticipant,
} from "../types";

export type CollaborationConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type CollaborationTransportMessage =
  | {
      id: string;
      type: "session-join";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participant: CollaborationParticipant;
    }
  | {
      id: string;
      type: "session-leave";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participantId: string;
    }
  | {
      id: string;
      type: "presence-snapshot";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participants: CollaborationParticipant[];
    }
  | {
      id: string;
      type: "participant-updated";
      sessionId: string;
      senderId: string;
      sentAt: number;
      participant: CollaborationParticipant;
    }
  | {
      id: string;
      type: "invitation-created";
      sessionId: string;
      senderId: string;
      sentAt: number;
      invitation: CollaborationInvitation;
    }
  | {
      id: string;
      type: "invitation-received";
      sessionId: string;
      senderId: string;
      sentAt: number;
      invitation: IncomingCollaborationInvitation;
    }
  | {
      id: string;
      type: "invitation-cancelled";
      sessionId: string;
      senderId: string;
      sentAt: number;
      invitationId: string;
    }
  | {
      id: string;
      type: "session-renamed";
      sessionId: string;
      senderId: string;
      sentAt: number;
      name: string;
    };

export type CollaborationTransportListener = (
  message: CollaborationTransportMessage,
) => void;

export type ConnectionStateListener = (
  state: CollaborationConnectionState,
) => void;

export interface CollaborationTransport {
  connect(sessionId: string): Promise<void>;

  disconnect(): Promise<void>;

  send(
    message: CollaborationTransportMessage,
  ): void;

  subscribe(
    listener: CollaborationTransportListener,
  ): () => void;

  subscribeToConnectionState(
    listener: ConnectionStateListener,
  ): () => void;

  getConnectionState():
    CollaborationConnectionState;
}
EOF

# ------------------------------------------------------------
# Correctly distributive transport-message input type
# ------------------------------------------------------------

cat > src/collaboration/transport/messageFactory.ts <<'EOF'
import type {
  CollaborationTransportMessage,
} from "./types";

type RemoveGeneratedFields<T> =
  T extends unknown
    ? Omit<T, "id" | "sentAt">
    : never;

export type TransportMessageInput =
  RemoveGeneratedFields<
    CollaborationTransportMessage
  >;

function createMessageId() {
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

export function createTransportMessage(
  input: TransportMessageInput,
): CollaborationTransportMessage {
  return {
    ...input,
    id: createMessageId(),
    sentAt: Date.now(),
  } as CollaborationTransportMessage;
}
EOF

# ------------------------------------------------------------
# BroadcastChannel transport
# ------------------------------------------------------------

cat > src/collaboration/transport/BroadcastChannelTransport.ts <<'EOF'
import type {
  CollaborationConnectionState,
  CollaborationTransport,
  CollaborationTransportListener,
  CollaborationTransportMessage,
  ConnectionStateListener,
} from "./types";

const CHANNEL_PREFIX =
  "playground-collaboration";

export class BroadcastChannelTransport
  implements CollaborationTransport
{
  private channel:
    | BroadcastChannel
    | null = null;

  private sessionId:
    | string
    | null = null;

  private connectionState:
    CollaborationConnectionState =
      "idle";

  private readonly messageListeners =
    new Set<
      CollaborationTransportListener
    >();

  private readonly connectionListeners =
    new Set<
      ConnectionStateListener
    >();

  async connect(
    sessionId: string,
  ): Promise<void> {
    if (
      this.channel &&
      this.sessionId === sessionId &&
      this.connectionState === "connected"
    ) {
      return;
    }

    await this.disconnect();

    this.setConnectionState(
      "connecting",
    );

    this.sessionId = sessionId;

    if (
      typeof window === "undefined" ||
      !("BroadcastChannel" in window)
    ) {
      this.setConnectionState("error");

      throw new Error(
        "BroadcastChannel is unavailable.",
      );
    }

    try {
      this.channel =
        new BroadcastChannel(
          `${CHANNEL_PREFIX}:${sessionId}`,
        );

      this.channel.onmessage = (
        event: MessageEvent<
          CollaborationTransportMessage
        >,
      ) => {
        const message = event.data;

        if (
          !message ||
          message.sessionId !==
            this.sessionId
        ) {
          return;
        }

        this.messageListeners.forEach(
          (listener) => {
            listener(message);
          },
        );
      };

      this.channel.onmessageerror =
        () => {
          this.setConnectionState(
            "error",
          );
        };

      this.setConnectionState(
        "connected",
      );
    } catch (error) {
      this.channel = null;

      this.setConnectionState(
        "error",
      );

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.sessionId = null;

    if (
      this.connectionState !== "idle"
    ) {
      this.setConnectionState(
        "disconnected",
      );
    }
  }

  send(
    message: CollaborationTransportMessage,
  ): void {
    if (
      !this.channel ||
      this.connectionState !==
        "connected"
    ) {
      return;
    }

    this.channel.postMessage(message);
  }

  subscribe(
    listener:
      CollaborationTransportListener,
  ): () => void {
    this.messageListeners.add(
      listener,
    );

    return () => {
      this.messageListeners.delete(
        listener,
      );
    };
  }

  subscribeToConnectionState(
    listener:
      ConnectionStateListener,
  ): () => void {
    this.connectionListeners.add(
      listener,
    );

    listener(this.connectionState);

    return () => {
      this.connectionListeners.delete(
        listener,
      );
    };
  }

  getConnectionState():
    CollaborationConnectionState {
    return this.connectionState;
  }

  private setConnectionState(
    state:
      CollaborationConnectionState,
  ): void {
    if (
      this.connectionState === state
    ) {
      return;
    }

    this.connectionState = state;

    this.connectionListeners.forEach(
      (listener) => {
        listener(state);
      },
    );
  }
}
EOF

# ------------------------------------------------------------
# Fallback transport
# ------------------------------------------------------------

cat > src/collaboration/transport/NoopTransport.ts <<'EOF'
import type {
  CollaborationConnectionState,
  CollaborationTransport,
  CollaborationTransportListener,
  CollaborationTransportMessage,
  ConnectionStateListener,
} from "./types";

export class NoopTransport
  implements CollaborationTransport
{
  private state:
    CollaborationConnectionState =
      "disconnected";

  private readonly connectionListeners =
    new Set<
      ConnectionStateListener
    >();

  async connect(
    _sessionId: string,
  ): Promise<void> {
    this.state = "disconnected";
    this.emitState();
  }

  async disconnect(): Promise<void> {
    this.state = "disconnected";
    this.emitState();
  }

  send(
    _message:
      CollaborationTransportMessage,
  ): void {
    // Intentionally empty.
  }

  subscribe(
    _listener:
      CollaborationTransportListener,
  ): () => void {
    return () => undefined;
  }

  subscribeToConnectionState(
    listener:
      ConnectionStateListener,
  ): () => void {
    this.connectionListeners.add(
      listener,
    );

    listener(this.state);

    return () => {
      this.connectionListeners.delete(
        listener,
      );
    };
  }

  getConnectionState():
    CollaborationConnectionState {
    return this.state;
  }

  private emitState(): void {
    this.connectionListeners.forEach(
      (listener) => {
        listener(this.state);
      },
    );
  }
}
EOF

# ------------------------------------------------------------
# Transport export
# ------------------------------------------------------------

cat > src/collaboration/transport/index.ts <<'EOF'
import {
  BroadcastChannelTransport,
} from "./BroadcastChannelTransport";

import {
  NoopTransport,
} from "./NoopTransport";

import type {
  CollaborationTransport,
} from "./types";

function createTransport():
  CollaborationTransport {
  if (
    typeof window !== "undefined" &&
    "BroadcastChannel" in window
  ) {
    return new BroadcastChannelTransport();
  }

  return new NoopTransport();
}

export const collaborationTransport =
  createTransport();

export type {
  CollaborationConnectionState,
  CollaborationTransport,
  CollaborationTransportMessage,
} from "./types";
EOF

# ------------------------------------------------------------
# Transport React context
# ------------------------------------------------------------

cat > src/collaboration/transport/CollaborationTransportContext.tsx <<'EOF'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  useCollaborationSession,
} from "../CollaborationSessionContext";

import type {
  CollaborationParticipant,
} from "../types";

import {
  collaborationTransport,
} from "./index";

import {
  createTransportMessage,
} from "./messageFactory";

import type {
  CollaborationConnectionState,
  CollaborationTransportMessage,
} from "./types";

type CollaborationTransportContextValue = {
  connectionState:
    CollaborationConnectionState;

  send: (
    message:
      CollaborationTransportMessage,
  ) => void;

  reconnect: () => Promise<void>;
};

const CollaborationTransportContext =
  createContext<
    CollaborationTransportContextValue
    | null
  >(null);

type CollaborationTransportProviderProps = {
  children: ReactNode;
};

function mergeParticipant(
  participants:
    CollaborationParticipant[],
  incoming:
    CollaborationParticipant,
): CollaborationParticipant[] {
  const exists =
    participants.some(
      (participant) =>
        participant.id === incoming.id,
    );

  if (!exists) {
    return [
      ...participants,
      incoming,
    ];
  }

  return participants.map(
    (participant) =>
      participant.id === incoming.id
        ? {
            ...participant,
            ...incoming,
          }
        : participant,
  );
}

export function CollaborationTransportProvider({
  children,
}: CollaborationTransportProviderProps) {
  const {
    session,
    setParticipants,
    receiveInvitation,
    cancelInvitation,
    renameSession,
  } = useCollaborationSession();

  const [
    connectionState,
    setConnectionState,
  ] =
    useState<
      CollaborationConnectionState
    >(
      collaborationTransport
        .getConnectionState(),
    );

  const reconnectTimerRef =
    useRef<
      ReturnType<typeof setTimeout>
      | null
    >(null);

  const participantsRef =
    useRef<
      CollaborationParticipant[]
    >(session.participants);

  const sessionIdRef =
    useRef(session.id);

  const localParticipantRef =
    useRef<
      CollaborationParticipant
      | undefined
    >(undefined);

  useEffect(() => {
    participantsRef.current =
      session.participants;

    localParticipantRef.current =
      session.participants.find(
        (participant) =>
          participant.id ===
            "local-owner" ||
          participant.name === "You",
      ) ?? session.participants[0];
  }, [session.participants]);

  useEffect(() => {
    sessionIdRef.current =
      session.id;
  }, [session.id]);

  const clearReconnectTimer =
    useCallback(() => {
      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current,
        );

        reconnectTimerRef.current =
          null;
      }
    }, []);

  const connect =
    useCallback(async () => {
      clearReconnectTimer();

      try {
        await collaborationTransport.connect(
          sessionIdRef.current,
        );

        const localParticipant =
          localParticipantRef.current;

        if (localParticipant) {
          collaborationTransport.send(
            createTransportMessage({
              type: "session-join",
              sessionId:
                sessionIdRef.current,
              senderId:
                localParticipant.id,
              participant:
                localParticipant,
            }),
          );
        }
      } catch {
        reconnectTimerRef.current =
          setTimeout(() => {
            void connect();
          }, 2500);
      }
    }, [clearReconnectTimer]);

  useEffect(() => {
    return collaborationTransport
      .subscribeToConnectionState(
        setConnectionState,
      );
  }, []);

  useEffect(() => {
    return collaborationTransport
      .subscribe((message) => {
        if (
          message.sessionId !==
            sessionIdRef.current
        ) {
          return;
        }

        switch (message.type) {
          case "session-join": {
            const participants =
              mergeParticipant(
                participantsRef.current,
                message.participant,
              );

            participantsRef.current =
              participants;

            setParticipants(
              participants,
            );

            const localParticipant =
              localParticipantRef.current;

            if (localParticipant) {
              collaborationTransport.send(
                createTransportMessage({
                  type:
                    "presence-snapshot",
                  sessionId:
                    sessionIdRef.current,
                  senderId:
                    localParticipant.id,
                  participants,
                }),
              );
            }

            break;
          }

          case "session-leave": {
            const participants =
              participantsRef.current.filter(
                (participant) =>
                  participant.id !==
                    message.participantId,
              );

            participantsRef.current =
              participants;

            setParticipants(
              participants,
            );

            break;
          }

          case "presence-snapshot": {
            participantsRef.current =
              message.participants;

            setParticipants(
              message.participants,
            );

            break;
          }

          case "participant-updated": {
            const participants =
              mergeParticipant(
                participantsRef.current,
                message.participant,
              );

            participantsRef.current =
              participants;

            setParticipants(
              participants,
            );

            break;
          }

          case "invitation-received": {
            receiveInvitation(
              message.invitation,
            );

            break;
          }

          case "invitation-cancelled": {
            cancelInvitation(
              message.invitationId,
            );

            break;
          }

          case "session-renamed": {
            renameSession(
              message.name,
            );

            break;
          }

          case "invitation-created": {
            break;
          }

          default: {
            const exhaustiveCheck:
              never = message;

            return exhaustiveCheck;
          }
        }
      });
  }, [
    setParticipants,
    receiveInvitation,
    cancelInvitation,
    renameSession,
  ]);

  useEffect(() => {
    void connect();

    return () => {
      clearReconnectTimer();

      const localParticipant =
        localParticipantRef.current;

      if (localParticipant) {
        collaborationTransport.send(
          createTransportMessage({
            type: "session-leave",
            sessionId:
              sessionIdRef.current,
            senderId:
              localParticipant.id,
            participantId:
              localParticipant.id,
          }),
        );
      }

      void collaborationTransport
        .disconnect();
    };
  }, [
    session.id,
    connect,
    clearReconnectTimer,
  ]);

  useEffect(() => {
    if (
      connectionState !== "error" &&
      connectionState !==
        "disconnected"
    ) {
      return;
    }

    clearReconnectTimer();

    reconnectTimerRef.current =
      setTimeout(() => {
        void connect();
      }, 2500);

    return clearReconnectTimer;
  }, [
    connectionState,
    connect,
    clearReconnectTimer,
  ]);

  const send = useCallback(
    (
      message:
        CollaborationTransportMessage,
    ) => {
      collaborationTransport.send(
        message,
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      connectionState,
      send,
      reconnect: connect,
    }),
    [
      connectionState,
      send,
      connect,
    ],
  );

  return (
    <CollaborationTransportContext.Provider
      value={value}
    >
      {children}
    </CollaborationTransportContext.Provider>
  );
}

export function useCollaborationTransport() {
  const context = useContext(
    CollaborationTransportContext,
  );

  if (!context) {
    throw new Error(
      "useCollaborationTransport must be used inside CollaborationTransportProvider.",
    );
  }

  return context;
}
EOF

# ------------------------------------------------------------
# Connection badge
# ------------------------------------------------------------

cat > src/components/collaboration/ConnectionBadge.tsx <<'EOF'
import type {
  CollaborationConnectionState,
} from "../../collaboration/transport";

import "./ConnectionBadge.css";

type ConnectionBadgeProps = {
  state:
    CollaborationConnectionState;

  onReconnect?: () => void;
};

const LABELS: Record<
  CollaborationConnectionState,
  string
> = {
  idle: "Offline",
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  disconnected: "Offline",
  error: "Connection Error",
};

export default function ConnectionBadge({
  state,
  onReconnect,
}: ConnectionBadgeProps) {
  const canReconnect =
    state === "error" ||
    state === "disconnected";

  return (
    <button
      type="button"
      className="connection-badge"
      data-state={state}
      disabled={!canReconnect}
      onClick={
        canReconnect
          ? onReconnect
          : undefined
      }
      title={
        canReconnect
          ? "Reconnect collaboration"
          : LABELS[state]
      }
    >
      <span
        className="connection-badge__dot"
      />

      {LABELS[state]}
    </button>
  );
}
EOF

cat > src/components/collaboration/ConnectionBadge.css <<'EOF'
.connection-badge {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid
    rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.035);
  color:
    rgba(255, 255, 255, 0.5);
  font: inherit;
  font-size: 9px;
  font-weight: 600;
}

.connection-badge:not(:disabled) {
  cursor: pointer;
}

.connection-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #77777c;
}

.connection-badge[data-state="connected"] {
  color:
    rgba(255, 255, 255, 0.82);
}

.connection-badge[data-state="connected"]
.connection-badge__dot {
  background: #6ddc8b;
  box-shadow:
    0 0 10px
    rgba(109, 220, 139, 0.5);
}

.connection-badge[data-state="connecting"]
.connection-badge__dot,
.connection-badge[data-state="reconnecting"]
.connection-badge__dot {
  background: #e8c76e;
  animation:
    collaboration-pulse
    1.1s infinite;
}

.connection-badge[data-state="error"]
.connection-badge__dot {
  background: #e57373;
}

@keyframes collaboration-pulse {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}
EOF

# ------------------------------------------------------------
# Safely patch main.tsx and CollaborationPanel.tsx
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path
import re


def insert_import_at_top(
    source: str,
    import_statement: str,
    identity: str,
) -> str:
    if identity in source:
        return source

    lines = source.splitlines(
        keepends=True
    )

    index = 0
    in_import = False
    last_import_end = -1

    while index < len(lines):
        stripped = lines[index].strip()

        if not in_import:
            if stripped.startswith(
                "import "
            ):
                in_import = True
                last_import_end = index

                if (
                    stripped.endswith(";")
                    or (
                        " from " in stripped
                        and not stripped.endswith(
                            "{"
                        )
                    )
                ):
                    in_import = False

                index += 1
                continue

            if (
                stripped == ""
                or stripped.startswith("//")
                or stripped.startswith(
                    "/*"
                )
            ):
                index += 1
                continue

            break

        last_import_end = index

        if (
            stripped.endswith(";")
            or " from " in stripped
        ):
            in_import = False

        index += 1

    insertion_index = (
        last_import_end + 1
        if last_import_end >= 0
        else 0
    )

    lines.insert(
        insertion_index,
        import_statement,
    )

    return "".join(lines)


# ---------- main.tsx ----------

main_path = Path("src/main.tsx")
main = main_path.read_text()

main = insert_import_at_top(
    main,
    (
        'import { CollaborationTransportProvider } '
        'from "./collaboration/transport/CollaborationTransportContext";\n'
    ),
    'from "./collaboration/transport/CollaborationTransportContext"',
)

if (
    "<CollaborationTransportProvider>"
    not in main
):
    open_tag = (
        "<CollaborationSessionProvider>"
    )

    close_tag = (
        "</CollaborationSessionProvider>"
    )

    open_index = main.find(open_tag)
    close_index = main.rfind(close_tag)

    if (
        open_index == -1
        or close_index == -1
        or close_index <= open_index
    ):
        raise SystemExit(
            "❌ CollaborationSessionProvider wrapper was not found in src/main.tsx."
        )

    inner_start = (
        open_index + len(open_tag)
    )

    inner = main[
        inner_start:close_index
    ].strip()

    wrapped = (
        "\n      "
        "<CollaborationTransportProvider>\n"
        + "\n".join(
            "        " + line
            if line.strip()
            else line
            for line in inner.splitlines()
        )
        + "\n      "
        "</CollaborationTransportProvider>\n    "
    )

    main = (
        main[:inner_start]
        + wrapped
        + main[close_index:]
    )

main_path.write_text(main)


# ---------- CollaborationPanel.tsx ----------

panel_path = Path(
    "src/components/collaboration/CollaborationPanel.tsx"
)

panel = panel_path.read_text()

# Remove any accidentally inserted non-top-level import
# from a previous failed attempt.
panel = re.sub(
    r'\nimport \{ useCollaborationTransport \} from "\.\./\.\./collaboration/transport/CollaborationTransportContext";\s*',
    "\n",
    panel,
)

panel = insert_import_at_top(
    panel,
    (
        'import { useCollaborationTransport } '
        'from "../../collaboration/transport/CollaborationTransportContext";\n'
    ),
    'from "../../collaboration/transport/CollaborationTransportContext"',
)

panel = insert_import_at_top(
    panel,
    (
        'import ConnectionBadge '
        'from "./ConnectionBadge";\n'
    ),
    'from "./ConnectionBadge"',
)

component_anchor = (
    "export default function CollaborationPanel() {"
)

if component_anchor not in panel:
    raise SystemExit(
        "❌ CollaborationPanel component declaration was not found."
    )

if (
    "const {\n"
    "    connectionState,\n"
    "    reconnect,\n"
    "  } = useCollaborationTransport();"
    not in panel
):
    panel = panel.replace(
        component_anchor,
        component_anchor
        + """

  const {
    connectionState,
    reconnect,
  } = useCollaborationTransport();""",
        1,
    )

if "<ConnectionBadge" not in panel:
    badge_pattern = re.compile(
        r"""
        <SessionBadge
        \s+
        shared=\{session\.isShared\}
        \s*
        />
        """,
        re.VERBOSE,
    )

    badge_match = badge_pattern.search(
        panel
    )

    if not badge_match:
        raise SystemExit(
            "❌ SessionBadge could not be located in CollaborationPanel.tsx."
        )

    replacement = """<div className="collaboration-panel__status">
            <SessionBadge
              shared={session.isShared}
            />

            <ConnectionBadge
              state={connectionState}
              onReconnect={() => {
                void reconnect();
              }}
            />
          </div>"""

    panel = (
        panel[:badge_match.start()]
        + replacement
        + panel[badge_match.end():]
    )

panel_path.write_text(panel)

print("✅ src/main.tsx patched safely.")
print("✅ CollaborationPanel imports repaired.")
print("✅ ConnectionBadge added.")
PY

# ------------------------------------------------------------
# Add status-layout CSS without replacing existing panel CSS
# ------------------------------------------------------------

PANEL_CSS="src/components/collaboration/CollaborationPanel.css"

if [[ -f "$PANEL_CSS" ]] && ! grep -q "collaboration-panel__status" "$PANEL_CSS"; then
  cat >> "$PANEL_CSS" <<'EOF'

.collaboration-panel__status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
EOF
fi

echo ""
echo "Running TypeScript and Vite build..."
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
echo "  2. Open the collaboration panel"
echo "  3. Confirm the status badge says Live"
echo "  4. Copy the shared-session link"
echo "  5. Open it in another tab"
echo "  6. Accept the invitation"
echo "  7. Confirm presence updates across tabs"
