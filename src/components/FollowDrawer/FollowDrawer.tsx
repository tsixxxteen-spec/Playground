import { useEffect, useMemo, useRef, useState } from "react";
import "./FollowDrawer.css";

export type FollowDrawerMode = "followers" | "following";

export type FollowUser = {
  id: string;
  displayName: string;
  username: string;
  avatarSrc?: string;
  verified?: boolean;
};

type Props = {
  open: boolean;
  mode: FollowDrawerMode;
  users: FollowUser[];
  onClose: () => void;
};

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function FollowDrawer({
  open,
  mode,
  users,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 180);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.displayName.toLowerCase().includes(normalizedQuery) ||
        user.username.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, users]);

  const title = mode === "followers" ? "Followers" : "Following";

  if (!open) {
    return null;
  }

  return (
    <div
      className="follow-drawer-shell"
      role="presentation"
      data-open={open ? "true" : "false"}
    >
      <button
        className="follow-drawer-backdrop"
        type="button"
        aria-label={`Close ${title}`}
        onClick={onClose}
      />

      <aside
        className="follow-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-drawer-title"
      >
        <header className="follow-drawer__header">
          <button
            className="follow-drawer__back"
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <span aria-hidden="true">←</span>
          </button>

          <div>
            <span className="follow-drawer__eyebrow">Your network</span>
            <h2 id="follow-drawer-title">{title}</h2>
          </div>

          <span className="follow-drawer__count">
            {users.length}
          </span>
        </header>

        <div className="follow-drawer__search-wrap">
          <span aria-hidden="true">⌕</span>

          <input
            ref={searchRef}
            className="follow-drawer__search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
            aria-label={`Search ${title.toLowerCase()}`}
          />
        </div>

        <div className="follow-drawer__content">
          {filteredUsers.length > 0 ? (
            <ul className="follow-drawer__list">
              {filteredUsers.map((user) => (
                <li className="follow-drawer__person" key={user.id}>
                  <div className="follow-drawer__avatar" aria-hidden="true">
                    {user.avatarSrc ? (
                      <img
                        src={user.avatarSrc}
                        alt=""
                        draggable={false}
                      />
                    ) : (
                      <span>{initialsFor(user.displayName)}</span>
                    )}
                  </div>

                  <div className="follow-drawer__identity">
                    <strong>
                      {user.displayName}

                      {user.verified ? (
                        <span
                          className="follow-drawer__verified"
                          title="Verified"
                          aria-label="Verified"
                        >
                          ◆
                        </span>
                      ) : null}
                    </strong>

                    <span>{user.username}</span>
                  </div>

                  <span className="follow-drawer__relationship">
                    {mode === "followers" ? "Follower" : "Following"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="follow-drawer__empty">
              <span aria-hidden="true">
                {query.trim() ? "⌕" : "◎"}
              </span>

              <strong>
                {query.trim()
                  ? "No matching people"
                  : mode === "followers"
                    ? "No followers yet"
                    : "You aren't following anyone yet"}
              </strong>

              <p>
                {query.trim()
                  ? "Try searching with another name or username."
                  : mode === "followers"
                    ? "People who follow you will appear privately here."
                    : "Accounts you follow will appear privately here."}
              </p>
            </div>
          )}
        </div>

        <footer className="follow-drawer__footer">
          Only you can see your follower and following lists.
        </footer>
      </aside>
    </div>
  );
}
