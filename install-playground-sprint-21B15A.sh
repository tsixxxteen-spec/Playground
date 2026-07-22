#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.15A"
MARKER=".playground-sprint-21B15A-installed"
MAIN_FILE="src/main.tsx"
RUNTIME_DIR="src/runtime"
RUNTIME_FILE="$RUNTIME_DIR/PlaygroundRuntime.tsx"
INDEX_FILE="$RUNTIME_DIR/index.ts"
BACKUP_DIR=".playground-backups/sprint-21B15A-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] ||
  fail "Run this installer from the worlds project root."

[[ -f "$MAIN_FILE" ]] ||
  fail "$MAIN_FILE was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR/src"
mkdir -p "$RUNTIME_DIR"

cp -p "$MAIN_FILE" "$BACKUP_DIR/$MAIN_FILE"

if [[ -d "$RUNTIME_DIR" ]]; then
  mkdir -p "$BACKUP_DIR/$RUNTIME_DIR"
  cp -R "$RUNTIME_DIR/." "$BACKUP_DIR/$RUNTIME_DIR/" 2>/dev/null || true
fi

rollback() {
  code=$?

  if [[ $code -ne 0 ]]; then
    echo ""
    echo "⚠️ Installation failed. Restoring the previous runtime..."

    cp -p \
      "$BACKUP_DIR/$MAIN_FILE" \
      "$MAIN_FILE"

    rm -rf "$RUNTIME_DIR"

    if [[ -d "$BACKUP_DIR/$RUNTIME_DIR" ]]; then
      mkdir -p "$RUNTIME_DIR"
      cp -R \
        "$BACKUP_DIR/$RUNTIME_DIR/." \
        "$RUNTIME_DIR/"
    fi

    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

python3 <<'PY'
from pathlib import Path
import re

main_path = Path("src/main.tsx")
runtime_path = Path("src/runtime/PlaygroundRuntime.tsx")

source = main_path.read_text()

candidate_components = [
    "PersistentSessionBridge",
    "SharedRecoveryBridge",
    "EditorMutationAdapter",
    "SharedMutationBridge",
    "SessionControls",
    "SessionManager",
    "VisualHistoryPanel",
    "CollaborationDashboard",
    "ObjectInspectorPanel",
    "CollaborationCommandCenter",
    "CollaborationDiagnosticsPanel",
    "ReleaseReadinessPanel",
    "ProfileExperiencePolishBridge",
]

if "<PlaygroundRuntime />" in source:
    raise SystemExit(
        "❌ PlaygroundRuntime is already mounted, but the sprint marker is missing."
    )

import_pattern = re.compile(
    r"(^import[\s\S]*?;\s*$)",
    re.MULTILINE,
)

all_imports = list(
    import_pattern.finditer(source)
)

moved_imports = []
moved_components = []

for component in candidate_components:
    mount_pattern = re.compile(
        rf"<{re.escape(component)}\s*/>"
    )

    if not mount_pattern.search(source):
        continue

    matching_imports = []

    for match in all_imports:
        statement = match.group(1)

        if re.search(
            rf"\b{re.escape(component)}\b",
            statement,
        ):
            matching_imports.append(statement)

    if len(matching_imports) != 1:
        raise SystemExit(
            f"❌ Expected exactly one import for {component}, "
            f"found {len(matching_imports)}."
        )

    statement = matching_imports[0]

    identifiers = re.findall(
        r"\b[A-Z][A-Za-z0-9_]*\b",
        statement.split("from")[0],
    )

    unrelated = [
        identifier
        for identifier in identifiers
        if identifier not in {
            "import",
            "type",
            component,
        }
    ]

    if unrelated:
        raise SystemExit(
            f"❌ Import for {component} appears to contain additional "
            f"runtime identifiers: {', '.join(unrelated)}. "
            "The installer stopped to avoid removing a shared import."
        )

    moved_imports.append(
        statement.strip()
    )

    moved_components.append(
        component
    )

if not moved_components:
    raise SystemExit(
        "❌ No supported Playground runtime systems were found in src/main.tsx."
    )

for statement in moved_imports:
    source = source.replace(
        statement,
        "",
        1,
    )

for component in moved_components:
    source = re.sub(
        rf"\s*<{re.escape(component)}\s*/>",
        "",
        source,
        count=1,
    )

runtime_import = (
    'import PlaygroundRuntime '
    'from "./runtime/PlaygroundRuntime";'
)

if runtime_import not in source:
    import_matches = list(
        import_pattern.finditer(source)
    )

    if not import_matches:
        raise SystemExit(
            "❌ Could not locate an import block in src/main.tsx."
        )

    final_import = import_matches[-1]

    source = (
        source[:final_import.end()]
        + "\n"
        + runtime_import
        + source[final_import.end():]
    )

app_mount = re.search(
    r"<App\s*/>",
    source,
)

if not app_mount:
    raise SystemExit(
        "❌ Could not locate <App /> in src/main.tsx."
    )

source = (
    source[:app_mount.end()]
    + "\n                <PlaygroundRuntime />"
    + source[app_mount.end():]
)

source = re.sub(
    r"\n{3,}",
    "\n\n",
    source,
)

main_path.write_text(source)

runtime_import_block = "\n".join(
    moved_imports
)

runtime_mounts = "\n".join(
    f"      <{component} />"
    for component in moved_components
)

runtime_source = f'''{runtime_import_block}

export const PLAYGROUND_RUNTIME_SYSTEMS = {moved_components!r} as const;

export type PlaygroundRuntimeSystem =
  typeof PLAYGROUND_RUNTIME_SYSTEMS[number];

export default function PlaygroundRuntime() {{
  return (
    <>
{runtime_mounts}
    </>
  );
}}
'''

runtime_path.write_text(
    runtime_source
)

print("✅ Runtime systems moved:")
for component in moved_components:
    print(f"   • {component}")

print("")
print("✅ src/main.tsx now mounts <PlaygroundRuntime />.")
PY

cat > "$INDEX_FILE" <<'EOF'
export {
  default as PlaygroundRuntime,
  PLAYGROUND_RUNTIME_SYSTEMS,
} from "./PlaygroundRuntime";

export type {
  PlaygroundRuntimeSystem,
} from "./PlaygroundRuntime";
EOF

cat > "$RUNTIME_DIR/runtime-manifest.ts" <<'EOF'
import {
  PLAYGROUND_RUNTIME_SYSTEMS,
} from "./PlaygroundRuntime";

export type PlaygroundRuntimeManifest = {
  name: string;
  architectureVersion: string;
  systems: readonly string[];
  strictBioCanvasCompanionBounds: true;
  followSystemManagedExternally: true;
  privateFollowerCountsManagedExternally: true;
};

export const PLAYGROUND_RUNTIME_MANIFEST:
  PlaygroundRuntimeManifest = {
    name: "Playground Runtime",
    architectureVersion: "21B.15A",
    systems:
      PLAYGROUND_RUNTIME_SYSTEMS,
    strictBioCanvasCompanionBounds:
      true,
    followSystemManagedExternally:
      true,
    privateFollowerCountsManagedExternally:
      true,
  };
EOF

cat > "$RUNTIME_DIR/runtime-events.ts" <<'EOF'
export const PLAYGROUND_RUNTIME_READY_EVENT =
  "playground:runtime-ready";

export function announcePlaygroundRuntimeReady(
  systems: readonly string[],
): void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_RUNTIME_READY_EVENT,
      {
        detail: {
          systems,
          architectureVersion:
            "21B.15A",
          strictBioCanvasCompanionBounds:
            true,
        },
      },
    ),
  );
}
EOF

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/runtime/PlaygroundRuntime.tsx"
)

text = path.read_text()

event_import = '''import {
  useEffect,
} from "react";

import {
  announcePlaygroundRuntimeReady,
} from "./runtime-events";

'''

if 'from "./runtime-events"' not in text:
    text = (
        event_import +
        text
    )

old_function = '''export default function PlaygroundRuntime() {
  return (
'''

new_function = '''export default function PlaygroundRuntime() {
  useEffect(() => {
    announcePlaygroundRuntimeReady(
      PLAYGROUND_RUNTIME_SYSTEMS,
    );
  }, []);

  return (
'''

if old_function not in text:
    raise SystemExit(
        "❌ Could not update PlaygroundRuntime startup lifecycle."
    )

text = text.replace(
    old_function,
    new_function,
    1,
)

path.write_text(text)

print(
    "✅ Runtime-ready lifecycle event added."
)
PY

echo ""
echo "Running clean web build..."
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
echo "Architecture changes:"
echo "  • Existing runtime mounts consolidated"
echo "  • src/main.tsx simplified"
echo "  • PlaygroundRuntime added"
echo "  • Runtime manifest added"
echo "  • Runtime-ready event added"
echo "  • Existing component order preserved"
echo "  • Existing shortcuts preserved"
echo "  • Strict bio-canvas companion bounds preserved"
echo "  • Follow system untouched"
echo "  • Private follower-count system untouched"
echo ""
echo "Launch Playground with:"
echo "  ./open-playground-tauri.sh"
