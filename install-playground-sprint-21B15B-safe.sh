#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.15B"
MARKER=".playground-sprint-21B15B-installed"

RUNTIME_DIR="src/runtime"
RUNTIME_FILE="$RUNTIME_DIR/PlaygroundRuntime.tsx"
CONFIG_FILE="$RUNTIME_DIR/runtime-config.ts"
METADATA_FILE="$RUNTIME_DIR/build-metadata.ts"
INDEX_FILE="$RUNTIME_DIR/index.ts"
ENV_FILE=".env.production.local"
ENV_EXAMPLE_FILE=".env.production.local.example"

BACKUP_DIR=".playground-backups/sprint-21B15B-safe-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f "package.json" ]] ||
  fail "Run this installer from the worlds project root."

[[ -f "$RUNTIME_FILE" ]] ||
  fail "$RUNTIME_FILE was not found. Complete Sprint 21B.15A first."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR/$RUNTIME_DIR"

FILES_TO_BACKUP="
$RUNTIME_FILE
$CONFIG_FILE
$METADATA_FILE
$INDEX_FILE
$ENV_FILE
$ENV_EXAMPLE_FILE
"

for file in $FILES_TO_BACKUP
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

    for file in $FILES_TO_BACKUP
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
  node -e "
    const pkg = require('./package.json');
    process.stdout.write(pkg.version || '0.0.0');
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
    configured === "development" ||
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

cat > "$METADATA_FILE" <<'EOF'
import {
  PLAYGROUND_RUNTIME_CONFIG,
} from "./runtime-config";

function readMetadataValue(
  value: unknown,
  fallback: string,
): string {
  return typeof value === "string" &&
    value.trim().length > 0
    ? value
    : fallback;
}

export const PLAYGROUND_BUILD_METADATA = {
  application:
    "Playground",

  version:
    readMetadataValue(
      import.meta.env
        .VITE_PLAYGROUND_VERSION,
      "0.0.0",
    ),

  buildNumber:
    readMetadataValue(
      import.meta.env
        .VITE_PLAYGROUND_BUILD_NUMBER,
      "development",
    ),

  buildDate:
    readMetadataValue(
      import.meta.env
        .VITE_PLAYGROUND_BUILD_DATE,
      "unknown",
    ),

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

cat > "$ENV_FILE" <<EOF
VITE_PLAYGROUND_VERSION=$VERSION
VITE_PLAYGROUND_BUILD_NUMBER=$BUILD_NUMBER
VITE_PLAYGROUND_BUILD_DATE=$BUILD_DATE
VITE_PLAYGROUND_RELEASE_CHANNEL=production

VITE_PLAYGROUND_MOUNT_DIAGNOSTICS=false
VITE_PLAYGROUND_MOUNT_RELEASE_READINESS=false

VITE_PLAYGROUND_AUTO_DIAGNOSTICS=false
VITE_PLAYGROUND_AUTO_RELEASE_READINESS=false

VITE_PLAYGROUND_VERBOSE_LOGGING=false
EOF

cat > "$ENV_EXAMPLE_FILE" <<'EOF'
VITE_PLAYGROUND_VERSION=0.0.0
VITE_PLAYGROUND_BUILD_NUMBER=YYYYMMDDHHMMSS
VITE_PLAYGROUND_BUILD_DATE=YYYY-MM-DDTHH:MM:SSZ
VITE_PLAYGROUND_RELEASE_CHANNEL=production

VITE_PLAYGROUND_MOUNT_DIAGNOSTICS=false
VITE_PLAYGROUND_MOUNT_RELEASE_READINESS=false

VITE_PLAYGROUND_AUTO_DIAGNOSTICS=false
VITE_PLAYGROUND_AUTO_RELEASE_READINESS=false

VITE_PLAYGROUND_VERBOSE_LOGGING=false
EOF

python3 <<'PY'
from pathlib import Path
import re

path = Path(
    "src/runtime/PlaygroundRuntime.tsx"
)

source = path.read_text()

if 'from "./runtime-config"' not in source:
    react_import = re.search(
        r'import\s+\{\s*useEffect\s*\}\s+from\s+["\']react["\'];',
        source,
    )

    if not react_import:
        raise SystemExit(
            "❌ Could not find the React useEffect import."
        )

    imports = '''

import {
  PLAYGROUND_RUNTIME_CONFIG,
} from "./runtime-config";

import {
  announcePlaygroundBuildMetadata,
} from "./build-metadata";
'''

    source = (
        source[:react_import.end()]
        + imports
        + source[react_import.end():]
    )

if "announcePlaygroundBuildMetadata();" not in source:
    runtime_ready_call = '''    announcePlaygroundRuntimeReady(
      PLAYGROUND_RUNTIME_SYSTEMS,
    );
'''

    if runtime_ready_call not in source:
        raise SystemExit(
            "❌ Could not find the runtime-ready startup call."
        )

    source = source.replace(
        runtime_ready_call,
        runtime_ready_call
        + "\n"
        + "    announcePlaygroundBuildMetadata();\n",
        1,
    )

diagnostics_plain = re.compile(
    r"^\s*<CollaborationDiagnosticsPanel\s*/>\s*$",
    re.MULTILINE,
)

if diagnostics_plain.search(source):
    source = diagnostics_plain.sub(
        '''      {PLAYGROUND_RUNTIME_CONFIG
        .diagnostics
        .mountPanel && (
          <CollaborationDiagnosticsPanel />
        )}''',
        source,
        count=1,
    )

readiness_plain = re.compile(
    r"^\s*<ReleaseReadinessPanel\s*/>\s*$",
    re.MULTILINE,
)

if readiness_plain.search(source):
    source = readiness_plain.sub(
        '''      {PLAYGROUND_RUNTIME_CONFIG
        .releaseReadiness
        .mountPanel && (
          <ReleaseReadinessPanel />
        )}''',
        source,
        count=1,
    )

path.write_text(source)

print(
    "✅ PlaygroundRuntime feature flags installed."
)
print(
    "✅ Build metadata startup event installed."
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

blocks = []

if 'from "./runtime-config"' not in text:
    blocks.append(
'''export {
  PLAYGROUND_RUNTIME_CONFIG,
} from "./runtime-config";

export type {
  PlaygroundReleaseChannel,
  PlaygroundRuntimeConfig,
} from "./runtime-config";'''
    )

if 'from "./build-metadata"' not in text:
    blocks.append(
'''export {
  PLAYGROUND_BUILD_METADATA,
  PLAYGROUND_BUILD_METADATA_EVENT,
  announcePlaygroundBuildMetadata,
} from "./build-metadata";

export type {
  PlaygroundBuildMetadata,
} from "./build-metadata";'''
    )

if blocks:
    text = (
        text.rstrip()
        + "\n\n"
        + "\n\n".join(blocks)
        + "\n"
    )

path.write_text(text)

print(
    "✅ Runtime exports updated."
)
PY

echo ""
echo "Validating Sprint $SPRINT_ID..."
echo ""

python3 <<'PY'
from pathlib import Path

required = {
    "src/runtime/runtime-config.ts": [
        "PLAYGROUND_RUNTIME_CONFIG",
        "strictBioCanvasCompanionBounds",
        "fullPageEnvironmentalEffects",
    ],
    "src/runtime/build-metadata.ts": [
        "PLAYGROUND_BUILD_METADATA",
        "VITE_PLAYGROUND_VERSION",
        "VITE_PLAYGROUND_BUILD_NUMBER",
        "VITE_PLAYGROUND_BUILD_DATE",
    ],
    "src/runtime/PlaygroundRuntime.tsx": [
        "PLAYGROUND_RUNTIME_CONFIG",
        "announcePlaygroundBuildMetadata",
    ],
    ".env.production.local": [
        "VITE_PLAYGROUND_RELEASE_CHANNEL=production",
        "VITE_PLAYGROUND_MOUNT_DIAGNOSTICS=false",
    ],
}

for filename, tokens in required.items():
    path = Path(filename)

    if not path.exists():
        raise SystemExit(
            f"❌ Missing required file: {filename}"
        )

    text = path.read_text()

    for token in tokens:
        if token not in text:
            raise SystemExit(
                f"❌ Missing {token} in {filename}"
            )

print(
    "✅ Sprint validation passed."
)
PY

echo ""
echo "Running clean production build..."
echo ""

npm run build

touch "$MARKER"

trap - EXIT

echo ""
echo "✅ Sprint $SPRINT_ID installed successfully."
echo "✅ Production build completed cleanly."
echo ""
echo "Build metadata:"
echo "  Version:       $VERSION"
echo "  Build number:  $BUILD_NUMBER"
echo "  Build date:    $BUILD_DATE"
echo ""
echo "Production defaults:"
echo "  • Diagnostics startup disabled"
echo "  • Release-readiness startup disabled"
echo "  • Automatic development checks disabled"
echo "  • Verbose production logging disabled"
echo "  • Strict bio-canvas bounds preserved"
echo "  • Full-page environmental effects preserved"
echo "  • Follow system untouched"
echo "  • Private follower counts untouched"
