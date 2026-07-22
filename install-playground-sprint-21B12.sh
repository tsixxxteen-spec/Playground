#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.12"
MARKER=".playground-sprint-21B12-installed"
BACKUP_DIR=".playground-backups/sprint-21B12-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the worlds project root."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."

[[ -f src/collaboration/session-manager/SessionManager.tsx ]] ||
  fail "Sprint 21B.11A Session Manager was not found."

[[ -f src/collaboration/history/VisualHistoryPanel.tsx ]] ||
  fail "Sprint 21B.11B Visual History was not found."

[[ -f src/collaboration/dashboard/CollaborationDashboard.tsx ]] ||
  fail "Sprint 21B.11C Collaboration Dashboard was not found."

[[ -f src/collaboration/inspector/ObjectInspectorPanel.tsx ]] ||
  fail "Sprint 21B.11D Object Inspector was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/command-center

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

    rm -rf src/collaboration/command-center
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Command Center types
# ------------------------------------------------------------

cat > src/collaboration/command-center/types.ts <<'EOF'
export type WorkspaceCommandId =
  | "sessions"
  | "history"
  | "collaboration"
  | "inspector";

export type WorkspaceCommand = {
  id: WorkspaceCommandId;
  title: string;
  description: string;
  shortcut: string;
  symbol: string;
  searchTerms: string[];
  key: string;
};
EOF

# ------------------------------------------------------------
# Command Center component
# ------------------------------------------------------------

cat > src/collaboration/command-center/CollaborationCommandCenter.tsx <<'EOF'
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
EOF

# ------------------------------------------------------------
# Command Center styling
# ------------------------------------------------------------

cat > src/collaboration/command-center/collaboration-command-center.css <<'EOF'
.playground-session-launcher,
.playground-history-launcher,
.playground-collaboration-launcher,
.playground-inspector-launcher {
  display: none !important;
}

.playground-command-center-launcher {
  position: fixed;
  right: 18px;
  bottom: 20px;
  z-index: 9998;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px 0 12px;
  border: 1px solid
    rgba(255, 255, 255, 0.14);
  border-radius: 13px;
  background:
    rgba(17, 17, 19, 0.95);
  color:
    rgba(255, 255, 255, 0.9);
  box-shadow:
    0 14px 42px
    rgba(0, 0, 0, 0.36);
  backdrop-filter:
    blur(20px);
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
  transition:
    transform 150ms ease,
    background 150ms ease,
    border-color 150ms ease;
}

.playground-command-center-launcher:hover {
  transform:
    translateY(-2px);
  background:
    rgba(27, 27, 30, 0.98);
  border-color:
    rgba(255, 255, 255, 0.2);
}

.playground-command-center-launcher__mark {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background:
    rgba(255, 255, 255, 0.075);
  color:
    rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.playground-command-center-launcher__shortcut {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 7px;
  border: 1px solid
    rgba(255, 255, 255, 0.075);
  border-radius: 7px;
  background:
    rgba(255, 255, 255, 0.045);
  color:
    rgba(255, 255, 255, 0.38);
  font-size: 9px;
}

.playground-command-center-overlay {
  position: fixed;
  inset: 0;
  z-index: 13000;
  display: grid;
  place-items: start center;
  padding: 12vh 24px 24px;
  background:
    rgba(0, 0, 0, 0.49);
  backdrop-filter:
    blur(17px);
  animation:
    playground-command-center-fade
    150ms ease-out;
}

.playground-command-center {
  width:
    min(650px, 96vw);
  max-height:
    min(670px, 78vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid
    rgba(255, 255, 255, 0.13);
  border-radius: 22px;
  background:
    rgba(14, 14, 16, 0.985);
  color: #fff;
  box-shadow:
    0 36px 110px
    rgba(0, 0, 0, 0.62);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  animation:
    playground-command-center-rise
    190ms
    cubic-bezier(
      0.22,
      1,
      0.36,
      1
    );
}

.playground-command-center__header {
  min-height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.075);
}

.playground-command-center__identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.playground-command-center__identity > span {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border: 1px solid
    rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.11),
      rgba(255, 255, 255, 0.035)
    );
  color:
    rgba(255, 255, 255, 0.62);
  font-size: 18px;
}

.playground-command-center__identity p {
  margin: 0 0 3px;
  color:
    rgba(255, 255, 255, 0.34);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.playground-command-center__identity h2 {
  margin: 0;
  font-size: 19px;
  font-weight: 680;
  letter-spacing: -0.025em;
}

.playground-command-center__close {
  width: 33px;
  height: 33px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background:
    rgba(255, 255, 255, 0.065);
  color:
    rgba(255, 255, 255, 0.65);
  font-size: 20px;
  cursor: pointer;
}

.playground-command-center__close:hover {
  background:
    rgba(255, 255, 255, 0.11);
  color: #fff;
}

.playground-command-center__search {
  height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid
    rgba(255, 255, 255, 0.07);
}

.playground-command-center__search > span {
  color:
    rgba(255, 255, 255, 0.34);
  font-size: 16px;
}

.playground-command-center__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  color:
    rgba(255, 255, 255, 0.94);
  font: inherit;
  font-size: 13px;
}

.playground-command-center__search input::placeholder {
  color:
    rgba(255, 255, 255, 0.28);
}

.playground-command-center kbd {
  min-width: 32px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border: 1px solid
    rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background:
    rgba(255, 255, 255, 0.045);
  color:
    rgba(255, 255, 255, 0.36);
  font-family: inherit;
  font-size: 8px;
  box-shadow:
    inset 0 -1px 0
    rgba(255, 255, 255, 0.04);
}

.playground-command-center__body {
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.playground-command-center__section-label {
  display: flex;
  justify-content: space-between;
  padding: 3px 7px 10px;
  color:
    rgba(255, 255, 255, 0.3);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.playground-command-center__commands {
  display: grid;
  gap: 5px;
}

.playground-command-center__command {
  width: 100%;
  min-height: 74px;
  display: grid;
  grid-template-columns:
    auto
    minmax(0, 1fr)
    auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid
    transparent;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background 100ms ease,
    border-color 100ms ease;
}

.playground-command-center__command:hover,
.playground-command-center__command--active {
  border-color:
    rgba(255, 255, 255, 0.1);
  background:
    rgba(255, 255, 255, 0.065);
}

.playground-command-center__command-icon {
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  border: 1px solid
    rgba(255, 255, 255, 0.065);
  border-radius: 12px;
  background:
    rgba(255, 255, 255, 0.045);
  color:
    rgba(255, 255, 255, 0.56);
  font-size: 18px;
}

.playground-command-center__command-copy {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.playground-command-center__command-copy strong {
  color:
    rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 650;
}

.playground-command-center__command-copy small {
  overflow: hidden;
  color:
    rgba(255, 255, 255, 0.38);
  font-size: 9px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-command-center__empty {
  min-height: 270px;
  display: grid;
  place-items: center;
  align-content: center;
  color:
    rgba(255, 255, 255, 0.34);
  text-align: center;
}

.playground-command-center__empty > span {
  margin-bottom: 13px;
  font-size: 29px;
}

.playground-command-center__empty h3 {
  margin: 0 0 7px;
  color:
    rgba(255, 255, 255, 0.72);
  font-size: 13px;
}

.playground-command-center__empty p {
  max-width: 330px;
  margin: 0;
  font-size: 10px;
  line-height: 1.55;
}

.playground-command-center__footer {
  min-height: 45px;
  display: flex;
  align-items: center;
  gap: 17px;
  padding: 0 18px;
  border-top: 1px solid
    rgba(255, 255, 255, 0.07);
  color:
    rgba(255, 255, 255, 0.3);
  font-size: 8px;
}

.playground-command-center__footer div {
  display: flex;
  align-items: center;
  gap: 5px;
}

.playground-command-center__footer div span {
  color:
    rgba(255, 255, 255, 0.48);
}

.playground-command-center__footer p {
  margin: 0 0 0 auto;
  color:
    rgba(255, 255, 255, 0.23);
}

@keyframes playground-command-center-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes playground-command-center-rise {
  from {
    opacity: 0;
    transform:
      translateY(-9px)
      scale(0.985);
  }

  to {
    opacity: 1;
    transform:
      translateY(0)
      scale(1);
  }
}

@media (max-width: 620px) {
  .playground-command-center-overlay {
    padding:
      8vh 10px 10px;
  }

  .playground-command-center {
    width: 100%;
    max-height: 84vh;
    border-radius: 18px;
  }

  .playground-command-center__command-copy small {
    white-space: normal;
  }

  .playground-command-center__footer p {
    display: none;
  }

  .playground-command-center-launcher {
    right: 10px;
    bottom: 12px;
  }

  .playground-command-center-launcher__label {
    display: none;
  }
}
EOF

# ------------------------------------------------------------
# Public exports
# ------------------------------------------------------------

cat > src/collaboration/command-center/index.ts <<'EOF'
export {
  default as CollaborationCommandCenter,
} from "./CollaborationCommandCenter";

export type {
  WorkspaceCommand,
  WorkspaceCommandId,
} from "./types";
EOF

# ------------------------------------------------------------
# Mount command center in main.tsx
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
        'import CollaborationCommandCenter '
        'from "./collaboration/command-center/CollaborationCommandCenter";\n'
    ),
    'from "./collaboration/command-center/CollaborationCommandCenter"',
)

if "<CollaborationCommandCenter />" not in text:
    anchors = [
        "<ObjectInspectorPanel />",
        "<CollaborationDashboard />",
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
            "❌ No suitable CollaborationCommandCenter mount location was found in src/main.tsx."
        )

    text = text.replace(
        selected_anchor,
        (
            selected_anchor
            + "\n                "
            + "<CollaborationCommandCenter />"
        ),
        1,
    )

path.write_text(text)

print("✅ CollaborationCommandCenter imported.")
print("✅ CollaborationCommandCenter mounted.")
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
echo "Collaboration Command Center features:"
echo "  • Unified Workspace launcher"
echo "  • Searchable command palette"
echo "  • Session Manager access"
echo "  • Visual History access"
echo "  • Collaboration Dashboard access"
echo "  • Object Inspector access"
echo "  • Arrow-key navigation"
echo "  • Enter to open"
echo "  • Escape to close"
echo "  • Command/Ctrl + K shortcut"
echo "  • Standalone launchers hidden"
echo ""
echo "Existing direct shortcuts remain available:"
echo "  • Command/Ctrl + J — Sessions"
echo "  • Command/Ctrl + H — History"
echo "  • Command/Ctrl + L — Collaboration"
echo "  • Command/Ctrl + F — Inspector"
echo ""
echo "Launch the Tauri app with:"
echo "  ./open-playground-tauri.sh"
