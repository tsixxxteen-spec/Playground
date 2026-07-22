import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  WorkspaceCommand,
} from "./types";

import "./collaboration-command-center.css";

const COMMANDS:
  WorkspaceCommand[] = [
    {
      id:
        "sessions",
      title:
        "Sessions",
      description:
        "Open, restore, duplicate, import, or export workspace sessions.",
      shortcut:
        "⌘J",
      symbol:
        "◫",
      key:
        "j",
      searchTerms: [
        "session",
        "save",
        "restore",
        "checkpoint",
        "import",
        "export",
      ],
    },
    {
      id:
        "history",
      title:
        "Visual History",
      description:
        "Browse snapshots, undo activity, and previous workspace states.",
      shortcut:
        "⌘H",
      symbol:
        "◷",
      key:
        "h",
      searchTerms: [
        "history",
        "snapshot",
        "undo",
        "redo",
        "restore",
        "version",
      ],
    },
    {
      id:
        "collaboration",
      title:
        "Collaboration",
      description:
        "View people, presence, active editors, and object locks.",
      shortcut:
        "⌘L",
      symbol:
        "◎",
      key:
        "l",
      searchTerms: [
        "collaboration",
        "people",
        "users",
        "presence",
        "locks",
        "editing",
      ],
    },
    {
      id:
        "inspector",
      title:
        "Object Inspector",
      description:
        "Search objects and inspect ownership, hierarchy, tags, and metadata.",
      shortcut:
        "⌘F",
      symbol:
        "⌕",
      key:
        "f",
      searchTerms: [
        "inspect",
        "object",
        "search",
        "metadata",
        "owner",
        "layer",
        "tag",
      ],
    },
  ];

function triggerWorkspaceShortcut(
  key: string,
): void {
  window.dispatchEvent(
    new KeyboardEvent(
      "keydown",
      {
        key,
        code:
          `Key${key.toUpperCase()}`,
        metaKey:
          true,
        ctrlKey:
          true,
        bubbles:
          true,
        cancelable:
          true,
      },
    ),
  );
}

function commandMatches(
  command:
    WorkspaceCommand,
  query: string,
): boolean {
  const normalized =
    query
      .trim()
      .toLowerCase();

  if (!normalized) {
    return true;
  }

  const searchable = [
    command.title,
    command.description,
    command.shortcut,
    ...command.searchTerms,
  ]
    .join(" ")
    .toLowerCase();

  return searchable.indexOf(
    normalized,
  ) !== -1;
}

export default function CollaborationCommandCenter() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  const searchInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const filteredCommands =
    useMemo(
      () =>
        COMMANDS.filter(
          (command) =>
            commandMatches(
              command,
              query,
            ),
        ),
      [query],
    );

  useEffect(() => {
    if (
      activeIndex >=
      filteredCommands.length
    ) {
      setActiveIndex(0);
    }
  }, [
    activeIndex,
    filteredCommands.length,
  ]);

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
          "k"
      ) {
        event.preventDefault();

        setIsOpen(
          (current) => {
            const next =
              !current;

            if (next) {
              window.setTimeout(
                () => {
                  searchInputRef.current
                    ?.focus();
                },
                0,
              );
            }

            return next;
          },
        );

        return;
      }

      if (!isOpen) {
        return;
      }

      if (
        event.key === "Escape"
      ) {
        event.preventDefault();

        setIsOpen(false);
        setQuery("");
        setActiveIndex(0);

        return;
      }

      if (
        event.key ===
        "ArrowDown"
      ) {
        event.preventDefault();

        setActiveIndex(
          (current) => {
            if (
              filteredCommands.length ===
              0
            ) {
              return 0;
            }

            return (
              current + 1
            ) %
              filteredCommands.length;
          },
        );

        return;
      }

      if (
        event.key ===
        "ArrowUp"
      ) {
        event.preventDefault();

        setActiveIndex(
          (current) => {
            if (
              filteredCommands.length ===
              0
            ) {
              return 0;
            }

            return (
              current -
              1 +
              filteredCommands.length
            ) %
              filteredCommands.length;
          },
        );

        return;
      }

      if (
        event.key === "Enter"
      ) {
        const command =
          filteredCommands[
            activeIndex
          ];

        if (!command) {
          return;
        }

        event.preventDefault();

        setIsOpen(false);
        setQuery("");
        setActiveIndex(0);

        window.setTimeout(
          () => {
            triggerWorkspaceShortcut(
              command.key,
            );
          },
          0,
        );
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
  }, [
    activeIndex,
    filteredCommands,
    isOpen,
  ]);

  const openCommand =
    (
      command:
        WorkspaceCommand,
    ) => {
      setIsOpen(false);
      setQuery("");
      setActiveIndex(0);

      window.setTimeout(
        () => {
          triggerWorkspaceShortcut(
            command.key,
          );
        },
        0,
      );
    };

  return (
    <>
      <button
        type="button"
        className="playground-command-center-launcher"
        onClick={() => {
          setIsOpen(true);

          window.setTimeout(
            () => {
              searchInputRef.current
                ?.focus();
            },
            0,
          );
        }}
        aria-label="Open Workspace Command Center"
        title="Workspace — Command/Ctrl + K"
      >
        <span
          className="playground-command-center-launcher__mark"
          aria-hidden="true"
        >
          ◇
        </span>

        <span className="playground-command-center-launcher__label">
          Workspace
        </span>

        <span className="playground-command-center-launcher__shortcut">
          ⌘K
        </span>
      </button>

      {isOpen && (
        <div
          className="playground-command-center-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsOpen(false);
              setQuery("");
              setActiveIndex(0);
            }
          }}
        >
          <section
            className="playground-command-center"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace Command Center"
          >
            <header className="playground-command-center__header">
              <div className="playground-command-center__identity">
                <span
                  aria-hidden="true"
                >
                  ◇
                </span>

                <div>
                  <p>
                    Playground
                  </p>

                  <h2>
                    Workspace
                  </h2>
                </div>
              </div>

              <button
                type="button"
                className="playground-command-center__close"
                onClick={() => {
                  setIsOpen(false);
                  setQuery("");
                  setActiveIndex(0);
                }}
                aria-label="Close command center"
              >
                ×
              </button>
            </header>

            <div className="playground-command-center__search">
              <span
                aria-hidden="true"
              >
                ⌕
              </span>

              <input
                ref={
                  searchInputRef
                }
                value={query}
                placeholder="Search workspace commands"
                onChange={(event) => {
                  setQuery(
                    event.target.value,
                  );

                  setActiveIndex(0);
                }}
              />

              <kbd>
                ESC
              </kbd>
            </div>

            <div className="playground-command-center__body">
              <div className="playground-command-center__section-label">
                <span>
                  Commands
                </span>

                <span>
                  {
                    filteredCommands.length
                  }
                </span>
              </div>

              {filteredCommands.length ===
              0 ? (
                <div className="playground-command-center__empty">
                  <span
                    aria-hidden="true"
                  >
                    ⌕
                  </span>

                  <h3>
                    No matching commands
                  </h3>

                  <p>
                    Search for sessions, history, collaboration, objects, locks, snapshots, or metadata.
                  </p>
                </div>
              ) : (
                <div className="playground-command-center__commands">
                  {filteredCommands.map(
                    (
                      command,
                      index,
                    ) => (
                      <button
                        key={
                          command.id
                        }
                        type="button"
                        className={
                          index ===
                          activeIndex
                            ? "playground-command-center__command playground-command-center__command--active"
                            : "playground-command-center__command"
                        }
                        onMouseEnter={() => {
                          setActiveIndex(
                            index,
                          );
                        }}
                        onClick={() => {
                          openCommand(
                            command,
                          );
                        }}
                      >
                        <span className="playground-command-center__command-icon">
                          {
                            command.symbol
                          }
                        </span>

                        <span className="playground-command-center__command-copy">
                          <strong>
                            {
                              command.title
                            }
                          </strong>

                          <small>
                            {
                              command.description
                            }
                          </small>
                        </span>

                        <kbd>
                          {
                            command.shortcut
                          }
                        </kbd>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>

            <footer className="playground-command-center__footer">
              <div>
                <span>
                  ↑↓
                </span>

                Navigate
              </div>

              <div>
                <span>
                  ↵
                </span>

                Open
              </div>

              <div>
                <span>
                  ESC
                </span>

                Close
              </div>

              <p>
                Collaboration workspace
              </p>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
