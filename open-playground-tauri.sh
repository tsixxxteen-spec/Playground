#!/usr/bin/env bash

set -euo pipefail

echo "🚀 Launching Playground with Tauri..."

if [[ ! -f package.json ]]; then
  echo "❌ package.json not found."
  echo "Run this inside your worlds project folder."
  exit 1
fi

if [[ ! -d src-tauri ]]; then
  echo "❌ src-tauri folder not found."
  echo "This does not appear to be the Tauri project root."
  exit 1
fi

echo "📦 Checking dependencies..."
npm install

echo "🛠 Starting Tauri development app..."

if npm run | grep -qE '(^|[[:space:]])tauri([[:space:]]|$)'; then
  npm run tauri dev
elif npm run | grep -qE '(^|[[:space:]])tauri:dev([[:space:]]|$)'; then
  npm run tauri:dev
elif npx tauri --version >/dev/null 2>&1; then
  npx tauri dev
else
  echo "❌ Tauri CLI is not available."
  echo "Installing the local Tauri CLI..."
  npm install --save-dev @tauri-apps/cli
  npx tauri dev
fi
