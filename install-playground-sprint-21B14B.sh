#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.14B"
MARKER=".playground-sprint-21B14B-installed"
TARGET_FILE="src/profile-experience/polish/profilePolishRuntime.ts"
BACKUP_DIR=".playground-backups/sprint-21B14B-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] ||
  fail "Run this installer from the worlds project root."

[[ -f "$TARGET_FILE" ]] ||
  fail "$TARGET_FILE was not found. Install Sprint 21B.14A first."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR/$(dirname "$TARGET_FILE")"
cp -p "$TARGET_FILE" "$BACKUP_DIR/$TARGET_FILE"

rollback() {
  code=$?

  if [[ $code -ne 0 ]]; then
    echo ""
    echo "⚠️ Installation failed. Restoring the previous runtime..."

    cp -p \
      "$BACKUP_DIR/$TARGET_FILE" \
      "$TARGET_FILE"

    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/profile-experience/polish/profilePolishRuntime.ts"
)

text = path.read_text()

old_function = """function markBioCanvas(
  profileRoot: HTMLElement,
): HTMLElement {
  const existingCanvas =
    findFirst(
      BIO_CANVAS_SELECTORS,
      profileRoot,
    );

  const canvas =
    existingCanvas ??
    profileRoot;

  addClass(
    canvas,
    "playground-profile-bio-canvas",
  );

  canvas.setAttribute(
    "data-playground-bio-canvas",
    "true",
  );

  return canvas;
}
"""

new_function = """function markBioCanvas(
  profileRoot: HTMLElement,
): HTMLElement | null {
  const canvas =
    findFirst(
      BIO_CANVAS_SELECTORS,
      profileRoot,
    );

  if (!canvas) {
    profileRoot.removeAttribute(
      "data-playground-has-bio-canvas",
    );

    return null;
  }

  addClass(
    canvas,
    "playground-profile-bio-canvas",
  );

  canvas.setAttribute(
    "data-playground-bio-canvas",
    "true",
  );

  profileRoot.setAttribute(
    "data-playground-has-bio-canvas",
    "true",
  );

  return canvas;
}
"""

if old_function not in text:
    raise SystemExit(
        "❌ Could not locate the previous markBioCanvas implementation."
    )

text = text.replace(
    old_function,
    new_function,
    1,
)

old_refresh = """      canvas =
        markBioCanvas(
          profileRoot,
        );

      polishCompanions(
        canvas,
      );

      polishMovableObjects(
        canvas,
      );

      expandEffects(
        profileRoot,
      );
"""

new_refresh = """      canvas =
        markBioCanvas(
          profileRoot,
        );

      if (canvas) {
        polishCompanions(
          canvas,
        );

        polishMovableObjects(
          canvas,
        );
      }

      expandEffects(
        profileRoot,
      );
"""

if old_refresh not in text:
    raise SystemExit(
        "❌ Could not locate the profile canvas refresh block."
    )

text = text.replace(
    old_refresh,
    new_refresh,
    1,
)

path.write_text(
    text,
)

print(
    "✅ Removed full-profile movement fallback."
)

print(
    "✅ Companion movement now requires a valid bio canvas."
)
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
echo "Correction applied:"
echo "  • Companion movement stays within the profile bio canvas"
echo "  • Full profile page is no longer a fallback boundary"
echo "  • No companion boundary processing occurs without a bio canvas"
echo "  • Existing Follow system remains untouched"
echo "  • Existing private follower counts remain untouched"
echo ""
echo "Launch Playground with:"
echo "  ./open-playground-tauri.sh"
