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
