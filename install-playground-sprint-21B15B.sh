#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.15B"
MARKER=".playground-sprint-21B15B-installed"

RUNTIME_DIR="src/runtime"
RUNTIME_FILE="$RUNTIME_DIR/PlaygroundRuntime.tsx"
CONFIG_FILE="$RUNTIME_DIR/runtime-config.ts"
METADATA_FILE="$RUNTIME_DIR/build-metadata.ts"
INDEX_FILE="$RUNTIME_DIR/index.ts"

PACKAGE_FILE="package.json"
VITE_CONFIG_TS="vite.config.ts"
VITE_CONFIG_JS="vite.config.js"

BACKUP_DIR=".playground-backups/sprint-21B15B-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f "$PACKAGE_FILE" ]] ||
  fail "Run this installer from the worlds project root."

[[ -f "$RUNTIME_FILE" ]] ||
  fail "$RUNTIME_FILE was not found. Complete Sprint 21B.15A first."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR/$RUNTIME_DIR"

cp -p "$RUNTIME_FILE" "$BACKUP_DIR/$RUNTIME_FILE"

for file in \
  "$CONFIG_FILE" \
  "$METADATA_FILE" \
  "$INDEX_FILE" \
  "$VITE_CONFIG_TS" \
  "$VITE_CONFIG_JS"
do
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

    cp -p "$BACKUP_DIR/$RUNTIME_FILE" "$RUNTIME_FILE"

    for file in \
      "$CONFIG_FILE" \
      "$METADATA_FILE" \
      "$INDEX_FILE" \
      "$VITE_CONFIG_TS" \
      "$VITE_CONFIG_JS"
    do
      if [[ -f "$BACKUP_DIR/$file" ]]; then
        mkdir -p "$(dirname "$file")"
        cp -p "$BACKUP_DIR/$file" "$file"
      else
        rm -f "$file"
      fi
    done

    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

VERSION="$(
  node -p "
    try {
      require('./package.json').version || '0.0.0'
    } catch {
      '0.0.0'
    }
  "
)"

BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
BUILD_NUMBER="$(date -u +"%Y%m%d%H%M%S")"

cat > "$CONFIG_FILE" <<'EOF'
export type PlaygroundReleaseChannel =
  | "development"
  | "preview"
  | "production";

function readBooleanEnvironmentValue(
  value: unknown,
  fallback: boolean,
): boolean {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized =
    value.trim().toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no"
  ) {
    return false;
  }

  return fallback;
}

function resolveReleaseChannel():
  PlaygroundReleaseChannel {
  const configured =
    import.meta.env
      .VITE_PLAYGROUND_RELEASE_CHANNEL;

  if (
    configured === "preview" ||
    configured === "production"
  ) {
    return configured;
  }

  return import.meta.env.PROD
    ? "production"
    : "development";
}

const isDevelopment =
  import.meta.env.DEV;

const isProduction =
  import.meta.env.PROD;

export const PLAYGROUND_RUNTIME_CONFIG = {
  environment:
    import.meta.env.MODE,

  releaseChannel:
    resolveReleaseChannel(),

  isDevelopment,

  isProduction,

  diagnostics: {
    mountPanel:
      readBooleanEnvironmentValue(
        import.meta.env
          .VITE_PLAYGROUND_MOUNT_DIAGNOSTICS,
        isDevelopment,
      ),

    runAutomatically:
      readBooleanEnvironmentValue(
        import.meta.env
          .VITE_PLAYGROUND_AUTO_DIAGNOSTICS,
        isDevelopment,
      ),

    allowShortcut:
      true,
  },

  releaseReadiness: {
    mountPanel:
      readBooleanEnvironmentValue(
        import.meta.env
          .VITE_PLAYGROUND_MOUNT_RELEASE_READINESS,
        isDevelopment,
      ),

    runAutomatically:
      readBooleanEnvironmentValue(
        import.meta.env
          .VITE_PLAYGROUND_AUTO_RELEASE_READINESS,
        isDevelopment,
      ),

    allowShortcut:
      true,
  },

  logging: {
    verbose:
      readBooleanEnvironmentValue(
        import.meta.env
          .VITE_PLAYGROUND_VERBOSE_LOGGING,
        isDevelopment,
      ),
  },

  profileExperience: {
    strictBioCanvasCompanionBounds:
      true,

    fullPageEnvironmentalEffects:
      true,

    followSystemManagedExternally:
      true,

    privateFollowerCountsManagedExternally:
      true,
  },
} as const;

export type PlaygroundRuntimeConfig =
  typeof PLAYGROUND_RUNTIME_CONFIG;
EOF

cat > "$METADATA_FILE" <<EOF
import {
  PLAYGROUND_RUNTIME_CONFIG,
} from "./runtime-config";

declare const __PLAYGROUND_VERSION__:
  string;

declare const __PLAYGROUND_BUILD_DATE__:
  string;

declare const __PLAYGROUND_BUILD_NUMBER__:
  string;

export const PLAYGROUND_BUILD_METADATA = {
  application:
    "Playground",

  version:
    __PLAYGROUND_VERSION__,

  buildNumber:
    __PLAYGROUND_BUILD_NUMBER__,

  buildDate:
    __PLAYGROUND_BUILD_DATE__,

  architectureVersion:
    "21B.15B",

  environment:
    PLAYGROUND_RUNTIME_CONFIG.environment,

  releaseChannel:
    PLAYGROUND_RUNTIME_CONFIG.releaseChannel,

  production:
    PLAYGROUND_RUNTIME_CONFIG.isProduction,

  strictBioCanvasCompanionBounds:
    true,
} as const;

export type PlaygroundBuildMetadata =
  typeof PLAYGROUND_BUILD_METADATA;

export const PLAYGROUND_BUILD_METADATA_EVENT =
  "playground:build-metadata-ready";

export function announcePlaygroundBuildMetadata():
  void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_BUILD_METADATA_EVENT,
      {
        detail:
          PLAYGROUND_BUILD_METADATA,
      },
    ),
  );
}
EOF

python3 <<PY
from pathlib import Path
import json
import re

version = ${VERSION@Q}
build_date = ${BUILD_DATE@Q}
build_number = ${BUILD_NUMBER@Q}

ts_path = Path("vite.config.ts")
js_path = Path("vite.config.js")

config_path = (
    ts_path
    if ts_path.exists()
    else js_path
    if js_path.exists()
    else None
)

if config_path is None:
    raise SystemExit(
        "❌ No vite.config.ts or vite.config.js file was found."
    )

source = config_path.read_text()

definitions = {
    "__PLAYGROUND_VERSION__":
        json.dumps(version),
    "__PLAYGROUND_BUILD_DATE__":
        json.dumps(build_date),
    "__PLAYGROUND_BUILD_NUMBER__":
        json.dumps(build_number),
}

if "__PLAYGROUND_VERSION__" in source:
    print(
        "ℹ️ Playground Vite build constants already exist."
    )
else:
    define_block = (
        "  define: {\n"
        f'    __PLAYGROUND_VERSION__: '
        f'{json.dumps(definitions["__PLAYGROUND_VERSION__"])},\n'
        f'    __PLAYGROUND_BUILD_DATE__: '
        f'{json.dumps(definitions["__PLAYGROUND_BUILD_DATE__"])},\n'
        f'    __PLAYGROUND_BUILD_NUMBER__: '
        f'{json.dumps(definitions["__PLAYGROUND_BUILD_NUMBER__"])},\n'
        "  },\n"
    )

    config_object = re.search(
        r"defineConfig\s*\(\s*\{",
        source,
    )

    if config_object:
        insertion = config_object.end()

        source = (
            source[:insertion]
            + "\n"
            + define_block
            + source[insertion:]
        )
    else:
        export_object = re.search(
            r"export\s+default\s+\{",
            source,
        )

        if not export_object:
            raise SystemExit(
                "❌ Could not identify the Vite configuration object."
            )

        insertion = export_object.end()

        source = (
            source[:insertion]
            + "\n"
            + define_block
            + source[insertion:]
        )

    config_path.write_text(source)

    print(
        f"✅ Added Playground build constants to {config_path}."
    )
PY

python3 <<'PY'
from pathlib import Path
import re

path = Path(
    "src/runtime/PlaygroundRuntime.tsx"
)

source = path.read_text()

config_import = '''import {
  PLAYGROUND_RUNTIME_CONFIG,
} from "./runtime-config";

import {
  announcePlaygroundBuildMetadata,
} from "./build-metadata";

'''

if 'from "./runtime-config"' not in source:
    react_import = re.search(
        r'import\s+\{\s*useEffect\s*\}\s+from\s+["\']react["\'];\s*',
        source,
    )

    if not react_import:
        raise SystemExit(
            "❌ Could not find the React useEffect import."
        )

    source = (
        source[:react_import.end()]
        + "\n"
        + config_import
        + source[react_import.end():]
    )

old_effect = '''  useEffect(() => {
    announcePlaygroundRuntimeReady(
      PLAYGROUND_RUNTIME_SYSTEMS,
    );
  }, []);
'''

new_effect = '''  useEffect(() => {
    announcePlaygroundRuntimeReady(
      PLAYGROUND_RUNTIME_SYSTEMS,
    );

    announcePlaygroundBuildMetadata();
  }, []);
'''

if old_effect in source:
    source = source.replace(
        old_effect,
        new_effect,
        1,
    )
elif "announcePlaygroundBuildMetadata();" not in source:
    raise SystemExit(
        "❌ Could not safely update the Playground runtime startup effect."
    )

replacements = {
    r"^\s*<CollaborationDiagnosticsPanel\s*/>\s*$":
'''      {PLAYGROUND_RUNTIME_CONFIG
        .diagnostics
        .mountPanel && (
          <CollaborationDiagnosticsPanel />
        )}''',

    r"^\s*<ReleaseReadinessPanel\s*/>\s*$":
'''      {PLAYGROUND_RUNTIME_CONFIG
        .releaseReadiness
        .mountPanel && (
          <ReleaseReadinessPanel />
        )}''',
}

for pattern, replacement in replacements.items():
    if re.search(
        pattern,
        source,
        flags=re.MULTILINE,
    ):
        source = re.sub(
            pattern,
            replacement,
            source,
            count=1,
            flags=re.MULTILINE,
        )

path.write_text(source)

print(
    "✅ PlaygroundRuntime now uses centralized feature flags."
)
print(
    "✅ Build metadata announcement added."
)
PY

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/runtime/index.ts"
)

text = (
    path.read_text()
    if path.exists()
    else ""
)

exports = '''

export {
  PLAYGROUND_RUNTIME_CONFIG,
} from "./runtime-config";

export type {
  PlaygroundReleaseChannel,
  PlaygroundRuntimeConfig,
} from "./runtime-config";

export {
  PLAYGROUND_BUILD_METADATA,
  PLAYGROUND_BUILD_METADATA_EVENT,
  announcePlaygroundBuildMetadata,
} from "./build-metadata";

export type {
  PlaygroundBuildMetadata,
} from "./build-metadata";
'''

if 'from "./runtime-config"' not in text:
    text = (
        text.rstrip()
        + exports
        + "\n"
    )

path.write_text(text)

print(
    "✅ Runtime configuration and metadata exports added."
)
PY

cat > .env.production.local.example <<'EOF'
# Playground production release configuration

VITE_PLAYGROUND_RELEASE_CHANNEL=production

# Development panels should remain unmounted during normal production startup.
VITE_PLAYGROUND_MOUNT_DIAGNOSTICS=false
VITE_PLAYGROUND_MOUNT_RELEASE_READINESS=false

# Automatic development-only checks.
VITE_PLAYGROUND_AUTO_DIAGNOSTICS=false
VITE_PLAYGROUND_AUTO_RELEASE_READINESS=false

# Production logging.
VITE_PLAYGROUND_VERBOSE_LOGGING=false
EOF

echo ""
echo "Validating feature-flag installation..."
echo ""

python3 <<'PY'
from pathlib import Path

required_files = [
    Path(
        "src/runtime/runtime-config.ts"
    ),
    Path(
        "src/runtime/build-metadata.ts"
    ),
    Path(
        "src/runtime/PlaygroundRuntime.tsx"
    ),
]

for file in required_files:
    if not file.exists():
        raise SystemExit(
            f"❌ Missing required file: {file}"
        )

runtime = Path(
    "src/runtime/PlaygroundRuntime.tsx"
).read_text()

required_runtime_tokens = [
    "PLAYGROUND_RUNTIME_CONFIG",
    "announcePlaygroundBuildMetadata",
    "diagnostics",
    "releaseReadiness",
]

for token in required_runtime_tokens:
    if token not in runtime:
        raise SystemExit(
            f"❌ Runtime validation failed: {token}"
        )

config = Path(
    "src/runtime/runtime-config.ts"
).read_text()

required_config_tokens = [
    "strictBioCanvasCompanionBounds",
    "fullPageEnvironmentalEffects",
    "followSystemManagedExternally",
    "privateFollowerCountsManagedExternally",
]

for token in required_config_tokens:
    if token not in config:
        raise SystemExit(
            f"❌ Configuration validation failed: {token}"
        )

print(
    "✅ Feature-flag validation passed."
)
PY

echo ""
echo "Running clean production web build..."
echo ""

npm run build

touch "$MARKER"

trap - EXIT

echo ""
echo "✅ Sprint $SPRINT_ID installed successfully."
echo "✅ Production web build completed cleanly."
echo ""
echo "Backup:"
echo "  $BACKUP_DIR"
echo ""
echo "Build metadata:"
echo "  Version:       $VERSION"
echo "  Build number:  $BUILD_NUMBER"
echo "  Build date:    $BUILD_DATE"
echo ""
echo "Production behavior:"
echo "  • Diagnostics panel unmounted by default"
echo "  • Release Readiness panel unmounted by default"
echo "  • Automatic development checks disabled by default"
echo "  • Verbose production logging disabled"
echo "  • Runtime-ready events preserved"
echo "  • Hidden shortcut policy preserved"
echo "  • Strict bio-canvas companion bounds preserved"
echo "  • Full-page environmental effects preserved"
echo "  • Follow system untouched"
echo "  • Private follower counts untouched"
echo ""
echo "Launch Playground with:"
echo "  ./open-playground-tauri.sh"
