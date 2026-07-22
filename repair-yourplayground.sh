#!/usr/bin/env bash
set -e

FILE="src/components/YourPlayground/YourPlayground.tsx"

if [[ ! -f "$FILE" ]]; then
    echo "❌ Cannot find $FILE"
    exit 1
fi

cp "$FILE" "$FILE.backup.$(date +%Y%m%d_%H%M%S)"

python3 <<'PY'
from pathlib import Path
import re

path = Path("src/components/YourPlayground/YourPlayground.tsx")
text = path.read_text()

# Find the SECOND handleMessage (the duplicate)
matches = list(re.finditer(r'const\s+handleMessage\s*=\s*\(\)\s*=>\s*\{', text))

if len(matches) < 2:
    print("✅ No duplicate handleMessage found.")
    raise SystemExit(0)

dup_start = matches[1].start()

# Walk backwards to the duplicate profileUrl declaration
profile_start = text.rfind("const profileUrl =", 0, dup_start)

if profile_start == -1:
    raise SystemExit("❌ Couldn't locate duplicate block start.")

# Find the return statement after the duplicate
return_start = text.find("return <>", dup_start)

if return_start == -1:
    raise SystemExit("❌ Couldn't locate component return.")

new_text = text[:profile_start].rstrip() + "\n\n  " + text[return_start:]

path.write_text(new_text)

print("✅ Duplicate Sprint 18A block removed.")
PY

echo
echo "Running TypeScript..."
npx tsc --noEmit || true

echo
echo "Done."
