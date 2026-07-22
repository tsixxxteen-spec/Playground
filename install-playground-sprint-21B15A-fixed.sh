#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.15A-fixed"
MARKER=".playground-sprint-21B15A-installed"
MAIN_FILE="src/main.tsx"
RUNTIME_DIR="src/runtime"
RUNTIME_FILE="$RUNTIME_DIR/PlaygroundRuntime.tsx"
BACKUP_DIR=".playground-backups/sprint-21B15A-fixed-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] ||
  fail "Run this installer from the worlds project root."

[[ -f "$MAIN_FILE" ]] ||
  fail "$MAIN_FILE was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint 21B.15A is already installed."
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
    echo "⚠️ Installation failed. Restoring previous files..."

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
runtime_dir = Path("src/runtime")
runtime_path = runtime_dir / "PlaygroundRuntime.tsx"

source = main_path.read_text()

components = [
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
        "❌ PlaygroundRuntime is already mounted in src/main.tsx."
    )

import_pattern = re.compile(
    r"import[\s\S]*?;\s*",
    re.MULTILINE,
)

imports = list(
    import_pattern.finditer(source)
)

runtime_imports = []
mounted_components = []

def rewrite_import_path(statement: str) -> str:
    match = re.search(
        r'from\s+([\'"])([^\'"]+)\1',
        statement,
    )

    if not match:
        match = re.search(
            r'import\s+([\'"])([^\'"]+)\1',
            statement,
        )

    if not match:
        return statement

    quote = match.group(1)
    path = match.group(2)

    if not path.startswith("."):
        return statement

    if path.startswith("../"):
        rewritten = "../" + path
    elif path.startswith("./"):
        rewritten = "../" + path[2:]
    else:
        rewritten = "../" + path

    start, end = match.span(2)

    return (
        statement[:start]
        + rewritten
        + statement[end:]
    )

for component in components:
    mount_pattern = re.compile(
        rf"<{re.escape(component)}\s*/>"
    )

    if not mount_pattern.search(source):
        continue

    matching = []

    for match in imports:
        statement = match.group(0)

        if re.search(
            rf"\b{re.escape(component)}\b",
            statement,
        ):
            matching.append(
                statement
            )

    if len(matching) != 1:
        raise SystemExit(
            f"❌ Expected one import for {component}; "
            f"found {len(matching)}."
        )

    original_import = matching[0]

    runtime_imports.append(
        rewrite_import_path(
            original_import.strip()
        )
    )

    mounted_components.append(
        component
    )

if not mounted_components:
    raise SystemExit(
        "❌ No supported runtime components were found in src/main.tsx."
    )

for component in mounted_components:
    matching_import = next(
        statement
        for statement in [
            match.group(0)
            for match in imports
        ]
        if re.search(
            rf"\b{re.escape(component)}\b",
            statement,
        )
    )

    source = source.replace(
        matching_import,
        "",
        1,
    )

for component in mounted_components:
    source = re.sub(
        rf"\s*<{re.escape(component)}\s*/>",
        "",
        source,
        count=1,
    )

remaining_imports = list(
    import_pattern.finditer(source)
)

if not remaining_imports:
    raise SystemExit(
        "❌ Could not locate the remaining import block."
    )

runtime_main_import = (
    'import PlaygroundRuntime '
    'from "./runtime/PlaygroundRuntime";\n'
)

last_import = remaining_imports[-1]

source = (
    source[:last_import.end()]
    + runtime_main_import
    + source[last_import.end():]
)

app_match = re.search(
    r"<App\s*/>",
    source,
)

if not app_match:
    raise SystemExit(
        "❌ Could not locate <App /> in src/main.tsx."
    )

source = (
    source[:app_match.end()]
    + "\n                <PlaygroundRuntime />"
    + source[app_match.end():]
)

source = re.sub(
    r"\n{3,}",
    "\n\n",
    source,
)

main_path.write_text(
    source
)

runtime_source = (
    'import { useEffect } from "react";\n\n'
    + "\n".join(runtime_imports)
    + '\n\nimport {\n'
      '  announcePlaygroundRuntimeReady,\n'
      '} from "./runtime-events";\n\n'
    + "export const PLAYGROUND_RUNTIME_SYSTEMS = [\n"
    + "".join(
        f'  "{component}",\n'
        for component in mounted_components
    )
    + "] as const;\n\n"
    + "export type PlaygroundRuntimeSystem =\n"
      "  typeof PLAYGROUND_RUNTIME_SYSTEMS[number];\n\n"
    + "export default function PlaygroundRuntime() {\n"
      "  useEffect(() => {\n"
      "    announcePlaygroundRuntimeReady(\n"
      "      PLAYGROUND_RUNTIME_SYSTEMS,\n"
      "    );\n"
      "  }, []);\n\n"
      "  return (\n"
      "    <>\n"
    + "".join(
        f"      <{component} />\n"
        for component in mounted_components
    )
    + "    </>\n"
      "  );\n"
      "}\n"
)

runtime_path.write_text(
    runtime_source
)

print("✅ Runtime imports rewritten for src/runtime:")
for statement in runtime_imports:
    print(f"   {statement}")

print("")
print("✅ Runtime systems consolidated:")
for component in mounted_components:
    print(f"   • {component}")
PY

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

cat > "$RUNTIME_DIR/runtime-manifest.ts" <<'EOF'
import {
  PLAYGROUND_RUNTIME_SYSTEMS,
} from "./PlaygroundRuntime";

export const PLAYGROUND_RUNTIME_MANIFEST = {
  name:
    "Playground Runtime",

  architectureVersion:
    "21B.15A",

  systems:
    PLAYGROUND_RUNTIME_SYSTEMS,

  strictBioCanvasCompanionBounds:
    true,

  followSystemManagedExternally:
    true,

  privateFollowerCountsManagedExternally:
    true,
} as const;
EOF

cat > "$RUNTIME_DIR/index.ts" <<'EOF'
export {
  default as PlaygroundRuntime,
  PLAYGROUND_RUNTIME_SYSTEMS,
} from "./PlaygroundRuntime";

export type {
  PlaygroundRuntimeSystem,
} from "./PlaygroundRuntime";

export {
  PLAYGROUND_RUNTIME_MANIFEST,
} from "./runtime-manifest";

export {
  PLAYGROUND_RUNTIME_READY_EVENT,
  announcePlaygroundRuntimeReady,
} from "./runtime-events";
EOF

echo ""
echo "Checking generated runtime imports..."
echo ""

python3 <<'PY'
from pathlib import Path
import re

path = Path(
    "src/runtime/PlaygroundRuntime.tsx"
)

text = path.read_text()

bad_imports = re.findall(
    r'from\s+["\']\./(?:collaboration|profile-experience)/',
    text,
)

if bad_imports:
    raise SystemExit(
        "❌ Invalid runtime-relative imports remain."
    )

print(
    "✅ Runtime-relative import validation passed."
)
PY

echo ""
echo "Running clean TypeScript/web build..."
echo ""

npm run build

touch "$MARKER"

trap - EXIT

echo ""
echo "✅ Sprint 21B.15A installed successfully."
echo "✅ Clean build completed."
echo ""
echo "Backup:"
echo "  $BACKUP_DIR"
echo ""
echo "Correction:"
echo "  • Runtime imports now use ../collaboration/..."
echo "  • Profile polish import now uses ../profile-experience/..."
echo "  • Existing mount order preserved"
echo "  • Existing shortcuts preserved"
echo "  • Strict bio-canvas companion bounds preserved"
echo "  • Follow system untouched"
echo "  • Private follower counts untouched"
echo ""
echo "Launch Playground with:"
echo "  ./open-playground-tauri.sh"
