import type {
  PresenceMode,
  PresenceSnapshot,
  PresenceUser,
} from "./PresenceTypes";
import { presenceAdapter } from "./PresenceAdapter";

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

  /**
   * Publishes the complete PresenceManager roster to the
   * collaboration interface.
   */
  syncCollaborationPresence(
    users: Array<{
      id: string;
      name: string;
      avatarUrl?: string;
      isOnline?: boolean;
      isOwner?: boolean;
    }>,
  ): void {
    presenceAdapter.sync(users);
  }

  /**
   * Publishes a newly joined user.
   */
  publishPresenceJoined(user: {
    id: string;
    name: string;
    avatarUrl?: string;
    isOnline?: boolean;
    isOwner?: boolean;
  }): void {
    presenceAdapter.joined(user);
  }

  /**
   * Publishes changes to an existing user.
   */
  publishPresenceUpdated(user: {
    id: string;
    name: string;
    avatarUrl?: string;
    isOnline?: boolean;
    isOwner?: boolean;
  }): void {
    presenceAdapter.updated(user);
  }

  /**
   * Removes a user from collaboration presence.
   */
  publishPresenceLeft(userId: string): void {
    presenceAdapter.left(userId);
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
