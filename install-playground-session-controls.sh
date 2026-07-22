#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.10-SESSION-CONTROLS"
MARKER=".playground-session-controls-installed"
BACKUP_DIR=".playground-backups/session-controls-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "Run this installer from the Playground project root."
[[ -f src/main.tsx ]] || fail "src/main.tsx was not found."
[[ -f src/collaboration/persistence/events.ts ]] || fail "Sprint 21B.10 persistence events were not found."
[[ -f src/collaboration/persistence/PersistentSessionBridge.tsx ]] || fail "PersistentSessionBridge was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Session controls are already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/collaboration/persistence

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

    rm -f \
      src/collaboration/persistence/SessionControls.tsx \
      src/collaboration/persistence/session-controls.css \
      "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Session controls component
# ------------------------------------------------------------

cat > src/collaboration/persistence/SessionControls.tsx <<'EOF'
import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ChangeEvent,
} from "react";

import {
  PLAYGROUND_CHECKPOINT_ERROR_EVENT,
  PLAYGROUND_CHECKPOINT_RESTORED_EVENT,
  PLAYGROUND_CHECKPOINT_SAVED_EVENT,
  PLAYGROUND_EXPORT_SESSION_EVENT,
  PLAYGROUND_IMPORT_SESSION_EVENT,
  PLAYGROUND_RESTORE_CHECKPOINT_EVENT,
  PLAYGROUND_SAVE_CHECKPOINT_EVENT,
} from "./events";

import "./session-controls.css";

type StatusTone =
  | "idle"
  | "success"
  | "error";

type StatusState = {
  message: string;
  tone: StatusTone;
};

const DEFAULT_STATUS: StatusState = {
  message: "Session ready",
  tone: "idle",
};

function dispatchEvent(
  eventName: string,
): void {
  document.dispatchEvent(
    new CustomEvent(eventName),
  );
}

export default function SessionControls() {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    status,
    setStatus,
  ] = useState<StatusState>(
    DEFAULT_STATUS,
  );

  const [
    isExpanded,
    setIsExpanded,
  ] = useState(false);

  useEffect(() => {
    let resetTimer:
      number | undefined;

    const showTemporaryStatus = (
      nextStatus: StatusState,
    ) => {
      setStatus(nextStatus);

      if (resetTimer) {
        window.clearTimeout(
          resetTimer,
        );
      }

      resetTimer =
        window.setTimeout(() => {
          setStatus(
            DEFAULT_STATUS,
          );
        }, 3200);
    };

    const handleSaved = () => {
      showTemporaryStatus({
        message: "Session saved",
        tone: "success",
      });
    };

    const handleRestored = () => {
      showTemporaryStatus({
        message: "Session restored",
        tone: "success",
      });
    };

    const handleError = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          message?: string;
        }>;

      showTemporaryStatus({
        message:
          customEvent.detail
            ?.message ??
          "Session action failed",
        tone: "error",
      });
    };

    document.addEventListener(
      PLAYGROUND_CHECKPOINT_SAVED_EVENT,
      handleSaved,
    );

    document.addEventListener(
      PLAYGROUND_CHECKPOINT_RESTORED_EVENT,
      handleRestored,
    );

    document.addEventListener(
      PLAYGROUND_CHECKPOINT_ERROR_EVENT,
      handleError,
    );

    return () => {
      document.removeEventListener(
        PLAYGROUND_CHECKPOINT_SAVED_EVENT,
        handleSaved,
      );

      document.removeEventListener(
        PLAYGROUND_CHECKPOINT_RESTORED_EVENT,
        handleRestored,
      );

      document.removeEventListener(
        PLAYGROUND_CHECKPOINT_ERROR_EVENT,
        handleError,
      );

      if (resetTimer) {
        window.clearTimeout(
          resetTimer,
        );
      }
    };
  }, []);

  const handleImportFile = async (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const json =
        await file.text();

      document.dispatchEvent(
        new CustomEvent(
          PLAYGROUND_IMPORT_SESSION_EVENT,
          {
            detail: {
              json,
            },
          },
        ),
      );
    } catch {
      setStatus({
        message:
          "Could not read session file",
        tone: "error",
      });
    }
  };

  return (
    <aside
      className={
        isExpanded
          ? "playground-session-controls playground-session-controls--expanded"
          : "playground-session-controls"
      }
      aria-label="Session controls"
    >
      <button
        type="button"
        className="playground-session-controls__toggle"
        aria-expanded={isExpanded}
        onClick={() => {
          setIsExpanded(
            (current) => !current,
          );
        }}
      >
        <span>
          Session
        </span>

        <span
          aria-hidden="true"
          className="playground-session-controls__chevron"
        >
          {isExpanded ? "×" : "⋯"}
        </span>
      </button>

      {isExpanded && (
        <div className="playground-session-controls__panel">
          <div
            className={`playground-session-controls__status playground-session-controls__status--${status.tone}`}
            role="status"
          >
            {status.message}
          </div>

          <button
            type="button"
            className="playground-session-controls__button"
            onClick={() => {
              dispatchEvent(
                PLAYGROUND_SAVE_CHECKPOINT_EVENT,
              );
            }}
          >
            Save checkpoint
          </button>

          <button
            type="button"
            className="playground-session-controls__button"
            onClick={() => {
              dispatchEvent(
                PLAYGROUND_RESTORE_CHECKPOINT_EVENT,
              );
            }}
          >
            Restore checkpoint
          </button>

          <div className="playground-session-controls__divider" />

          <button
            type="button"
            className="playground-session-controls__button"
            onClick={() => {
              dispatchEvent(
                PLAYGROUND_EXPORT_SESSION_EVENT,
              );
            }}
          >
            Export session
          </button>

          <button
            type="button"
            className="playground-session-controls__button"
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            Import session
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="playground-session-controls__file-input"
            onChange={handleImportFile}
          />
        </div>
      )}
    </aside>
  );
}
EOF

# ------------------------------------------------------------
# Styling
# ------------------------------------------------------------

cat > src/collaboration/persistence/session-controls.css <<'EOF'
.playground-session-controls {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 10000;
  width: 132px;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.playground-session-controls--expanded {
  width: 224px;
}

.playground-session-controls__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 40px;
  padding: 0 13px;
  border: 1px solid
    rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  background:
    rgba(19, 19, 21, 0.94);
  color: rgba(255, 255, 255, 0.92);
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow:
    0 12px 36px
      rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(18px);
}

.playground-session-controls__toggle:hover {
  background:
    rgba(27, 27, 30, 0.97);
}

.playground-session-controls__chevron {
  font-size: 17px;
  line-height: 1;
  opacity: 0.72;
}

.playground-session-controls__panel {
  display: grid;
  gap: 7px;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid
    rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background:
    rgba(15, 15, 17, 0.96);
  box-shadow:
    0 18px 48px
      rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
}

.playground-session-controls__status {
  min-height: 30px;
  display: flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 8px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.62);
  font-size: 11px;
}

.playground-session-controls__status--success {
  color: #a9f4bf;
  background:
    rgba(63, 185, 96, 0.13);
}

.playground-session-controls__status--error {
  color: #ffb3b3;
  background:
    rgba(218, 74, 74, 0.14);
}

.playground-session-controls__button {
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid
    rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background:
    rgba(255, 255, 255, 0.055);
  color:
    rgba(255, 255, 255, 0.86);
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}

.playground-session-controls__button:hover {
  background:
    rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.playground-session-controls__button:active {
  transform: translateY(1px);
}

.playground-session-controls__divider {
  height: 1px;
  margin: 3px 0;
  background:
    rgba(255, 255, 255, 0.09);
}

.playground-session-controls__file-input {
  display: none;
}

@media (max-width: 700px) {
  .playground-session-controls {
    right: 10px;
    bottom: 10px;
  }

  .playground-session-controls--expanded {
    width:
      min(224px, calc(100vw - 20px));
  }
}
EOF

# ------------------------------------------------------------
# Import and mount in main.tsx
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path

path = Path("src/main.tsx")

if not path.exists():
    raise SystemExit(
        "❌ src/main.tsx was not found."
    )

text = path.read_text()

import_statement = (
    'import SessionControls '
    'from "./collaboration/persistence/SessionControls";\n'
)

import_identity = (
    'from "./collaboration/persistence/SessionControls"'
)

if import_identity not in text:
    lines = text.splitlines(
        keepends=True
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
        import_statement,
    )

    text = "".join(lines)

if "<SessionControls />" not in text:
    anchors = [
        "<PersistentSessionBridge />",
        "<SharedRecoveryBridge />",
        "<EditorMutationAdapter />",
        "<SharedMutationBridge />",
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
        app_anchor = "<App />"

        if app_anchor not in text:
            raise SystemExit(
                "❌ No suitable mounting location was found in src/main.tsx."
            )

        text = text.replace(
            app_anchor,
            (
                "<SessionControls />\n"
                "                "
                "<App />"
            ),
            1,
        )
    else:
        text = text.replace(
            selected_anchor,
            (
                selected_anchor
                + "\n                "
                + "<SessionControls />"
            ),
            1,
        )

path.write_text(text)

print("✅ SessionControls imported.")
print("✅ SessionControls mounted.")
PY

echo ""
echo "Running clean build..."
echo ""

npm run build

touch "$MARKER"

trap - EXIT

echo ""
echo "✅ $SPRINT_ID installed successfully."
echo "✅ Clean build completed."
echo ""
echo "Backup:"
echo "  $BACKUP_DIR"
echo ""
echo "Controls added:"
echo "  • Save checkpoint"
echo "  • Restore checkpoint"
echo "  • Export session"
echo "  • Import session"
echo ""
echo "Look for the Session button in the bottom-right corner."
