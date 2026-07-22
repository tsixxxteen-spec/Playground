#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.4"
BACKUP_DIR=".playground-backups/sprint-21B4-$(date +%Y%m%d-%H%M%S)"
MARKER=".playground-sprint-21B4-installed"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the Playground project root."
[[ -d src ]] || fail "The src directory was not found."
[[ -f src/collaboration/CollaborationSessionContext.tsx ]] || fail "Sprint 21B.2 is required."
[[ -f src/collaboration/types.ts ]] || fail "Collaboration types were not found."
[[ -f src/components/collaboration/CollaborationPanel.tsx ]] || fail "CollaborationPanel.tsx was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration
mkdir -p src/components/collaboration

FILES_TO_BACK_UP=(
  "src/collaboration/types.ts"
  "src/collaboration/CollaborationSessionContext.tsx"
  "src/components/collaboration/CollaborationPanel.tsx"
  "src/components/collaboration/InviteDialog.tsx"
  "src/components/collaboration/CollaborationPanel.css"
  "src/components/collaboration/InviteDialog.css"
)

for file in "${FILES_TO_BACK_UP[@]}"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp -p "$file" "$BACKUP_DIR/$file"
  fi
done

rollback() {
  exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    echo ""
    echo "⚠️ Sprint installation failed. Restoring previous files..."

    for file in "${FILES_TO_BACK_UP[@]}"; do
      if [[ -f "$BACKUP_DIR/$file" ]]; then
        cp -p "$BACKUP_DIR/$file" "$file"
      fi
    done

    rm -f \
      src/collaboration/invitationTypes.ts \
      src/collaboration/sessionLinks.ts \
      src/components/collaboration/IncomingInviteCard.tsx \
      src/components/collaboration/IncomingInviteCard.css \
      src/components/collaboration/PendingInviteCard.tsx \
      src/components/collaboration/PendingInviteCard.css \
      src/components/collaboration/ShareSessionPanel.tsx \
      src/components/collaboration/ShareSessionPanel.css \
      "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit $exit_code
}

trap rollback EXIT

# ------------------------------------------------------------
# Invitation types
# ------------------------------------------------------------

cat > src/collaboration/invitationTypes.ts <<'EOF'
export type CollaborationInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export type CollaborationInvitation = {
  id: string;
  sessionId: string;
  sessionName: string;
  inviterId: string;
  inviterName: string;
  recipientName: string;
  recipientId?: string;
  createdAt: number;
  status: CollaborationInvitationStatus;
};

export type IncomingCollaborationInvitation = {
  id: string;
  sessionId: string;
  sessionName: string;
  inviterId: string;
  inviterName: string;
  createdAt: number;
};
EOF

# ------------------------------------------------------------
# Collaboration/session types
# ------------------------------------------------------------

cat > src/collaboration/types.ts <<'EOF'
import type {
  CollaborationInvitation,
  IncomingCollaborationInvitation,
} from "./invitationTypes";

export type CollaborationRole =
  | "owner"
  | "collaborator";

export type CollaborationParticipant = {
  id: string;
  name: string;
  avatarUrl?: string;
  role: CollaborationRole;
  isOnline: boolean;
};

export type CollaborationSession = {
  id: string;
  name: string;
  isShared: boolean;
  createdAt: number;
  ownerId: string;
  participants: CollaborationParticipant[];
  pendingInvitations: CollaborationInvitation[];
  incomingInvitations: IncomingCollaborationInvitation[];
};
EOF

# ------------------------------------------------------------
# Session-link utilities
# ------------------------------------------------------------

cat > src/collaboration/sessionLinks.ts <<'EOF'
export const COLLABORATION_SESSION_QUERY_KEY =
  "playgroundSession";

export function createCollaborationSessionId() {
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

export function getCollaborationSessionLink(
  sessionId: string,
) {
  if (typeof window === "undefined") {
    return sessionId;
  }

  const url = new URL(window.location.href);

  url.searchParams.set(
    COLLABORATION_SESSION_QUERY_KEY,
    sessionId,
  );

  return url.toString();
}

export function getRequestedCollaborationSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);

  return url.searchParams.get(
    COLLABORATION_SESSION_QUERY_KEY,
  );
}

export function clearRequestedCollaborationSessionId() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  url.searchParams.delete(
    COLLABORATION_SESSION_QUERY_KEY,
  );

  window.history.replaceState(
    window.history.state,
    "",
    url.toString(),
  );
}
EOF

# ------------------------------------------------------------
# Collaboration session context
# ------------------------------------------------------------

cat > src/collaboration/CollaborationSessionContext.tsx <<'EOF'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type {
  CollaborationInvitation,
  IncomingCollaborationInvitation,
} from "./invitationTypes";

import {
  clearRequestedCollaborationSessionId,
  createCollaborationSessionId,
  getRequestedCollaborationSessionId,
} from "./sessionLinks";

import type {
  CollaborationParticipant,
  CollaborationSession,
} from "./types";

const STORAGE_KEY =
  "playground:collaboration-session";

const LOCAL_OWNER_ID =
  "local-owner";

type CollaborationSessionContextValue = {
  session: CollaborationSession;
  inviteDialogOpen: boolean;

  openInviteDialog: () => void;
  closeInviteDialog: () => void;

  inviteParticipant: (
    username: string,
  ) => CollaborationInvitation | null;

  cancelInvitation: (
    invitationId: string,
  ) => void;

  receiveInvitation: (
    invitation: IncomingCollaborationInvitation,
  ) => void;

  acceptInvitation: (
    invitationId: string,
  ) => void;

  declineInvitation: (
    invitationId: string,
  ) => void;

  removeParticipant: (
    participantId: string,
  ) => void;

  setParticipants: (
    participants: CollaborationParticipant[],
  ) => void;

  renameSession: (
    name: string,
  ) => void;

  resetSession: () => void;
};

function createDefaultSession(): CollaborationSession {
  return {
    id: createCollaborationSessionId(),
    name: "My Playground",
    isShared: false,
    createdAt: Date.now(),
    ownerId: LOCAL_OWNER_ID,
    participants: [
      {
        id: LOCAL_OWNER_ID,
        name: "You",
        role: "owner",
        isOnline: true,
      },
    ],
    pendingInvitations: [],
    incomingInvitations: [],
  };
}

function readStoredSession(): CollaborationSession {
  if (typeof window === "undefined") {
    return createDefaultSession();
  }

  try {
    const stored = window.localStorage.getItem(
      STORAGE_KEY,
    );

    if (!stored) {
      return createDefaultSession();
    }

    const parsed =
      JSON.parse(stored) as Partial<CollaborationSession>;

    if (
      !parsed.id ||
      !Array.isArray(parsed.participants)
    ) {
      return createDefaultSession();
    }

    return {
      id: parsed.id,
      name: parsed.name ?? "My Playground",
      isShared:
        parsed.isShared ??
        parsed.participants.length > 1,
      createdAt:
        parsed.createdAt ?? Date.now(),
      ownerId:
        parsed.ownerId ?? LOCAL_OWNER_ID,
      participants: parsed.participants,
      pendingInvitations:
        parsed.pendingInvitations ?? [],
      incomingInvitations:
        parsed.incomingInvitations ?? [],
    };
  } catch {
    return createDefaultSession();
  }
}

const CollaborationSessionContext =
  createContext<CollaborationSessionContextValue | null>(
    null,
  );

type CollaborationSessionProviderProps = {
  children: ReactNode;
};

export function CollaborationSessionProvider({
  children,
}: CollaborationSessionProviderProps) {
  const [session, setSession] =
    useState<CollaborationSession>(
      readStoredSession,
    );

  const [inviteDialogOpen, setInviteDialogOpen] =
    useState(false);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(session),
    );
  }, [session]);

  useEffect(() => {
    const requestedSessionId =
      getRequestedCollaborationSessionId();

    if (
      !requestedSessionId ||
      requestedSessionId === session.id
    ) {
      return;
    }

    setSession((currentSession) => {
      const alreadyExists =
        currentSession.incomingInvitations.some(
          (invitation) =>
            invitation.sessionId ===
            requestedSessionId,
        );

      if (alreadyExists) {
        return currentSession;
      }

      const invitation: IncomingCollaborationInvitation =
        {
          id: createCollaborationSessionId(),
          sessionId: requestedSessionId,
          sessionName: "Shared Playground",
          inviterId: "shared-link-owner",
          inviterName: "Playground creator",
          createdAt: Date.now(),
        };

      return {
        ...currentSession,
        incomingInvitations: [
          ...currentSession.incomingInvitations,
          invitation,
        ],
      };
    });

    clearRequestedCollaborationSessionId();
  }, [session.id]);

  const openInviteDialog = useCallback(() => {
    setInviteDialogOpen(true);
  }, []);

  const closeInviteDialog = useCallback(() => {
    setInviteDialogOpen(false);
  }, []);

  const inviteParticipant = useCallback(
    (
      username: string,
    ): CollaborationInvitation | null => {
      const normalizedUsername =
        username.trim();

      if (!normalizedUsername) {
        return null;
      }

      let createdInvitation:
        | CollaborationInvitation
        | null = null;

      setSession((currentSession) => {
        const participantAlreadyExists =
          currentSession.participants.some(
            (participant) =>
              participant.name.toLowerCase() ===
              normalizedUsername.toLowerCase(),
          );

        const invitationAlreadyExists =
          currentSession.pendingInvitations.some(
            (invitation) =>
              invitation.recipientName.toLowerCase() ===
                normalizedUsername.toLowerCase() &&
              invitation.status === "pending",
          );

        if (
          participantAlreadyExists ||
          invitationAlreadyExists
        ) {
          return currentSession;
        }

        createdInvitation = {
          id: createCollaborationSessionId(),
          sessionId: currentSession.id,
          sessionName: currentSession.name,
          inviterId: currentSession.ownerId,
          inviterName: "You",
          recipientName: normalizedUsername,
          createdAt: Date.now(),
          status: "pending",
        };

        return {
          ...currentSession,
          isShared: true,
          pendingInvitations: [
            ...currentSession.pendingInvitations,
            createdInvitation,
          ],
        };
      });

      setInviteDialogOpen(false);

      return createdInvitation;
    },
    [],
  );

  const cancelInvitation = useCallback(
    (invitationId: string) => {
      setSession((currentSession) => {
        const pendingInvitations =
          currentSession.pendingInvitations.filter(
            (invitation) =>
              invitation.id !== invitationId,
          );

        return {
          ...currentSession,
          isShared:
            currentSession.participants.length > 1 ||
            pendingInvitations.length > 0,
          pendingInvitations,
        };
      });
    },
    [],
  );

  const receiveInvitation = useCallback(
    (
      invitation: IncomingCollaborationInvitation,
    ) => {
      setSession((currentSession) => {
        const alreadyExists =
          currentSession.incomingInvitations.some(
            (existingInvitation) =>
              existingInvitation.id ===
                invitation.id ||
              existingInvitation.sessionId ===
                invitation.sessionId,
          );

        if (alreadyExists) {
          return currentSession;
        }

        return {
          ...currentSession,
          incomingInvitations: [
            ...currentSession.incomingInvitations,
            invitation,
          ],
        };
      });
    },
    [],
  );

  const acceptInvitation = useCallback(
    (invitationId: string) => {
      setSession((currentSession) => {
        const invitation =
          currentSession.incomingInvitations.find(
            (item) =>
              item.id === invitationId,
          );

        if (!invitation) {
          return currentSession;
        }

        return {
          id: invitation.sessionId,
          name: invitation.sessionName,
          isShared: true,
          createdAt: Date.now(),
          ownerId: invitation.inviterId,
          participants: [
            {
              id: invitation.inviterId,
              name: invitation.inviterName,
              role: "owner",
              isOnline: true,
            },
            {
              id: LOCAL_OWNER_ID,
              name: "You",
              role: "collaborator",
              isOnline: true,
            },
          ],
          pendingInvitations: [],
          incomingInvitations:
            currentSession.incomingInvitations.filter(
              (item) =>
                item.id !== invitationId,
            ),
        };
      });
    },
    [],
  );

  const declineInvitation = useCallback(
    (invitationId: string) => {
      setSession((currentSession) => ({
        ...currentSession,
        incomingInvitations:
          currentSession.incomingInvitations.filter(
            (invitation) =>
              invitation.id !== invitationId,
          ),
      }));
    },
    [],
  );

  const removeParticipant = useCallback(
    (participantId: string) => {
      setSession((currentSession) => {
        const participants =
          currentSession.participants.filter(
            (participant) =>
              participant.id !== participantId ||
              participant.role === "owner",
          );

        return {
          ...currentSession,
          isShared:
            participants.length > 1 ||
            currentSession.pendingInvitations.length >
              0,
          participants,
        };
      });
    },
    [],
  );

  const setParticipants = useCallback(
    (
      participants: CollaborationParticipant[],
    ) => {
      setSession((currentSession) => ({
        ...currentSession,
        isShared:
          participants.length > 1 ||
          currentSession.pendingInvitations.length >
            0,
        participants,
      }));
    },
    [],
  );

  const renameSession = useCallback(
    (name: string) => {
      const normalizedName = name.trim();

      if (!normalizedName) {
        return;
      }

      setSession((currentSession) => ({
        ...currentSession,
        name: normalizedName,
      }));
    },
    [],
  );

  const resetSession = useCallback(() => {
    setSession(createDefaultSession());
    setInviteDialogOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      inviteDialogOpen,
      openInviteDialog,
      closeInviteDialog,
      inviteParticipant,
      cancelInvitation,
      receiveInvitation,
      acceptInvitation,
      declineInvitation,
      removeParticipant,
      setParticipants,
      renameSession,
      resetSession,
    }),
    [
      session,
      inviteDialogOpen,
      openInviteDialog,
      closeInviteDialog,
      inviteParticipant,
      cancelInvitation,
      receiveInvitation,
      acceptInvitation,
      declineInvitation,
      removeParticipant,
      setParticipants,
      renameSession,
      resetSession,
    ],
  );

  return (
    <CollaborationSessionContext.Provider
      value={value}
    >
      {children}
    </CollaborationSessionContext.Provider>
  );
}

export function useCollaborationSession() {
  const context = useContext(
    CollaborationSessionContext,
  );

  if (!context) {
    throw new Error(
      "useCollaborationSession must be used inside CollaborationSessionProvider.",
    );
  }

  return context;
}
EOF

# ------------------------------------------------------------
# Pending invitation card
# ------------------------------------------------------------

cat > src/components/collaboration/PendingInviteCard.tsx <<'EOF'
import type {
  CollaborationInvitation,
} from "../../collaboration/invitationTypes";

import "./PendingInviteCard.css";

type PendingInviteCardProps = {
  invitation: CollaborationInvitation;
  onCancel: (
    invitationId: string,
  ) => void;
};

export default function PendingInviteCard({
  invitation,
  onCancel,
}: PendingInviteCardProps) {
  return (
    <article className="pending-invite-card">
      <div className="pending-invite-card__icon">
        ↗
      </div>

      <div className="pending-invite-card__content">
        <strong>
          {invitation.recipientName}
        </strong>

        <span>Invite pending</span>
      </div>

      <button
        type="button"
        onClick={() =>
          onCancel(invitation.id)
        }
      >
        Cancel
      </button>
    </article>
  );
}
EOF

cat > src/components/collaboration/PendingInviteCard.css <<'EOF'
.pending-invite-card {
  display: flex;
  min-height: 54px;
  align-items: center;
  gap: 11px;
  padding: 9px 10px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.025);
}

.pending-invite-card__icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.7);
}

.pending-invite-card__content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.pending-invite-card__content strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-invite-card__content span {
  color: rgba(255, 255, 255, 0.42);
  font-size: 10px;
}

.pending-invite-card button {
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.pending-invite-card button:hover {
  color: #ffffff;
}
EOF

# ------------------------------------------------------------
# Incoming invitation card
# ------------------------------------------------------------

cat > src/components/collaboration/IncomingInviteCard.tsx <<'EOF'
import type {
  IncomingCollaborationInvitation,
} from "../../collaboration/invitationTypes";

import "./IncomingInviteCard.css";

type IncomingInviteCardProps = {
  invitation: IncomingCollaborationInvitation;
  onAccept: (
    invitationId: string,
  ) => void;
  onDecline: (
    invitationId: string,
  ) => void;
};

export default function IncomingInviteCard({
  invitation,
  onAccept,
  onDecline,
}: IncomingInviteCardProps) {
  return (
    <article className="incoming-invite-card">
      <div className="incoming-invite-card__heading">
        <span>Invitation</span>

        <strong>
          {invitation.sessionName}
        </strong>

        <p>
          {invitation.inviterName} invited you
          to collaborate.
        </p>
      </div>

      <div className="incoming-invite-card__actions">
        <button
          type="button"
          className="incoming-invite-card__decline"
          onClick={() =>
            onDecline(invitation.id)
          }
        >
          Decline
        </button>

        <button
          type="button"
          className="incoming-invite-card__accept"
          onClick={() =>
            onAccept(invitation.id)
          }
        >
          Join
        </button>
      </div>
    </article>
  );
}
EOF

cat > src/components/collaboration/IncomingInviteCard.css <<'EOF'
.incoming-invite-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.06);
}

.incoming-invite-card__heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.incoming-invite-card__heading span {
  color: rgba(255, 255, 255, 0.42);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.incoming-invite-card__heading strong {
  font-size: 13px;
}

.incoming-invite-card__heading p {
  margin: 2px 0 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 11px;
  line-height: 1.45;
}

.incoming-invite-card__actions {
  display: flex;
  gap: 8px;
}

.incoming-invite-card__actions button {
  min-height: 34px;
  flex: 1;
  border-radius: 10px;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.incoming-invite-card__decline {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: #ffffff;
}

.incoming-invite-card__accept {
  border: 0;
  background: #ffffff;
  color: #111113;
}
EOF

# ------------------------------------------------------------
# Share-session panel
# ------------------------------------------------------------

cat > src/components/collaboration/ShareSessionPanel.tsx <<'EOF'
import {
  useMemo,
  useState,
} from "react";

import {
  getCollaborationSessionLink,
} from "../../collaboration/sessionLinks";

import "./ShareSessionPanel.css";

type ShareSessionPanelProps = {
  sessionId: string;
};

export default function ShareSessionPanel({
  sessionId,
}: ShareSessionPanelProps) {
  const [copied, setCopied] =
    useState(false);

  const sessionLink = useMemo(
    () =>
      getCollaborationSessionLink(
        sessionId,
      ),
    [sessionId],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        sessionLink,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      const input =
        document.createElement("textarea");

      input.value = sessionLink;
      input.style.position = "fixed";
      input.style.opacity = "0";

      document.body.appendChild(input);

      input.select();
      document.execCommand("copy");
      input.remove();

      setCopied(true);
    }
  };

  return (
    <div className="share-session-panel">
      <div className="share-session-panel__label">
        <span>Share link</span>
        <small>
          Session {sessionId.slice(0, 8)}
        </small>
      </div>

      <button
        type="button"
        onClick={copyLink}
      >
        {copied ? "Copied" : "Copy Link"}
      </button>
    </div>
  );
}
EOF

cat > src/components/collaboration/ShareSessionPanel.css <<'EOF'
.share-session-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
}

.share-session-panel__label {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.share-session-panel__label span {
  font-size: 11px;
  font-weight: 600;
}

.share-session-panel__label small {
  color: rgba(255, 255, 255, 0.4);
  font-size: 9px;
}

.share-session-panel button {
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 10px;
  background: transparent;
  color: #ffffff;
  font: inherit;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}
EOF

# ------------------------------------------------------------
# Invite dialog
# ------------------------------------------------------------

cat > src/components/collaboration/InviteDialog.tsx <<'EOF'
import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import "./InviteDialog.css";

type InviteDialogProps = {
  onClose: () => void;
  onInvite: (
    username: string,
  ) => void;
};

export default function InviteDialog({
  onClose,
  onInvite,
}: InviteDialogProps) {
  const [username, setUsername] =
    useState("");

  const inputRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
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
  }, [onClose]);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const value = username.trim();

    if (!value) {
      return;
    }

    onInvite(value);
  };

  return (
    <div
      className="invite-dialog-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="invite-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-dialog-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="invite-dialog__header">
          <div>
            <p>Shared Playground</p>

            <h2 id="invite-dialog-title">
              Invite People
            </h2>
          </div>

          <button
            className="invite-dialog__close"
            type="button"
            aria-label="Close invite dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form
          className="invite-dialog__form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="collaborator-username">
            Username
          </label>

          <input
            ref={inputRef}
            id="collaborator-username"
            value={username}
            placeholder="Search by username..."
            autoComplete="off"
            onChange={(event) =>
              setUsername(
                event.target.value,
              )
            }
          />

          <p className="invite-dialog__hint">
            The invitation stays pending until
            the person accepts it.
          </p>

          <div className="invite-dialog__actions">
            <button
              className="invite-dialog__cancel"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="invite-dialog__submit"
              type="submit"
              disabled={!username.trim()}
            >
              Send Invite
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
EOF

# ------------------------------------------------------------
# Collaboration panel
# ------------------------------------------------------------

cat > src/components/collaboration/CollaborationPanel.tsx <<'EOF'
import {
  useCollaborationSession,
} from "../../collaboration/CollaborationSessionContext";

import {
  createCollaborationSessionId,
} from "../../collaboration/sessionLinks";

import CollaboratorCard from "./CollaboratorCard";
import IncomingInviteCard from "./IncomingInviteCard";
import InviteDialog from "./InviteDialog";
import PendingInviteCard from "./PendingInviteCard";
import SessionBadge from "./SessionBadge";
import ShareSessionPanel from "./ShareSessionPanel";

import "./CollaborationPanel.css";

export default function CollaborationPanel() {
  const {
    session,
    inviteDialogOpen,
    openInviteDialog,
    closeInviteDialog,
    inviteParticipant,
    cancelInvitation,
    receiveInvitation,
    acceptInvitation,
    declineInvitation,
    removeParticipant,
  } = useCollaborationSession();

  const createTestInvitation = () => {
    receiveInvitation({
      id: createCollaborationSessionId(),
      sessionId:
        createCollaborationSessionId(),
      sessionName: "Creative Session",
      inviterId: "demo-owner",
      inviterName: "Alex",
      createdAt: Date.now(),
    });
  };

  return (
    <>
      <aside
        className="collaboration-panel"
        aria-label="Collaboration"
      >
        <div className="collaboration-panel__header">
          <div>
            <p className="collaboration-panel__eyebrow">
              Playground
            </p>

            <h3>Collaboration</h3>

            <span className="collaboration-panel__session-name">
              {session.name}
            </span>
          </div>

          <SessionBadge
            shared={session.isShared}
          />
        </div>

        {session.incomingInvitations.length >
          0 && (
          <section className="collaboration-panel__section">
            <div className="collaboration-panel__section-heading">
              <span>Invitations</span>

              <small>
                {
                  session
                    .incomingInvitations
                    .length
                }
              </small>
            </div>

            <div className="collaboration-panel__stack">
              {session.incomingInvitations.map(
                (invitation) => (
                  <IncomingInviteCard
                    key={invitation.id}
                    invitation={invitation}
                    onAccept={
                      acceptInvitation
                    }
                    onDecline={
                      declineInvitation
                    }
                  />
                ),
              )}
            </div>
          </section>
        )}

        <ShareSessionPanel
          sessionId={session.id}
        />

        <section className="collaboration-panel__section">
          <div className="collaboration-panel__section-heading">
            <span>People</span>

            <small>
              {session.participants.length}
            </small>
          </div>

          <div className="collaboration-panel__participants">
            {session.participants.map(
              (participant) => (
                <CollaboratorCard
                  key={participant.id}
                  participant={participant}
                  onRemove={
                    removeParticipant
                  }
                />
              ),
            )}
          </div>
        </section>

        {session.pendingInvitations.length >
          0 && (
          <section className="collaboration-panel__section">
            <div className="collaboration-panel__section-heading">
              <span>Pending</span>

              <small>
                {
                  session
                    .pendingInvitations
                    .length
                }
              </small>
            </div>

            <div className="collaboration-panel__stack">
              {session.pendingInvitations.map(
                (invitation) => (
                  <PendingInviteCard
                    key={invitation.id}
                    invitation={invitation}
                    onCancel={
                      cancelInvitation
                    }
                  />
                ),
              )}
            </div>
          </section>
        )}

        <button
          className="collaboration-panel__invite-button"
          type="button"
          onClick={openInviteDialog}
        >
          Invite People
        </button>

        {import.meta.env.DEV && (
          <button
            className="collaboration-panel__test-button"
            type="button"
            onClick={createTestInvitation}
          >
            Test Incoming Invite
          </button>
        )}
      </aside>

      {inviteDialogOpen && (
        <InviteDialog
          onClose={closeInviteDialog}
          onInvite={inviteParticipant}
        />
      )}
    </>
  );
}
EOF

# ------------------------------------------------------------
# Collaboration panel styles
# ------------------------------------------------------------

cat > src/components/collaboration/CollaborationPanel.css <<'EOF'
.collaboration-panel {
  display: flex;
  width: min(340px, calc(100vw - 32px));
  max-height: min(760px, calc(100vh - 32px));
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 22px;
  background: rgba(18, 18, 20, 0.92);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  color: #f7f7f7;
  backdrop-filter: blur(24px);
}

.collaboration-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.collaboration-panel__header h3 {
  margin: 3px 0 0;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.collaboration-panel__eyebrow {
  margin: 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.collaboration-panel__session-name {
  display: block;
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.42);
  font-size: 10px;
}

.collaboration-panel__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.collaboration-panel__section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
}

.collaboration-panel__section-heading span {
  color: rgba(255, 255, 255, 0.52);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.collaboration-panel__section-heading small {
  display: grid;
  min-width: 19px;
  height: 19px;
  place-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-size: 9px;
}

.collaboration-panel__participants,
.collaboration-panel__stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.collaboration-panel__invite-button {
  min-height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  background: #f5f5f5;
  color: #111113;
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform 160ms ease,
    opacity 160ms ease;
}

.collaboration-panel__invite-button:hover {
  transform: translateY(-1px);
}

.collaboration-panel__invite-button:active {
  transform: scale(0.985);
}

.collaboration-panel__test-button {
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.34);
  font: inherit;
  font-size: 9px;
  cursor: pointer;
}

.collaboration-panel__test-button:hover {
  color: rgba(255, 255, 255, 0.68);
}
EOF

touch "$MARKER"

echo ""
echo "Running build..."
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
echo "Added:"
echo "  Shared session IDs"
echo "  Shareable collaboration links"
echo "  Pending invitation tracking"
echo "  Incoming invitation handling"
echo "  Accept, decline, and cancel actions"
echo "  Persistent collaboration session state"
echo "  Development invite simulator"
