#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
PRESENCE_DIR="src/presence"
PLAYGROUND_FILE="src/components/YourPlayground/YourPlayground.tsx"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR=".sprint-backups/sprint-20b-$STAMP"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " PLAYGROUND — Sprint 20B"
echo " Ambient Presence"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ ! -f package.json ]]; then
  echo "❌ Run this installer from the worlds project root."
  exit 1
fi

if [[ ! -f "$PLAYGROUND_FILE" ]]; then
  echo "❌ Missing $PLAYGROUND_FILE"
  exit 1
fi

mkdir -p "$PRESENCE_DIR"
mkdir -p "$BACKUP_DIR"

for file in \
  "$PLAYGROUND_FILE" \
  "$PRESENCE_DIR/PresenceTypes.ts" \
  "$PRESENCE_DIR/PresenceManager.ts" \
  "$PRESENCE_DIR/PresenceContext.tsx" \
  "$PRESENCE_DIR/PresenceOrb.tsx" \
  "$PRESENCE_DIR/PresenceLayer.tsx" \
  "$PRESENCE_DIR/Presence.css"
do
  if [[ -f "$file" ]]; then
    cp "$file" "$BACKUP_DIR/$(basename "$file")"
  fi
done

echo "✅ Backup created: $BACKUP_DIR"

cat > "$PRESENCE_DIR/PresenceTypes.ts" <<'TS'
export type PresenceStatus =
  | "exploring"
  | "editing"
  | "idle";

export type PresenceMode =
  | "off"
  | "ambient"
  | "full";

export type PresenceUser = {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  x: number;
  y: number;
  status: PresenceStatus;
  color: string;
  joinedAt: number;
  activity?: string;
  themeVariant?: string;
};

export type PresenceSnapshot = {
  users: PresenceUser[];
  mode: PresenceMode;
};
TS

cat > "$PRESENCE_DIR/PresenceManager.ts" <<'TS'
import type {
  PresenceMode,
  PresenceSnapshot,
  PresenceUser,
} from "./PresenceTypes";

const STORAGE_KEY = "playground.presence.mode.v1";

type Listener = () => void;

type RuntimeUser = PresenceUser & {
  originX: number;
  originY: number;
  phaseX: number;
  phaseY: number;
  speedX: number;
  speedY: number;
  rangeX: number;
  rangeY: number;
};

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function readStoredMode(): PresenceMode {
  if (typeof window === "undefined") {
    return "full";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (
    stored === "off" ||
    stored === "ambient" ||
    stored === "full"
  ) {
    return stored;
  }

  return "full";
}

class PresenceManager {
  private users = new Map<string, RuntimeUser>();

  private listeners = new Set<Listener>();

  private mode: PresenceMode = readStoredMode();

  private snapshot: PresenceSnapshot = {
    users: [],
    mode: this.mode,
  };

  private animationFrame: number | null = null;

  private lastPublishedAt = 0;

  private consumerCount = 0;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): PresenceSnapshot => {
    return this.snapshot;
  };

  getServerSnapshot = (): PresenceSnapshot => {
    return {
      users: [],
      mode: "full",
    };
  };

  connect(): void {
    this.consumerCount += 1;

    if (this.consumerCount === 1) {
      this.start();
    }
  }

  disconnect(): void {
    this.consumerCount = Math.max(0, this.consumerCount - 1);

    if (this.consumerCount === 0) {
      this.stop();
    }
  }

  addUser(user: PresenceUser): void {
    const seed = hashString(user.id);

    this.users.set(user.id, {
      ...user,
      originX: clamp(user.x, 7, 93),
      originY: clamp(user.y, 9, 89),
      phaseX: (seed % 628) / 100,
      phaseY: ((seed >>> 4) % 628) / 100,
      speedX: 0.00018 + (seed % 7) * 0.000012,
      speedY: 0.00015 + (seed % 5) * 0.000014,
      rangeX: 4 + (seed % 5),
      rangeY: 3 + (seed % 4),
    });

    this.publish();
  }

  updateUser(
    id: string,
    changes: Partial<Omit<PresenceUser, "id">>,
  ): void {
    const current = this.users.get(id);

    if (!current) {
      return;
    }

    const next = {
      ...current,
      ...changes,
    };

    if (typeof changes.x === "number") {
      next.originX = clamp(changes.x, 7, 93);
    }

    if (typeof changes.y === "number") {
      next.originY = clamp(changes.y, 9, 89);
    }

    this.users.set(id, next);
    this.publish();
  }

  removeUser(id: string): void {
    if (this.users.delete(id)) {
      this.publish();
    }
  }

  setMode(mode: PresenceMode): void {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }

    this.publish();
  }

  clear(): void {
    this.users.clear();
    this.publish();
  }

  private start(): void {
    if (
      this.animationFrame !== null ||
      typeof window === "undefined"
    ) {
      return;
    }

    const animate = (time: number) => {
      this.animationFrame = window.requestAnimationFrame(animate);

      if (time - this.lastPublishedAt < 90) {
        return;
      }

      this.lastPublishedAt = time;

      for (const [id, user] of this.users) {
        const xWave =
          Math.sin(time * user.speedX + user.phaseX) *
          user.rangeX;

        const yWave =
          Math.sin(time * user.speedY + user.phaseY) *
          user.rangeY;

        const secondaryX =
          Math.sin(time * user.speedY * 0.47 + user.phaseY) *
          1.4;

        const secondaryY =
          Math.cos(time * user.speedX * 0.53 + user.phaseX) *
          1.2;

        this.users.set(id, {
          ...user,
          x: clamp(
            user.originX + xWave + secondaryX,
            6,
            94,
          ),
          y: clamp(
            user.originY + yWave + secondaryY,
            8,
            91,
          ),
        });
      }

      this.publish();
    };

    this.animationFrame = window.requestAnimationFrame(animate);
  }

  private stop(): void {
    if (
      this.animationFrame === null ||
      typeof window === "undefined"
    ) {
      return;
    }

    window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }

  private publish(): void {
    this.snapshot = {
      users: Array.from(this.users.values()).map(
        ({
          originX: _originX,
          originY: _originY,
          phaseX: _phaseX,
          phaseY: _phaseY,
          speedX: _speedX,
          speedY: _speedY,
          rangeX: _rangeX,
          rangeY: _rangeY,
          ...user
        }) => user,
      ),
      mode: this.mode,
    };

    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const presenceManager = new PresenceManager();

export const Presence = {
  addUser: (user: PresenceUser) => {
    presenceManager.addUser(user);
  },

  updateUser: (
    id: string,
    changes: Partial<Omit<PresenceUser, "id">>,
  ) => {
    presenceManager.updateUser(id, changes);
  },

  removeUser: (id: string) => {
    presenceManager.removeUser(id);
  },

  setMode: (mode: PresenceMode) => {
    presenceManager.setMode(mode);
  },

  clear: () => {
    presenceManager.clear();
  },
};
TS

cat > "$PRESENCE_DIR/PresenceContext.tsx" <<'TSX'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import type { ReactNode } from "react";
import type {
  PresenceMode,
  PresenceUser,
} from "./PresenceTypes";

import {
  Presence,
  presenceManager,
} from "./PresenceManager";

type PresenceContextValue = {
  users: PresenceUser[];
  mode: PresenceMode;
  setMode: (mode: PresenceMode) => void;
};

const PresenceContext =
  createContext<PresenceContextValue | null>(null);

type PresenceProviderProps = {
  children: ReactNode;
};

export function PresenceProvider({
  children,
}: PresenceProviderProps) {
  const snapshot = useSyncExternalStore(
    presenceManager.subscribe,
    presenceManager.getSnapshot,
    presenceManager.getServerSnapshot,
  );

  useEffect(() => {
    presenceManager.connect();

    Presence.addUser({
      id: "maya",
      username: "@maya",
      displayName: "Maya",
      x: 18,
      y: 24,
      color: "#67b4ff",
      status: "exploring",
      activity: "Exploring",
      joinedAt: Date.now(),
      themeVariant: "minimal",
    });

    Presence.addUser({
      id: "chris",
      username: "@chris",
      displayName: "Chris",
      x: 74,
      y: 38,
      color: "#6ee7b7",
      status: "editing",
      activity: "Editing",
      joinedAt: Date.now(),
      themeVariant: "minimal",
    });

    return () => {
      Presence.removeUser("maya");
      Presence.removeUser("chris");
      presenceManager.disconnect();
    };
  }, []);

  const value = useMemo<PresenceContextValue>(
    () => ({
      users: snapshot.users,
      mode: snapshot.mode,
      setMode: Presence.setMode,
    }),
    [snapshot],
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(): PresenceContextValue {
  const context = useContext(PresenceContext);

  if (!context) {
    throw new Error(
      "usePresence must be used inside PresenceProvider.",
    );
  }

  return context;
}
TSX

cat > "$PRESENCE_DIR/PresenceOrb.tsx" <<'TSX'
import type {
  CSSProperties,
} from "react";

import type {
  PresenceMode,
  PresenceUser,
} from "./PresenceTypes";

import "./Presence.css";

type Props = {
  user: PresenceUser;
  mode: PresenceMode;
};

function formatJoinedTime(joinedAt: number): string {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - joinedAt) / 60000),
  );

  if (elapsedMinutes < 1) {
    return "Just arrived";
  }

  if (elapsedMinutes === 1) {
    return "Here for 1 minute";
  }

  return `Here for ${elapsedMinutes} minutes`;
}

export default function PresenceOrb({
  user,
  mode,
}: Props) {
  const style = {
    left: `${user.x}%`,
    top: `${user.y}%`,
    "--presence-color": user.color,
  } as CSSProperties;

  const initial =
    user.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={[
        "presence-orb",
        `presence-orb--${user.status}`,
        `presence-orb--${mode}`,
      ].join(" ")}
      data-presence-theme={
        user.themeVariant ?? "minimal"
      }
      style={style}
    >
      <div className="presence-orb__energy">
        <div className="presence-avatar">
          {mode === "full" && user.avatar ? (
            <img
              className="presence-avatar__image"
              src={user.avatar}
              alt=""
            />
          ) : (
            <span aria-hidden="true">
              {mode === "ambient" ? "" : initial}
            </span>
          )}
        </div>
      </div>

      {mode === "full" && (
        <div
          className="presence-card"
          role="status"
        >
          <strong>{user.displayName}</strong>

          <span>
            {user.activity ??
              user.status.charAt(0).toUpperCase() +
                user.status.slice(1)}
          </span>

          <small>
            {formatJoinedTime(user.joinedAt)}
          </small>
        </div>
      )}
    </div>
  );
}
TSX

cat > "$PRESENCE_DIR/PresenceLayer.tsx" <<'TSX'
import { usePresence } from "./PresenceContext";
import PresenceOrb from "./PresenceOrb";

import "./Presence.css";

export default function PresenceLayer() {
  const {
    users,
    mode,
  } = usePresence();

  if (mode === "off") {
    return null;
  }

  return (
    <div
      className={`presence-layer presence-layer--${mode}`}
      aria-label={
        mode === "full"
          ? "Active explorers"
          : undefined
      }
      aria-hidden={mode === "ambient"}
    >
      {users.map((user) => (
        <PresenceOrb
          key={user.id}
          user={user}
          mode={mode}
        />
      ))}
    </div>
  );
}
TSX

cat > "$PRESENCE_DIR/PresenceSettings.tsx" <<'TSX'
import type { PresenceMode } from "./PresenceTypes";
import { usePresence } from "./PresenceContext";

import "./Presence.css";

const modes: {
  value: PresenceMode;
  label: string;
  description: string;
}[] = [
  {
    value: "off",
    label: "Off",
    description: "Hide active explorers",
  },
  {
    value: "ambient",
    label: "Ambient",
    description: "Show anonymous drifting lights",
  },
  {
    value: "full",
    label: "Full",
    description: "Show explorer identity on hover",
  },
];

export default function PresenceSettings() {
  const {
    mode,
    setMode,
  } = usePresence();

  return (
    <div
      className="presence-settings"
      aria-label="Floating active explorers"
    >
      <span className="presence-settings__title">
        Active explorers
      </span>

      <div
        className="presence-settings__options"
        role="group"
        aria-label="Presence display mode"
      >
        {modes.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              mode === option.value
                ? "presence-settings__button is-active"
                : "presence-settings__button"
            }
            aria-pressed={mode === option.value}
            title={option.description}
            onClick={() => setMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
TSX

cat > "$PRESENCE_DIR/index.ts" <<'TS'
export {
  Presence,
  presenceManager,
} from "./PresenceManager";

export {
  PresenceProvider,
  usePresence,
} from "./PresenceContext";

export { default as PresenceLayer } from "./PresenceLayer";
export { default as PresenceOrb } from "./PresenceOrb";
export { default as PresenceSettings } from "./PresenceSettings";

export type {
  PresenceMode,
  PresenceSnapshot,
  PresenceStatus,
  PresenceUser,
} from "./PresenceTypes";
TS

cat > "$PRESENCE_DIR/Presence.css" <<'CSS'
.presence-layer {
  position: absolute;
  inset: 0;
  z-index: 30;
  overflow: hidden;
  pointer-events: none;
}

.presence-orb {
  --presence-color: rgba(255, 255, 255, 0.85);

  position: absolute;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
  transition:
    left 180ms linear,
    top 180ms linear,
    opacity 300ms ease;
  animation:
    presence-arrival 700ms
    cubic-bezier(0.22, 1, 0.36, 1)
    both;
  pointer-events: auto;
}

.presence-orb__energy {
  display: grid;
  place-items: center;
  border-radius: 999px;
}

.presence-avatar {
  width: 34px;
  height: 34px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 2px solid var(--presence-color);
  border-radius: 999px;
  color: white;
  font-size: 12px;
  font-weight: 700;
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.27),
      rgba(255, 255, 255, 0.08)
    );
  box-shadow:
    0 0 0 4px rgba(255, 255, 255, 0.05),
    0 8px 24px rgba(0, 0, 0, 0.22),
    0 0 24px var(--presence-color);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.presence-avatar__image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.presence-orb--editing .presence-avatar {
  box-shadow:
    0 0 0 4px rgba(255, 255, 255, 0.07),
    0 8px 24px rgba(0, 0, 0, 0.2),
    0 0 32px var(--presence-color);
}

.presence-orb--idle .presence-avatar {
  animation: presence-breathe 3.8s ease-in-out infinite;
  opacity: 0.72;
}

.presence-orb--ambient {
  pointer-events: none;
}

.presence-orb--ambient .presence-avatar {
  width: 13px;
  height: 13px;
  border: 0;
  color: transparent;
  background: var(--presence-color);
  box-shadow:
    0 0 10px var(--presence-color),
    0 0 24px var(--presence-color);
  opacity: 0.68;
}

.presence-card {
  position: absolute;
  left: 50%;
  top: calc(100% + 10px);
  min-width: 150px;
  padding: 10px 12px;
  display: grid;
  gap: 3px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  color: white;
  background: rgba(19, 19, 22, 0.72);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
  opacity: 0;
  transform:
    translate(-50%, -4px)
    scale(0.97);
  transform-origin: top center;
  transition:
    opacity 160ms ease,
    transform 220ms
    cubic-bezier(0.22, 1, 0.36, 1);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  pointer-events: none;
}

.presence-orb:hover .presence-card,
.presence-orb:focus-within .presence-card {
  opacity: 1;
  transform:
    translate(-50%, 0)
    scale(1);
}

.presence-card strong {
  font-size: 12px;
  line-height: 1.2;
}

.presence-card span {
  font-size: 11px;
  line-height: 1.3;
  opacity: 0.76;
}

.presence-card small {
  margin-top: 2px;
  font-size: 9px;
  line-height: 1.3;
  opacity: 0.48;
}

.presence-settings {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 90;
  padding: 7px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 999px;
  color: white;
  background: rgba(20, 20, 23, 0.72);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.presence-settings__title {
  padding-left: 7px;
  font-size: 10px;
  white-space: nowrap;
  opacity: 0.7;
}

.presence-settings__options {
  display: flex;
  gap: 3px;
}

.presence-settings__button {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 6px 9px;
  color: rgba(255, 255, 255, 0.67);
  background: transparent;
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.presence-settings__button:hover {
  color: white;
  background: rgba(255, 255, 255, 0.08);
}

.presence-settings__button.is-active {
  color: #111;
  background: white;
}

@keyframes presence-arrival {
  0% {
    opacity: 0;
    transform:
      translate(-50%, -40%)
      scale(0.65);
    filter: blur(6px);
  }

  55% {
    opacity: 1;
    transform:
      translate(-50%, -52%)
      scale(1.08);
    filter: blur(0);
  }

  100% {
    opacity: 1;
    transform:
      translate(-50%, -50%)
      scale(1);
  }
}

@keyframes presence-breathe {
  0%,
  100% {
    transform: scale(0.94);
    opacity: 0.66;
  }

  50% {
    transform: scale(1.04);
    opacity: 0.86;
  }
}

@media (max-width: 720px) {
  .presence-settings {
    right: 12px;
    bottom: 12px;
  }

  .presence-settings__title {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .presence-orb,
  .presence-avatar {
    animation: none;
    transition: opacity 180ms ease;
  }
}
CSS

python3 <<'PY'
from pathlib import Path

path = Path(
    "src/components/YourPlayground/YourPlayground.tsx"
)

text = path.read_text()

settings_import = (
    'import PresenceSettings '
    'from "../../presence/PresenceSettings";'
)

layer_import = (
    'import PresenceLayer '
    'from "../../presence/PresenceLayer";'
)

if settings_import not in text:
    if layer_import in text:
        text = text.replace(
            layer_import,
            layer_import + "\n" + settings_import,
            1,
        )
    else:
        anchor = 'import ProfileActionBar from "../ProfileActionBar";'

        if anchor not in text:
            raise SystemExit(
                "❌ Could not locate an import anchor."
            )

        text = text.replace(
            anchor,
            anchor + "\n" + settings_import,
            1,
        )

if "<PresenceSettings />" not in text:
    layer_markup = "<PresenceLayer />"

    if layer_markup not in text:
        raise SystemExit(
            "❌ Could not locate <PresenceLayer />."
        )

    text = text.replace(
        layer_markup,
        layer_markup
        + "\n        {isOwner && <PresenceSettings />}",
        1,
    )

path.write_text(text)

print("✅ Owner presence settings integrated.")
PY

echo
echo "Created Sprint 20B files:"
find "$PRESENCE_DIR" -maxdepth 1 -type f -print | sort

echo
echo "Running TypeScript validation..."
npx tsc --noEmit

echo
echo "Running production build..."
npm run build

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ Sprint 20B complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Presence modes:"
echo "  Off     — hides active explorers"
echo "  Ambient — anonymous drifting lights"
echo "  Full    — identities appear on hover"
echo
echo "Owner preference persists automatically."
echo
echo "Backup:"
echo "  $BACKUP_DIR"
echo
echo "Launch with:"
echo "  npm run tauri dev"
