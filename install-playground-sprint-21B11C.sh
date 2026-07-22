#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.11C"
MARKER=".playground-sprint-21B11C-installed"
BACKUP_DIR=".playground-backups/sprint-21B11C-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the worlds project root."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/dashboard

FILES_TO_BACK_UP=(
  "src/main.tsx"
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

    rm -rf src/collaboration/dashboard
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Dashboard types
# ------------------------------------------------------------

cat > src/collaboration/dashboard/types.ts <<'EOF'
export type CollaboratorStatus =
  | "online"
  | "idle"
  | "disconnected";

export type CollaborationConnectionStatus =
  | "connected"
  | "connecting"
  | "offline";

export type CollaborationUser = {
  id: string;
  name: string;
  status: CollaboratorStatus;
  isLocal?: boolean;
  lastSeenAt?: number;
  activeObjectId?: string;
  activeObjectName?: string;
};

export type CollaborationLock = {
  objectId: string;
  objectName?: string;
  userId: string;
  userName: string;
  acquiredAt?: number;
};

export type CollaborationDashboardSnapshot = {
  connectionStatus?:
    CollaborationConnectionStatus;
  users?: CollaborationUser[];
  locks?: CollaborationLock[];
  updatedAt?: number;
};
EOF

# ------------------------------------------------------------
# Dashboard events
# ------------------------------------------------------------

cat > src/collaboration/dashboard/events.ts <<'EOF'
export const PLAYGROUND_COLLABORATION_REQUEST_EVENT =
  "playground:collaboration-request";

export const PLAYGROUND_COLLABORATION_SNAPSHOT_EVENT =
  "playground:collaboration-snapshot";

export const PLAYGROUND_COLLABORATION_USER_JOINED_EVENT =
  "playground:collaboration-user-joined";

export const PLAYGROUND_COLLABORATION_USER_UPDATED_EVENT =
  "playground:collaboration-user-updated";

export const PLAYGROUND_COLLABORATION_USER_LEFT_EVENT =
  "playground:collaboration-user-left";

export const PLAYGROUND_COLLABORATION_LOCK_UPDATED_EVENT =
  "playground:collaboration-lock-updated";

export const PLAYGROUND_COLLABORATION_CONNECTION_EVENT =
  "playground:collaboration-connection";
EOF

# ------------------------------------------------------------
# Collaboration dashboard
# ------------------------------------------------------------

cat > src/collaboration/dashboard/CollaborationDashboard.tsx <<'EOF'
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  PLAYGROUND_COLLABORATION_CONNECTION_EVENT,
  PLAYGROUND_COLLABORATION_LOCK_UPDATED_EVENT,
  PLAYGROUND_COLLABORATION_REQUEST_EVENT,
  PLAYGROUND_COLLABORATION_SNAPSHOT_EVENT,
  PLAYGROUND_COLLABORATION_USER_JOINED_EVENT,
  PLAYGROUND_COLLABORATION_USER_LEFT_EVENT,
  PLAYGROUND_COLLABORATION_USER_UPDATED_EVENT,
} from "./events";

import type {
  CollaborationConnectionStatus,
  CollaborationDashboardSnapshot,
  CollaborationLock,
  CollaborationUser,
} from "./types";

import "./collaboration-dashboard.css";

const LOCAL_USER_ID =
  "playground-local-user";

const LOCAL_USER_NAME =
  "You";

function getInitialLocalUser():
  CollaborationUser {
  return {
    id:
      LOCAL_USER_ID,
    name:
      LOCAL_USER_NAME,
    status:
      "online",
    isLocal:
      true,
    lastSeenAt:
      Date.now(),
  };
}

function mergeUser(
  users: CollaborationUser[],
  incoming: CollaborationUser,
): CollaborationUser[] {
  const existingIndex =
    users.findIndex(
      (user) =>
        user.id === incoming.id,
    );

  if (existingIndex === -1) {
    return [
      ...users,
      incoming,
    ];
  }

  return users.map(
    (user, index) =>
      index === existingIndex
        ? {
            ...user,
            ...incoming,
          }
        : user,
  );
}

function mergeLock(
  locks: CollaborationLock[],
  incoming:
    CollaborationLock | null,
  objectId?: string,
): CollaborationLock[] {
  const resolvedObjectId =
    incoming
      ? incoming.objectId
      : objectId;

  if (!resolvedObjectId) {
    return locks;
  }

  const withoutExisting =
    locks.filter(
      (lock) =>
        lock.objectId !==
        resolvedObjectId,
    );

  if (!incoming) {
    return withoutExisting;
  }

  return [
    ...withoutExisting,
    incoming,
  ];
}

function formatRelativeTime(
  timestamp?: number,
): string {
  if (!timestamp) {
    return "Unknown";
  }

  const difference =
    Date.now() - timestamp;

  if (difference < 10_000) {
    return "Just now";
  }

  const minutes =
    Math.floor(
      difference / 60_000,
    );

  if (minutes < 1) {
    return "Less than a minute ago";
  }

  if (minutes === 1) {
    return "1 minute ago";
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours === 1) {
    return "1 hour ago";
  }

  if (hours < 24) {
    return `${hours} hours ago`;
  }

  return new Date(timestamp)
    .toLocaleDateString();
}

function getInitials(
  name: string,
): string {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[1].charAt(0)
  ).toUpperCase();
}

function getStatusLabel(
  status:
    CollaborationUser["status"],
): string {
  switch (status) {
    case "online":
      return "Online";

    case "idle":
      return "Idle";

    case "disconnected":
    default:
      return "Disconnected";
  }
}

function getConnectionLabel(
  status:
    CollaborationConnectionStatus,
): string {
  switch (status) {
    case "connected":
      return "Connected";

    case "connecting":
      return "Connecting";

    case "offline":
    default:
      return "Offline";
  }
}

export default function CollaborationDashboard() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    connectionStatus,
    setConnectionStatus,
  ] = useState<
    CollaborationConnectionStatus
  >("connected");

  const [
    users,
    setUsers,
  ] = useState<
    CollaborationUser[]
  >([
    getInitialLocalUser(),
  ]);

  const [
    locks,
    setLocks,
  ] = useState<
    CollaborationLock[]
  >([]);

  const [
    lastUpdatedAt,
    setLastUpdatedAt,
  ] = useState(
    Date.now(),
  );

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      const modifier =
        event.metaKey ||
        event.ctrlKey;

      if (
        modifier &&
        event.key.toLowerCase() ===
          "l"
      ) {
        event.preventDefault();

        setIsOpen(
          (current) => !current,
        );
      }

      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
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
  }, []);

  useEffect(() => {
    const handleSnapshot = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          CollaborationDashboardSnapshot
        >;

      const snapshot =
        customEvent.detail;

      if (!snapshot) {
        return;
      }

      if (
        snapshot.connectionStatus
      ) {
        setConnectionStatus(
          snapshot.connectionStatus,
        );
      }

      if (
        Array.isArray(
          snapshot.users,
        )
      ) {
        const hasLocalUser =
          snapshot.users.some(
            (user) =>
              user.isLocal ||
              user.id ===
                LOCAL_USER_ID,
          );

        setUsers(
          hasLocalUser
            ? snapshot.users
            : [
                getInitialLocalUser(),
                ...snapshot.users,
              ],
        );
      }

      if (
        Array.isArray(
          snapshot.locks,
        )
      ) {
        setLocks(
          snapshot.locks,
        );
      }

      setLastUpdatedAt(
        snapshot.updatedAt ||
        Date.now(),
      );
    };

    const handleUserJoined = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          CollaborationUser
        >;

      if (!customEvent.detail) {
        return;
      }

      setUsers(
        (current) =>
          mergeUser(
            current,
            {
              ...customEvent.detail,
              status:
                customEvent.detail
                  .status ||
                "online",
              lastSeenAt:
                customEvent.detail
                  .lastSeenAt ||
                Date.now(),
            },
          ),
      );

      setLastUpdatedAt(
        Date.now(),
      );
    };

    const handleUserUpdated = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          CollaborationUser
        >;

      if (!customEvent.detail) {
        return;
      }

      setUsers(
        (current) =>
          mergeUser(
            current,
            customEvent.detail,
          ),
      );

      setLastUpdatedAt(
        Date.now(),
      );
    };

    const handleUserLeft = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          id?: string;
          userId?: string;
        }>;

      const userId =
        customEvent.detail
          ?.userId ||
        customEvent.detail
          ?.id;

      if (!userId) {
        return;
      }

      setUsers(
        (current) =>
          current.map(
            (user) =>
              user.id === userId
                ? {
                    ...user,
                    status:
                      "disconnected",
                    activeObjectId:
                      undefined,
                    activeObjectName:
                      undefined,
                    lastSeenAt:
                      Date.now(),
                  }
                : user,
          ),
      );

      setLocks(
        (current) =>
          current.filter(
            (lock) =>
              lock.userId !==
              userId,
          ),
      );

      setLastUpdatedAt(
        Date.now(),
      );
    };

    const handleLockUpdated = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          lock?:
            CollaborationLock |
            null;
          objectId?: string;
        }>;

      setLocks(
        (current) =>
          mergeLock(
            current,
            customEvent.detail
              ?.lock ||
              null,
            customEvent.detail
              ?.objectId,
          ),
      );

      setLastUpdatedAt(
        Date.now(),
      );
    };

    const handleConnection = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          status?:
            CollaborationConnectionStatus;
        }>;

      if (
        customEvent.detail
          ?.status
      ) {
        setConnectionStatus(
          customEvent.detail
            .status,
        );

        setLastUpdatedAt(
          Date.now(),
        );
      }
    };

    document.addEventListener(
      PLAYGROUND_COLLABORATION_SNAPSHOT_EVENT,
      handleSnapshot,
    );

    document.addEventListener(
      PLAYGROUND_COLLABORATION_USER_JOINED_EVENT,
      handleUserJoined,
    );

    document.addEventListener(
      PLAYGROUND_COLLABORATION_USER_UPDATED_EVENT,
      handleUserUpdated,
    );

    document.addEventListener(
      PLAYGROUND_COLLABORATION_USER_LEFT_EVENT,
      handleUserLeft,
    );

    document.addEventListener(
      PLAYGROUND_COLLABORATION_LOCK_UPDATED_EVENT,
      handleLockUpdated,
    );

    document.addEventListener(
      PLAYGROUND_COLLABORATION_CONNECTION_EVENT,
      handleConnection,
    );

    document.dispatchEvent(
      new CustomEvent(
        PLAYGROUND_COLLABORATION_REQUEST_EVENT,
      ),
    );

    return () => {
      document.removeEventListener(
        PLAYGROUND_COLLABORATION_SNAPSHOT_EVENT,
        handleSnapshot,
      );

      document.removeEventListener(
        PLAYGROUND_COLLABORATION_USER_JOINED_EVENT,
        handleUserJoined,
      );

      document.removeEventListener(
        PLAYGROUND_COLLABORATION_USER_UPDATED_EVENT,
        handleUserUpdated,
      );

      document.removeEventListener(
        PLAYGROUND_COLLABORATION_USER_LEFT_EVENT,
        handleUserLeft,
      );

      document.removeEventListener(
        PLAYGROUND_COLLABORATION_LOCK_UPDATED_EVENT,
        handleLockUpdated,
      );

      document.removeEventListener(
        PLAYGROUND_COLLABORATION_CONNECTION_EVENT,
        handleConnection,
      );
    };
  }, []);

  const sortedUsers =
    useMemo(
      () =>
        users
          .slice()
          .sort(
            (
              left,
              right,
            ) => {
              if (
                Boolean(
                  left.isLocal,
                ) !==
                Boolean(
                  right.isLocal,
                )
              ) {
                return left.isLocal
                  ? -1
                  : 1;
              }

              const statusRank = {
                online: 0,
                idle: 1,
                disconnected: 2,
              };

              const difference =
                statusRank[
                  left.status
                ] -
                statusRank[
                  right.status
                ];

              if (
                difference !== 0
              ) {
                return difference;
              }

              return left.name
                .localeCompare(
                  right.name,
                );
            },
          ),
      [users],
    );

  const connectedCount =
    users.filter(
      (user) =>
        user.status !==
        "disconnected",
    ).length;

  const activeEditors =
    users.filter(
      (user) =>
        Boolean(
          user.activeObjectId ||
          user.activeObjectName,
        ),
    );

  return (
    <>
      <button
        type="button"
        className="playground-collaboration-launcher"
        onClick={() => {
          setIsOpen(true);
        }}
        title="Collaboration — Command/Ctrl + L"
        aria-label="Open collaboration dashboard"
      >
        <span
          className={`playground-collaboration-launcher__status playground-collaboration-launcher__status--${connectionStatus}`}
          aria-hidden="true"
        />

        <span>
          Collaborate
        </span>

        <span className="playground-collaboration-launcher__count">
          {connectedCount}
        </span>
      </button>

      {isOpen && (
        <div
          className="playground-collaboration-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsOpen(false);
            }
          }}
        >
          <section
            className="playground-collaboration-dashboard"
            role="dialog"
            aria-modal="true"
            aria-label="Collaboration Dashboard"
          >
            <header className="playground-collaboration-dashboard__header">
              <div>
                <p className="playground-collaboration-dashboard__eyebrow">
                  Shared World
                </p>

                <h2>
                  Collaboration
                </h2>
              </div>

              <div className="playground-collaboration-dashboard__header-actions">
                <div
                  className={`playground-collaboration-dashboard__connection playground-collaboration-dashboard__connection--${connectionStatus}`}
                >
                  <span
                    aria-hidden="true"
                  />

                  {getConnectionLabel(
                    connectionStatus,
                  )}
                </div>

                <button
                  type="button"
                  className="playground-collaboration-dashboard__close"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  aria-label="Close collaboration dashboard"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="playground-collaboration-dashboard__summary">
              <div>
                <strong>
                  {connectedCount}
                </strong>

                <span>
                  Connected
                </span>
              </div>

              <div>
                <strong>
                  {
                    activeEditors.length
                  }
                </strong>

                <span>
                  Editing
                </span>
              </div>

              <div>
                <strong>
                  {locks.length}
                </strong>

                <span>
                  Locked
                </span>
              </div>

              <div className="playground-collaboration-dashboard__updated">
                Updated{" "}
                {formatRelativeTime(
                  lastUpdatedAt,
                )}
              </div>
            </div>

            <div className="playground-collaboration-dashboard__body">
              <section className="playground-collaboration-dashboard__people">
                <div className="playground-collaboration-dashboard__section-heading">
                  <div>
                    <p>
                      Workspace
                    </p>

                    <h3>
                      People
                    </h3>
                  </div>

                  <span>
                    {users.length}
                  </span>
                </div>

                <div className="playground-collaboration-dashboard__user-list">
                  {sortedUsers.map(
                    (user) => (
                      <article
                        key={
                          user.id
                        }
                        className={`playground-collaboration-user playground-collaboration-user--${user.status}`}
                      >
                        <div className="playground-collaboration-user__avatar">
                          {getInitials(
                            user.name,
                          )}

                          <span
                            className={`playground-collaboration-user__presence playground-collaboration-user__presence--${user.status}`}
                            aria-hidden="true"
                          />
                        </div>

                        <div className="playground-collaboration-user__identity">
                          <div>
                            <strong>
                              {user.name}
                            </strong>

                            {user.isLocal && (
                              <span>
                                You
                              </span>
                            )}
                          </div>

                          <small>
                            {user.activeObjectName ||
                            user.activeObjectId
                              ? `Editing ${
                                  user.activeObjectName ||
                                  user.activeObjectId
                                }`
                              : getStatusLabel(
                                  user.status,
                                )}
                          </small>
                        </div>

                        <div className="playground-collaboration-user__last-seen">
                          {user.status ===
                          "online"
                            ? "Now"
                            : formatRelativeTime(
                                user.lastSeenAt,
                              )}
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </section>

              <aside className="playground-collaboration-dashboard__activity">
                <section>
                  <div className="playground-collaboration-dashboard__section-heading">
                    <div>
                      <p>
                        Live
                      </p>

                      <h3>
                        Active Editing
                      </h3>
                    </div>

                    <span>
                      {
                        activeEditors.length
                      }
                    </span>
                  </div>

                  {activeEditors.length ===
                  0 ? (
                    <div className="playground-collaboration-dashboard__empty">
                      Nobody is actively editing an object.
                    </div>
                  ) : (
                    <div className="playground-collaboration-dashboard__activity-list">
                      {activeEditors.map(
                        (user) => (
                          <article
                            key={
                              user.id
                            }
                          >
                            <span
                              aria-hidden="true"
                            >
                              ✎
                            </span>

                            <div>
                              <strong>
                                {user.activeObjectName ||
                                  user.activeObjectId}
                              </strong>

                              <small>
                                Edited by{" "}
                                {user.name}
                              </small>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </section>

                <section>
                  <div className="playground-collaboration-dashboard__section-heading">
                    <div>
                      <p>
                        Protection
                      </p>

                      <h3>
                        Object Locks
                      </h3>
                    </div>

                    <span>
                      {locks.length}
                    </span>
                  </div>

                  {locks.length ===
                  0 ? (
                    <div className="playground-collaboration-dashboard__empty">
                      No objects are currently locked.
                    </div>
                  ) : (
                    <div className="playground-collaboration-dashboard__lock-list">
                      {locks.map(
                        (lock) => (
                          <article
                            key={
                              lock.objectId
                            }
                          >
                            <span
                              aria-hidden="true"
                            >
                              ◈
                            </span>

                            <div>
                              <strong>
                                {lock.objectName ||
                                  lock.objectId}
                              </strong>

                              <small>
                                Locked by{" "}
                                {lock.userName}
                              </small>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </section>
              </aside>
            </div>

            <footer className="playground-collaboration-dashboard__footer">
              <span>
                Presence updates automatically as collaborators connect and edit.
              </span>

              <span>
                ⌘L
              </span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
EOF

# ------------------------------------------------------------
# Collaboration dashboard styling
# ------------------------------------------------------------

cat > src/collaboration/dashboard/collaboration-dashboard.css <<'EOF'
.playground-collaboration-launcher {
  position: fixed;
  right: 18px;
  bottom: 176px;
  z-index: 9998;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid
    rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  background:
    rgba(18, 18, 20, 0.94);
  color:
    rgba(255, 255, 255, 0.9);
  font:
    650 12px/1
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  cursor: pointer;
  box-shadow:
    0 12px 36px
    rgba(0, 0, 0, 0.32);
  backdrop-filter:
    blur(18px);
}

.playground-collaboration-launcher:hover {
  background:
    rgba(28, 28, 31, 0.98);
  transform:
    translateY(-1px);
}

.playground-collaboration-launcher__status {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.35);
}

.playground-collaboration-launcher__status--connected {
  background: #72dc8e;
  box-shadow:
    0 0 0 3px
    rgba(114, 220, 142, 0.11);
}

.playground-collaboration-launcher__status--connecting {
  background: #f0c66a;
}

.playground-collaboration-launcher__status--offline {
  background: #ef7777;
}

.playground-collaboration-launcher__count {
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  margin-left: 2px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.08);
  color:
    rgba(255, 255, 255, 0.62);
  font-size: 9px;
}

.playground-collaboration-overlay {
  position: fixed;
  inset: 0;
  z-index: 12200;
  display: grid;
  place-items: center;
  padding: 28px;
  background:
    rgba(0, 0, 0, 0.54);
  backdrop-filter:
    blur(16px);
  animation:
    playground-collaboration-fade
    160ms ease-out;
}

.playground-collaboration-dashboard {
  width:
    min(980px, 96vw);
  height:
    min(700px, 88vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid
    rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  background:
    rgba(14, 14, 16, 0.98);
  color: #fff;
  box-shadow:
    0 36px 100px
    rgba(0, 0, 0, 0.58);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  animation:
    playground-collaboration-rise
    210ms
    cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}

.playground-collaboration-dashboard__header {
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.08);
}

.playground-collaboration-dashboard__eyebrow {
  margin: 0 0 4px;
  color:
    rgba(255, 255, 255, 0.4);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.playground-collaboration-dashboard__header h2 {
  margin: 0;
  font-size: 25px;
  font-weight: 680;
  letter-spacing: -0.035em;
}

.playground-collaboration-dashboard__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.playground-collaboration-dashboard__connection {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.54);
  font-size: 11px;
}

.playground-collaboration-dashboard__connection span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.34);
}

.playground-collaboration-dashboard__connection--connected {
  color: #a8efbb;
  background:
    rgba(62, 180, 95, 0.12);
}

.playground-collaboration-dashboard__connection--connected span {
  background: #75da91;
}

.playground-collaboration-dashboard__connection--connecting {
  color: #f0d28b;
  background:
    rgba(210, 164, 63, 0.12);
}

.playground-collaboration-dashboard__connection--connecting span {
  background: #e6bd60;
}

.playground-collaboration-dashboard__connection--offline {
  color: #ffb4b4;
  background:
    rgba(221, 70, 70, 0.13);
}

.playground-collaboration-dashboard__connection--offline span {
  background: #f07b7b;
}

.playground-collaboration-dashboard__close {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.07);
  color:
    rgba(255, 255, 255, 0.72);
  font-size: 20px;
  cursor: pointer;
}

.playground-collaboration-dashboard__close:hover {
  background:
    rgba(255, 255, 255, 0.12);
  color: #fff;
}

.playground-collaboration-dashboard__summary {
  min-height: 70px;
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 12px 24px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.07);
}

.playground-collaboration-dashboard__summary > div:not(
  .playground-collaboration-dashboard__updated
) {
  display: grid;
  gap: 3px;
}

.playground-collaboration-dashboard__summary strong {
  font-size: 17px;
  font-weight: 680;
}

.playground-collaboration-dashboard__summary span {
  color:
    rgba(255, 255, 255, 0.37);
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.playground-collaboration-dashboard__updated {
  margin-left: auto;
  color:
    rgba(255, 255, 255, 0.35);
  font-size: 10px;
}

.playground-collaboration-dashboard__body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    330px;
}

.playground-collaboration-dashboard__people {
  min-width: 0;
  overflow-y: auto;
  padding: 20px;
}

.playground-collaboration-dashboard__activity {
  min-width: 0;
  overflow-y: auto;
  padding: 20px;
  border-left: 1px solid
    rgba(255, 255, 255, 0.07);
  background:
    rgba(255, 255, 255, 0.016);
}

.playground-collaboration-dashboard__activity section + section {
  margin-top: 28px;
}

.playground-collaboration-dashboard__section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 13px;
}

.playground-collaboration-dashboard__section-heading p {
  margin: 0 0 3px;
  color:
    rgba(255, 255, 255, 0.32);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.playground-collaboration-dashboard__section-heading h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
}

.playground-collaboration-dashboard__section-heading > span {
  min-width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.06);
  color:
    rgba(255, 255, 255, 0.43);
  font-size: 9px;
}

.playground-collaboration-dashboard__user-list {
  display: grid;
  gap: 7px;
}

.playground-collaboration-user {
  display: grid;
  grid-template-columns:
    auto
    minmax(0, 1fr)
    auto;
  align-items: center;
  gap: 12px;
  min-height: 65px;
  padding: 10px 12px;
  border: 1px solid
    rgba(255, 255, 255, 0.055);
  border-radius: 14px;
  background:
    rgba(255, 255, 255, 0.025);
}

.playground-collaboration-user:hover {
  background:
    rgba(255, 255, 255, 0.048);
}

.playground-collaboration-user--disconnected {
  opacity: 0.57;
}

.playground-collaboration-user__avatar {
  position: relative;
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.12),
      rgba(255, 255, 255, 0.045)
    );
  color:
    rgba(255, 255, 255, 0.82);
  font-size: 11px;
  font-weight: 700;
}

.playground-collaboration-user__presence {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 10px;
  height: 10px;
  border: 2px solid
    #151517;
  border-radius: 50%;
}

.playground-collaboration-user__presence--online {
  background: #70d98c;
}

.playground-collaboration-user__presence--idle {
  background: #e7bd63;
}

.playground-collaboration-user__presence--disconnected {
  background: #79797d;
}

.playground-collaboration-user__identity {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.playground-collaboration-user__identity > div {
  display: flex;
  align-items: center;
  gap: 7px;
}

.playground-collaboration-user__identity strong {
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 630;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-collaboration-user__identity span {
  padding: 3px 6px;
  border-radius: 999px;
  background:
    rgba(255, 255, 255, 0.07);
  color:
    rgba(255, 255, 255, 0.42);
  font-size: 8px;
  text-transform: uppercase;
}

.playground-collaboration-user__identity small {
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.39);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-collaboration-user__last-seen {
  color:
    rgba(255, 255, 255, 0.3);
  font-size: 9px;
}

.playground-collaboration-dashboard__activity-list,
.playground-collaboration-dashboard__lock-list {
  display: grid;
  gap: 7px;
}

.playground-collaboration-dashboard__activity-list article,
.playground-collaboration-dashboard__lock-list article {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 54px;
  padding: 10px;
  border: 1px solid
    rgba(255, 255, 255, 0.055);
  border-radius: 12px;
  background:
    rgba(255, 255, 255, 0.025);
}

.playground-collaboration-dashboard__activity-list article > span,
.playground-collaboration-dashboard__lock-list article > span {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 9px;
  background:
    rgba(255, 255, 255, 0.06);
  color:
    rgba(255, 255, 255, 0.52);
  font-size: 13px;
}

.playground-collaboration-dashboard__activity-list article > div,
.playground-collaboration-dashboard__lock-list article > div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.playground-collaboration-dashboard__activity-list strong,
.playground-collaboration-dashboard__lock-list strong {
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.83);
  font-size: 10px;
  font-weight: 620;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-collaboration-dashboard__activity-list small,
.playground-collaboration-dashboard__lock-list small {
  color:
    rgba(255, 255, 255, 0.34);
  font-size: 8px;
}

.playground-collaboration-dashboard__empty {
  min-height: 72px;
  display: grid;
  place-items: center;
  padding: 14px;
  border: 1px dashed
    rgba(255, 255, 255, 0.075);
  border-radius: 12px;
  color:
    rgba(255, 255, 255, 0.3);
  font-size: 9px;
  line-height: 1.5;
  text-align: center;
}

.playground-collaboration-dashboard__footer {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 24px;
  border-top: 1px solid
    rgba(255, 255, 255, 0.07);
  color:
    rgba(255, 255, 255, 0.3);
  font-size: 9px;
}

@keyframes playground-collaboration-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes playground-collaboration-rise {
  from {
    opacity: 0;
    transform:
      translateY(16px)
      scale(0.985);
  }

  to {
    opacity: 1;
    transform:
      translateY(0)
      scale(1);
  }
}

@media (max-width: 820px) {
  .playground-collaboration-dashboard__body {
    grid-template-columns: 1fr;
  }

  .playground-collaboration-dashboard__activity {
    display: none;
  }
}

@media (max-width: 620px) {
  .playground-collaboration-overlay {
    padding: 10px;
  }

  .playground-collaboration-dashboard {
    width: 100%;
    height: 94vh;
    border-radius: 18px;
  }

  .playground-collaboration-dashboard__header {
    padding: 16px;
  }

  .playground-collaboration-dashboard__connection {
    display: none;
  }

  .playground-collaboration-dashboard__summary {
    gap: 18px;
    padding-right: 16px;
    padding-left: 16px;
  }

  .playground-collaboration-dashboard__updated {
    display: none;
  }

  .playground-collaboration-dashboard__people {
    padding: 16px;
  }

  .playground-collaboration-launcher {
    right: 10px;
    bottom: 168px;
  }
}
EOF

# ------------------------------------------------------------
# Public exports
# ------------------------------------------------------------

cat > src/collaboration/dashboard/index.ts <<'EOF'
export {
  default as CollaborationDashboard,
} from "./CollaborationDashboard";

export {
  PLAYGROUND_COLLABORATION_CONNECTION_EVENT,
  PLAYGROUND_COLLABORATION_LOCK_UPDATED_EVENT,
  PLAYGROUND_COLLABORATION_REQUEST_EVENT,
  PLAYGROUND_COLLABORATION_SNAPSHOT_EVENT,
  PLAYGROUND_COLLABORATION_USER_JOINED_EVENT,
  PLAYGROUND_COLLABORATION_USER_LEFT_EVENT,
  PLAYGROUND_COLLABORATION_USER_UPDATED_EVENT,
} from "./events";

export type {
  CollaborationConnectionStatus,
  CollaborationDashboardSnapshot,
  CollaborationLock,
  CollaborationUser,
  CollaboratorStatus,
} from "./types";
EOF

# ------------------------------------------------------------
# Mount CollaborationDashboard in main.tsx
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
        keepends=True,
    )

    last_import_end = -1
    inside_import = False

    for index, line in enumerate(lines):
        stripped = line.strip()

        if not inside_import:
            if stripped.startswith("import "):
                inside_import = True
                last_import_end = index

                if stripped.endswith(";"):
                    inside_import = False

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
            inside_import = False

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
        'import CollaborationDashboard '
        'from "./collaboration/dashboard/CollaborationDashboard";\n'
    ),
    'from "./collaboration/dashboard/CollaborationDashboard"',
)

if "<CollaborationDashboard />" not in text:
    anchors = [
        "<VisualHistoryPanel />",
        "<SessionManager />",
        "<SessionControls />",
        "<PersistentSessionBridge />",
        "<SharedRecoveryBridge />",
        "<EditorMutationAdapter />",
        "<SharedMutationBridge />",
        "<App />",
    ]

    selected_anchor = next(
        (
            anchor
            for anchor in anchors
            if anchor in text
        ),
        None,
    )

    if selected_anchor is None:
        raise SystemExit(
            "❌ No suitable CollaborationDashboard mount location was found in src/main.tsx."
        )

    text = text.replace(
        selected_anchor,
        (
            selected_anchor
            + "\n                "
            + "<CollaborationDashboard />"
        ),
        1,
    )

path.write_text(text)

print("✅ CollaborationDashboard imported.")
print("✅ CollaborationDashboard mounted.")
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
echo "Collaboration Dashboard features:"
echo "  • Connected collaborator list"
echo "  • Online, idle, and disconnected states"
echo "  • Active editing visibility"
echo "  • Object lock visibility"
echo "  • Connection status"
echo "  • Presence event bridge"
echo "  • Local user presence"
echo "  • Command/Ctrl + L shortcut"
echo ""
echo "Launch the Tauri app with:"
echo "  ./open-playground-tauri.sh"
