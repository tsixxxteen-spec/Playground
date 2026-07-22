#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.5"
MARKER=".playground-sprint-21B5-installed"
BACKUP_DIR=".playground-backups/sprint-21B5-$(date +%Y%m%d-%H%M%S)"

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
  "src/collaboration/CollaborationSessionContext.tsx"
  "src/components/collaboration/CollaborationPanel.tsx"
)

for file in "${FILES_TO_BACK_UP[@]}"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp -p "$file" "$BACKUP_DIR/$file"
  fi
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

    rm -rf src/collaboration/transport
    rm -f \
      src/components/collaboration/ConnectionBadge.tsx \
      src/components/collaboration/ConnectionBadge.css \
      "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit $code
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

  getConnectionState(): CollaborationConnectionState;
}
EOF

# ------------------------------------------------------------
# Transport helpers
# ------------------------------------------------------------

cat > src/collaboration/transport/messageFactory.ts <<'EOF'
import type {
  CollaborationTransportMessage,
} from "./types";

type MessageInput = Omit<
  CollaborationTransportMessage,
  "id" | "sentAt"
>;

export function createTransportMessage(
  input: MessageInput,
): CollaborationTransportMessage {
  const id =
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
      ? crypto.randomUUID()
      : [
          Date.now().toString(36),
          Math.random().toString(36).slice(2),
        ].join("-");

  return {
    ...input,
    id,
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
  private channel: BroadcastChannel | null =
    null;

  private sessionId: string | null =
    null;

  private connectionState:
    CollaborationConnectionState = "idle";

  private readonly messageListeners =
    new Set<CollaborationTransportListener>();

  private readonly connectionListeners =
    new Set<ConnectionStateListener>();

  async connect(sessionId: string) {
    if (
      this.channel &&
      this.sessionId === sessionId &&
      this.connectionState === "connected"
    ) {
      return;
    }

    await this.disconnect();

    this.setConnectionState("connecting");
    this.sessionId = sessionId;

    if (
      typeof window === "undefined" ||
      !("BroadcastChannel" in window)
    ) {
      this.setConnectionState("error");

      throw new Error(
        "BroadcastChannel is unavailable in this environment.",
      );
    }

    try {
      this.channel = new BroadcastChannel(
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
          message.sessionId !== this.sessionId
        ) {
          return;
        }

        this.messageListeners.forEach(
          (listener) => listener(message),
        );
      };

      this.channel.onmessageerror = () => {
        this.setConnectionState("error");
      };

      this.setConnectionState("connected");
    } catch (error) {
      this.channel = null;
      this.setConnectionState("error");
      throw error;
    }
  }

  async disconnect() {
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
  ) {
    if (
      !this.channel ||
      this.connectionState !== "connected"
    ) {
      return;
    }

    this.channel.postMessage(message);
  }

  subscribe(
    listener: CollaborationTransportListener,
  ) {
    this.messageListeners.add(listener);

    return () => {
      this.messageListeners.delete(listener);
    };
  }

  subscribeToConnectionState(
    listener: ConnectionStateListener,
  ) {
    this.connectionListeners.add(listener);

    listener(this.connectionState);

    return () => {
      this.connectionListeners.delete(
        listener,
      );
    };
  }

  getConnectionState() {
    return this.connectionState;
  }

  private setConnectionState(
    state: CollaborationConnectionState,
  ) {
    if (this.connectionState === state) {
      return;
    }

    this.connectionState = state;

    this.connectionListeners.forEach(
      (listener) => listener(state),
    );
  }
}
EOF

# ------------------------------------------------------------
# No-op transport fallback
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
    new Set<ConnectionStateListener>();

  async connect() {
    this.state = "disconnected";
    this.emitState();
  }

  async disconnect() {
    this.state = "disconnected";
    this.emitState();
  }

  send(
    _message: CollaborationTransportMessage,
  ) {
    // Deliberately does nothing.
  }

  subscribe(
    _listener: CollaborationTransportListener,
  ) {
    return () => undefined;
  }

  subscribeToConnectionState(
    listener: ConnectionStateListener,
  ) {
    this.connectionListeners.add(listener);
    listener(this.state);

    return () => {
      this.connectionListeners.delete(
        listener,
      );
    };
  }

  getConnectionState() {
    return this.state;
  }

  private emitState() {
    this.connectionListeners.forEach(
      (listener) => listener(this.state),
    );
  }
}
EOF

# ------------------------------------------------------------
# Transport singleton
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
# Transport context
# ------------------------------------------------------------

cat > src/collaboration/transport/CollaborationTransportContext.tsx <<'EOF'
import {
  createContext,
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
    message: CollaborationTransportMessage,
  ) => void;

  reconnect: () => Promise<void>;
};

const CollaborationTransportContext =
  createContext<
    CollaborationTransportContextValue | null
  >(null);

type CollaborationTransportProviderProps = {
  children: ReactNode;
};

function mergeParticipant<T extends {
  id: string;
}>(
  items: T[],
  incoming: T,
) {
  const exists = items.some(
    (item) => item.id === incoming.id,
  );

  if (!exists) {
    return [...items, incoming];
  }

  return items.map((item) =>
    item.id === incoming.id
      ? {
          ...item,
          ...incoming,
        }
      : item,
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

  const [connectionState, setConnectionState] =
    useState<CollaborationConnectionState>(
      collaborationTransport.getConnectionState(),
    );

  const reconnectTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const participantsRef =
    useRef(session.participants);

  useEffect(() => {
    participantsRef.current =
      session.participants;
  }, [session.participants]);

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id === "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  useEffect(() => {
    return collaborationTransport
      .subscribeToConnectionState(
        setConnectionState,
      );
  }, []);

  useEffect(() => {
    return collaborationTransport.subscribe(
      (message) => {
        if (
          message.sessionId !== session.id
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

            setParticipants(participants);

            if (localParticipant) {
              collaborationTransport.send(
                createTransportMessage({
                  type: "presence-snapshot",
                  sessionId: session.id,
                  senderId:
                    localParticipant.id,
                  participants,
                }),
              );
            }

            break;
          }

          case "session-leave": {
            setParticipants(
              participantsRef.current.filter(
                (participant) =>
                  participant.id !==
                  message.participantId,
              ),
            );
            break;
          }

          case "presence-snapshot": {
            setParticipants(
              message.participants,
            );
            break;
          }

          case "participant-updated": {
            setParticipants(
              mergeParticipant(
                participantsRef.current,
                message.participant,
              ),
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
            renameSession(message.name);
            break;
          }

          case "invitation-created":
            break;

          default:
            break;
        }
      },
    );
  }, [
    session.id,
    localParticipant,
    setParticipants,
    receiveInvitation,
    cancelInvitation,
    renameSession,
  ]);

  const connect = async () => {
    try {
      await collaborationTransport.connect(
        session.id,
      );

      if (localParticipant) {
        collaborationTransport.send(
          createTransportMessage({
            type: "session-join",
            sessionId: session.id,
            senderId:
              localParticipant.id,
            participant:
              localParticipant,
          }),
        );
      }
    } catch {
      if (reconnectTimerRef.current) {
        clearTimeout(
          reconnectTimerRef.current,
        );
      }

      reconnectTimerRef.current =
        setTimeout(() => {
          void connect();
        }, 2500);
    }
  };

  useEffect(() => {
    void connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(
          reconnectTimerRef.current,
        );
      }

      if (localParticipant) {
        collaborationTransport.send(
          createTransportMessage({
            type: "session-leave",
            sessionId: session.id,
            senderId:
              localParticipant.id,
            participantId:
              localParticipant.id,
          }),
        );
      }

      void collaborationTransport.disconnect();
    };
  }, [session.id]);

  useEffect(() => {
    if (
      connectionState === "error" ||
      connectionState === "disconnected"
    ) {
      if (reconnectTimerRef.current) {
        clearTimeout(
          reconnectTimerRef.current,
        );
      }

      reconnectTimerRef.current =
        setTimeout(() => {
          void connect();
        }, 2500);
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(
          reconnectTimerRef.current,
        );
      }
    };
  }, [connectionState, session.id]);

  const value = useMemo(
    () => ({
      connectionState,

      send: (
        message:
          CollaborationTransportMessage,
      ) => {
        collaborationTransport.send(
          message,
        );
      },

      reconnect: connect,
    }),
    [connectionState, session.id],
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
  state: CollaborationConnectionState;
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
      onClick={canReconnect ? onReconnect : undefined}
      title={
        canReconnect
          ? "Reconnect collaboration"
          : LABELS[state]
      }
    >
      <span className="connection-badge__dot" />

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
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
  color: rgba(255, 255, 255, 0.5);
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
  color: rgba(255, 255, 255, 0.82);
}

.connection-badge[data-state="connected"]
.connection-badge__dot {
  background: #6ddc8b;
  box-shadow: 0 0 10px rgba(109, 220, 139, 0.5);
}

.connection-badge[data-state="connecting"]
.connection-badge__dot,
.connection-badge[data-state="reconnecting"]
.connection-badge__dot {
  background: #e8c76e;
  animation: collaboration-pulse 1.1s infinite;
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
# Patch main.tsx and CollaborationPanel.tsx
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path
import re

main_path = Path("src/main.tsx")
main = main_path.read_text()

transport_import = (
    'import { CollaborationTransportProvider } '
    'from "./collaboration/transport/CollaborationTransportContext";\n'
)

if "CollaborationTransportProvider" not in main:
    lines = main.splitlines(keepends=True)
    last_import = -1

    for index, line in enumerate(lines):
        if line.lstrip().startswith("import "):
            last_import = index

    lines.insert(last_import + 1, transport_import)
    main = "".join(lines)

if "<CollaborationTransportProvider>" not in main:
    pattern = re.compile(
        r"(<CollaborationSessionProvider>\s*)([\s\S]*?)(\s*</CollaborationSessionProvider>)",
        re.MULTILINE,
    )

    match = pattern.search(main)

    if not match:
        raise SystemExit(
            "❌ CollaborationSessionProvider wrapper was not found in src/main.tsx."
        )

    inner = match.group(2)

    replacement = (
        match.group(1)
        + "<CollaborationTransportProvider>\n"
        + inner.strip()
        + "\n      </CollaborationTransportProvider>"
        + match.group(3)
    )

    main = (
        main[:match.start()]
        + replacement
        + main[match.end():]
    )

main_path.write_text(main)

panel_path = Path(
    "src/components/collaboration/CollaborationPanel.tsx"
)

panel = panel_path.read_text()

connection_import = (
    'import ConnectionBadge from "./ConnectionBadge";\n'
)

transport_hook_import = (
    'import { useCollaborationTransport } '
    'from "../../collaboration/transport/CollaborationTransportContext";\n'
)

if 'from "./ConnectionBadge"' not in panel:
    first_local_import = panel.find(
        'import CollaboratorCard'
    )

    if first_local_import >= 0:
        panel = (
            panel[:first_local_import]
            + connection_import
            + panel[first_local_import:]
        )
    else:
        panel = connection_import + panel

if "useCollaborationTransport" not in panel:
    last_import_end = 0

    for match in re.finditer(
        r'import[\s\S]*?;\n',
        panel,
    ):
        last_import_end = match.end()

    panel = (
        panel[:last_import_end]
        + transport_hook_import
        + panel[last_import_end:]
    )

component_anchor = (
    "export default function CollaborationPanel() {\n"
)

if component_anchor not in panel:
    raise SystemExit(
        "❌ CollaborationPanel component anchor was not found."
    )

if "connectionState" not in panel:
    panel = panel.replace(
        component_anchor,
        component_anchor
        + """  const {
    connectionState,
    reconnect,
  } = useCollaborationTransport();

""",
        1,
    )

badge_anchor = (
    "<SessionBadge\n"
    "            shared={session.isShared}\n"
    "          />"
)

if badge_anchor in panel and "<ConnectionBadge" not in panel:
    panel = panel.replace(
        badge_anchor,
        """<div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "6px",
            }}
          >
            <SessionBadge
              shared={session.isShared}
            />

            <ConnectionBadge
              state={connectionState}
              onReconnect={() => {
                void reconnect();
              }}
            />
          </div>""",
        1,
    )
elif "<ConnectionBadge" not in panel:
    raise SystemExit(
        "❌ SessionBadge anchor was not found in CollaborationPanel.tsx."
    )

panel_path.write_text(panel)

print("✅ main.tsx transport provider added.")
print("✅ CollaborationPanel connection badge added.")
PY

touch "$MARKER"

echo ""
echo "Running clean build..."
echo ""

npm run build

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
echo "  2. Copy the shared session link"
echo "  3. Open the link in a second browser tab"
echo "  4. Accept the invitation"
echo "  5. Watch participant presence synchronize between tabs"
