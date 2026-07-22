#!/usr/bin/env bash

set -e

FILE="src/profile-experiences/shared/Stats.tsx"

if [ ! -f "$FILE" ]; then
  echo "❌ Cannot find $FILE"
  exit 1
fi

cp "$FILE" "${FILE}.backup.$(date +%Y%m%d-%H%M%S)"

python3 <<'PY'
from pathlib import Path
import re

path = Path("src/profile-experiences/shared/Stats.tsx")
text = path.read_text()

text = re.sub(
    r'const\s+visibleStats\s*=\s*\[',
    '''const visibleStats: {
  label: string;
  value: number;
  onClick?: () => void;
}[] = [''',
    text,
    count=1
)

text = re.sub(
    r'if\s*\(\s*event\.key\s*===\s*"Enter"\s*\|\|\s*event\.key\s*===\s*" "\s*\)\s*\{\s*event\.preventDefault\(\);\s*onClick\(\);\s*\}',
    '''if (
      (event.key === "Enter" || event.key === " ") &&
      onClick
    ) {
      event.preventDefault();
      onClick();
    }''',
    text,
    flags=re.MULTILINE
)

path.write_text(text)
print("✅ Stats.tsx patched")
PY

echo
echo "Running TypeScript..."
npx tsc --noEmit
