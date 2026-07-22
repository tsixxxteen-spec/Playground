#!/usr/bin/env bash
set -euo pipefail

PLAYGROUND_FILE="src/components/YourPlayground/YourPlayground.tsx"
PLAYGROUND_CSS="src/components/YourPlayground/YourPlayground.css"
PRESENCE_DIR="src/presence"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " PLAYGROUND — Sprint 20A.2"
echo " Live Presence Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ ! -f "$PLAYGROUND_FILE" ]]; then
  echo "❌ Missing: $PLAYGROUND_FILE"
  exit 1
fi

if [[ ! -f "$PLAYGROUND_CSS" ]]; then
  echo "❌ Missing: $PLAYGROUND_CSS"
  exit 1
fi

for required_file in \
  "$PRESENCE_DIR/PresenceTypes.ts" \
  "$PRESENCE_DIR/PresenceContext.tsx" \
  "$PRESENCE_DIR/PresenceOrb.tsx" \
  "$PRESENCE_DIR/PresenceLayer.tsx" \
  "$PRESENCE_DIR/Presence.css"
do
  if [[ ! -f "$required_file" ]]; then
    echo "❌ Missing: $required_file"
    exit 1
  fi
done

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR=".sprint-backups/sprint-20a2-$STAMP"

mkdir -p "$BACKUP_DIR"

cp "$PLAYGROUND_FILE" "$BACKUP_DIR/YourPlayground.tsx"
cp "$PLAYGROUND_CSS" "$BACKUP_DIR/YourPlayground.css"

echo "✅ Backup created at $BACKUP_DIR"

python3 <<'PY'
from pathlib import Path

path = Path("src/components/YourPlayground/YourPlayground.tsx")
text = path.read_text()

provider_import = (
    'import { PresenceProvider } from "../../presence/PresenceContext";'
)
layer_import = (
    'import PresenceLayer from "../../presence/PresenceLayer";'
)

# Add imports only once.
import_anchor = 'import ProfileActionBar from "../ProfileActionBar";'

if provider_import not in text:
    if import_anchor not in text:
        raise SystemExit(
            "❌ Could not locate ProfileActionBar import."
        )

    text = text.replace(
        import_anchor,
        import_anchor
        + "\n"
        + provider_import
        + "\n"
        + layer_import,
        1,
    )

# Integrate the presence provider and shell only once.
if 'className="your-playground-presence-shell"' not in text:
    return_start = text.find("  return <>")

    if return_start == -1:
        raise SystemExit(
            "❌ Could not locate the YourPlayground return fragment."
        )

    text = text.replace(
        "  return <>",
        """  return (
    <PresenceProvider>
      <div className="your-playground-presence-shell">
        <PresenceLayer />""",
        1,
    )

    closing_fragment = text.rfind("  </>;")

    if closing_fragment == -1:
        raise SystemExit(
            "❌ Could not locate the closing return fragment."
        )

    text = (
        text[:closing_fragment]
        + """      </div>
    </PresenceProvider>
  );"""
        + text[closing_fragment + len("  </>;"):]
    )

path.write_text(text)

print("✅ PresenceProvider integrated.")
print("✅ PresenceLayer added.")
print("✅ Playground presence shell added.")
PY

cat >> "$PLAYGROUND_CSS" <<'EOF'

/* Sprint 20A.2 — Live Presence */
.your-playground-presence-shell {
  position: relative;
  width: 100%;
  min-height: 100%;
  isolation: isolate;
}

.your-playground-presence-shell > .presence-layer {
  z-index: 30;
}

@media (prefers-reduced-motion: reduce) {
  .presence-orb {
    transition:
      opacity 0.2s ease,
      left 0s linear,
      top 0s linear;
  }
}
