#!/usr/bin/env bash
set -euo pipefail

COLLAB_DIR="src/collaboration"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR=".sprint-backups/sprint-21a-$STAMP"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " PLAYGROUND — Sprint 21A"
echo " Collaboration Foundation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ ! -f "package.json" ]]; then
  echo "❌ Run this installer from the Playground project root."
  exit 1
fi

mkdir -p "$COLLAB_DIR"
mkdir -p "$BACKUP_DIR"

FILES=(
  "$COLLAB_DIR/CollaboratorTypes.ts"
  "$COLLAB_DIR/CollaborationManager.ts"
  "$COLLAB_DIR/InviteManager.ts"
  "$COLLAB_DIR/CollaborationContext.tsx"
)

for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    cp "$file" "$BACKUP_DIR/$(basename "$file")"
  fi
done

echo "✅ Collaboration folder ready"
echo "✅ Existing files backed up to: $BACKUP_DIR"

cat > "$COLLAB_DIR/CollaboratorTypes.ts" <<'TS'
export type CollaboratorRole =
  | "owner"
  | "editor"
  | "viewer";

export type CollaboratorStatus =
  | "active"
  | "invited"
  | "offline";

export type InviteStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

export type Collaborator = {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  joinedAt: number;
  lastActiveAt: number;
};

export type CollaborationInvite = {
  id: string;
  playgroundId: string;
  createdBy: string;
  recipientEmail?: string;
  recipientName?: string;
  role: Exclude<CollaboratorRole, "owner">;
  status: InviteStatus;
  token: string;
  createdAt: number;
  expiresAt?: number;
  acceptedAt?: number;
  revokedAt?: number;
};

export type CollaborationSnapshot = {
  collaborators: Collaborator[];
  currentUserId: string | null;
};

export type InviteSnapshot = {
  invites: CollaborationInvite[];
};

export type CreateInviteInput = {
  playgroundId: string;
  createdBy: string;
  recipientEmail?: string;
  recipientName?: string;
  role: Exclude<CollaboratorRole, "owner">;
  expiresAt?: number;
};

export type AddCollaboratorInput = {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  role: CollaboratorRole;
  status?: CollaboratorStatus;
};

export type CollaborationContextValue = {
  collaborators: Collaborator[];
  invites: CollaborationInvite[];
  currentUserId: string | null;
  currentCollaborator: Collaborator | null;

  setCurrentUser: (userId: string | null) => void;

  addCollaborator: (
    input: AddCollaboratorInput,
  ) => Collaborator;

  updateCollaborator: (
    id: string,
    changes: Partial<
      Omit<Collaborator, "id" | "joinedAt">
    >,
  ) => void;

  removeCollaborator: (id: string) => void;

  setCollaboratorRole: (
    id: string,
    role: CollaboratorRole,
  ) => void;

  createInvite: (
    input: CreateInviteInput,
  ) => CollaborationInvite;

  acceptInvite: (
    inviteId: string,
    collaborator: AddCollaboratorInput,
  ) => CollaborationInvite | null;

  revokeInvite: (inviteId: string) => void;

  removeInvite: (inviteId: string) => void;

  clearCollaboration: () => void;
};
TS

cat > "$COLLAB_DIR/CollaborationManager.ts" <<'TS'
import type {
  AddCollaboratorInput,
  CollaborationSnapshot,
  Collaborator,
  CollaboratorRole,
} from "./CollaboratorTypes";

type Listener = () => void;

const STORAGE_KEY =
  "playground.collaboration.collaborators.v1";

const EMPTY_SNAPSHOT: CollaborationSnapshot = {
  collaborators: [],
  currentUserId: null,
};

function loadStoredSnapshot(): CollaborationSnapshot {
  if (typeof window === "undefined") {
    return EMPTY_SNAPSHOT;
  }

  try {
    const stored = window.localStorage.getItem(
      STORAGE_KEY,
    );

    if (!stored) {
      return EMPTY_SNAPSHOT;
    }

    const parsed = JSON.parse(
      stored,
    ) as Partial<CollaborationSnapshot>;

    return {
      collaborators: Array.isArray(
        parsed.collaborators,
      )
        ? parsed.collaborators
        : [],
      currentUserId:
        typeof parsed.currentUserId === "string"
          ? parsed.currentUserId
          : null,
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

class CollaborationManager {
  private listeners = new Set<Listener>();

  private snapshot: CollaborationSnapshot =
    loadStoredSnapshot();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): CollaborationSnapshot => {
    return this.snapshot;
  };

  getServerSnapshot = (): CollaborationSnapshot => {
    return EMPTY_SNAPSHOT;
  };

  setCurrentUser(userId: string | null): void {
    if (this.snapshot.currentUserId === userId) {
      return;
    }

    this.commit({
      ...this.snapshot,
      currentUserId: userId,
    });
  }

  addCollaborator(
    input: AddCollaboratorInput,
  ): Collaborator {
    const existing = this.getCollaborator(input.id);
    const now = Date.now();

    const collaborator: Collaborator = existing
      ? {
          ...existing,
          ...input,
          status: input.status ?? existing.status,
          lastActiveAt: now,
        }
      : {
          ...input,
          status: input.status ?? "active",
          joinedAt: now,
          lastActiveAt: now,
        };

    const collaborators = existing
      ? this.snapshot.collaborators.map((item) =>
          item.id === collaborator.id
            ? collaborator
            : item,
        )
      : [
          ...this.snapshot.collaborators,
          collaborator,
        ];

    this.commit({
      ...this.snapshot,
      collaborators,
    });

    return collaborator;
  }

  updateCollaborator(
    id: string,
    changes: Partial<
      Omit<Collaborator, "id" | "joinedAt">
    >,
  ): void {
    let changed = false;

    const collaborators =
      this.snapshot.collaborators.map(
        (collaborator) => {
          if (collaborator.id !== id) {
            return collaborator;
          }

          changed = true;

          return {
            ...collaborator,
            ...changes,
          };
        },
      );

    if (!changed) {
      return;
    }

    this.commit({
      ...this.snapshot,
      collaborators,
    });
  }

  removeCollaborator(id: string): void {
    const collaborators =
      this.snapshot.collaborators.filter(
        (collaborator) => collaborator.id !== id,
      );

    if (
      collaborators.length ===
      this.snapshot.collaborators.length
    ) {
      return;
    }

    this.commit({
      collaborators,
      currentUserId:
        this.snapshot.currentUserId === id
          ? null
          : this.snapshot.currentUserId,
    });
  }

  setCollaboratorRole(
    id: string,
    role: CollaboratorRole,
  ): void {
    this.updateCollaborator(id, {
      role,
      lastActiveAt: Date.now(),
    });
  }

  setCollaboratorStatus(
    id: string,
    status: Collaborator["status"],
  ): void {
    this.updateCollaborator(id, {
      status,
      lastActiveAt: Date.now(),
    });
  }

  touchCollaborator(id: string): void {
    this.updateCollaborator(id, {
      lastActiveAt: Date.now(),
    });
  }

  getCollaborator(
    id: string,
  ): Collaborator | undefined {
    return this.snapshot.collaborators.find(
      (collaborator) => collaborator.id === id,
    );
  }

  getCurrentCollaborator():
    | Collaborator
    | undefined {
    if (!this.snapshot.currentUserId) {
      return undefined;
    }

    return this.getCollaborator(
      this.snapshot.currentUserId,
    );
  }

  clear(): void {
    this.commit(EMPTY_SNAPSHOT);
  }

  private commit(
    snapshot: CollaborationSnapshot,
  ): void {
    this.snapshot = {
      collaborators: [...snapshot.collaborators],
      currentUserId: snapshot.currentUserId,
    };

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(this.snapshot),
        );
      } catch {
        // The application still works when storage
        // is blocked or unavailable.
      }
    }

    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const collaborationManager =
  new CollaborationManager();

export const Collaboration = {
  setCurrentUser: (userId: string | null) => {
    collaborationManager.setCurrentUser(userId);
  },

  addCollaborator: (
    input: AddCollaboratorInput,
  ) => {
    return collaborationManager.addCollaborator(
      input,
    );
  },

  updateCollaborator: (
    id: string,
    changes: Partial<
      Omit<Collaborator, "id" | "joinedAt">
    >,
  ) => {
    collaborationManager.updateCollaborator(
      id,
      changes,
    );
  },

  removeCollaborator: (id: string) => {
    collaborationManager.removeCollaborator(id);
  },

  setRole: (
    id: string,
    role: CollaboratorRole,
  ) => {
    collaborationManager.setCollaboratorRole(
      id,
      role,
    );
  },

  setStatus: (
    id: string,
    status: Collaborator["status"],
  ) => {
    collaborationManager.setCollaboratorStatus(
      id,
      status,
    );
  },

  touch: (id: string) => {
    collaborationManager.touchCollaborator(id);
  },

  clear: () => {
    collaborationManager.clear();
  },
};
TS

cat > "$COLLAB_DIR/InviteManager.ts" <<'TS'
import type {
  CollaborationInvite,
  CreateInviteInput,
  InviteSnapshot,
} from "./CollaboratorTypes";

type Listener = () => void;

const STORAGE_KEY =
  "playground.collaboration.invites.v1";

const EMPTY_SNAPSHOT: InviteSnapshot = {
  invites: [],
};

function createId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return [
    prefix,
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("_");
}

function loadStoredSnapshot(): InviteSnapshot {
  if (typeof window === "undefined") {
    return EMPTY_SNAPSHOT;
  }

  try {
    const stored = window.localStorage.getItem(
      STORAGE_KEY,
    );

    if (!stored) {
      return EMPTY_SNAPSHOT;
    }

    const parsed = JSON.parse(
      stored,
    ) as Partial<InviteSnapshot>;

    return {
      invites: Array.isArray(parsed.invites)
        ? parsed.invites
        : [],
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

class InviteManager {
  private listeners = new Set<Listener>();

  private snapshot: InviteSnapshot =
    loadStoredSnapshot();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): InviteSnapshot => {
    return this.snapshot;
  };

  getServerSnapshot = (): InviteSnapshot => {
    return EMPTY_SNAPSHOT;
  };

  createInvite(
    input: CreateInviteInput,
  ): CollaborationInvite {
    const now = Date.now();

    const invite: CollaborationInvite = {
      id: createId("invite"),
      token: createId("token"),
      playgroundId: input.playgroundId,
      createdBy: input.createdBy,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      role: input.role,
      status: "pending",
      createdAt: now,
      expiresAt: input.expiresAt,
    };

    this.commit({
      invites: [...this.snapshot.invites, invite],
    });

    return invite;
  }

  acceptInvite(
    inviteId: string,
  ): CollaborationInvite | null {
    const invite = this.getInvite(inviteId);

    if (
      !invite ||
      invite.status !== "pending" ||
      this.isExpired(invite)
    ) {
      if (invite && this.isExpired(invite)) {
        this.markExpired(invite.id);
      }

      return null;
    }

    const accepted: CollaborationInvite = {
      ...invite,
      status: "accepted",
      acceptedAt: Date.now(),
    };

    this.replaceInvite(accepted);
    return accepted;
  }

  revokeInvite(inviteId: string): void {
    const invite = this.getInvite(inviteId);

    if (
      !invite ||
      invite.status === "revoked"
    ) {
      return;
    }

    this.replaceInvite({
      ...invite,
      status: "revoked",
      revokedAt: Date.now(),
    });
  }

  removeInvite(inviteId: string): void {
    const invites = this.snapshot.invites.filter(
      (invite) => invite.id !== inviteId,
    );

    if (
      invites.length === this.snapshot.invites.length
    ) {
      return;
    }

    this.commit({ invites });
  }

  getInvite(
    inviteId: string,
  ): CollaborationInvite | undefined {
    return this.snapshot.invites.find(
      (invite) => invite.id === inviteId,
    );
  }

  getInviteByToken(
    token: string,
  ): CollaborationInvite | undefined {
    return this.snapshot.invites.find(
      (invite) => invite.token === token,
    );
  }

  clear(): void {
    this.commit(EMPTY_SNAPSHOT);
  }

  private isExpired(
    invite: CollaborationInvite,
  ): boolean {
    return Boolean(
      invite.expiresAt &&
        invite.expiresAt <= Date.now(),
    );
  }

  private markExpired(inviteId: string): void {
    const invite = this.getInvite(inviteId);

    if (!invite) {
      return;
    }

    this.replaceInvite({
      ...invite,
      status: "expired",
    });
  }

  private replaceInvite(
    replacement: CollaborationInvite,
  ): void {
    const invites = this.snapshot.invites.map(
      (invite) =>
        invite.id === replacement.id
          ? replacement
          : invite,
    );

    this.commit({ invites });
  }

  private commit(snapshot: InviteSnapshot): void {
    this.snapshot = {
      invites: [...snapshot.invites],
    };

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(this.snapshot),
        );
      } catch {
        // Invitations remain available for the
        // current session when storage is blocked.
      }
    }

    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const inviteManager =
  new InviteManager();

export const Invites = {
  create: (input: CreateInviteInput) => {
    return inviteManager.createInvite(input);
  },

  accept: (inviteId: string) => {
    return inviteManager.acceptInvite(inviteId);
  },

  revoke: (inviteId: string) => {
    inviteManager.revokeInvite(inviteId);
  },

  remove: (inviteId: string) => {
    inviteManager.removeInvite(inviteId);
  },

  getByToken: (token: string) => {
    return inviteManager.getInviteByToken(token);
  },

  clear: () => {
    inviteManager.clear();
  },
};
TS

cat > "$COLLAB_DIR/CollaborationContext.tsx" <<'TSX'
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import type { ReactNode } from "react";

import type {
  AddCollaboratorInput,
  CollaborationContextValue,
  CreateInviteInput,
} from "./CollaboratorTypes";

import {
  Collaboration,
  collaborationManager,
} from "./CollaborationManager";

import {
  Invites,
  inviteManager,
} from "./InviteManager";

const CollaborationContext =
  createContext<CollaborationContextValue | null>(
    null,
  );

type CollaborationProviderProps = {
  children: ReactNode;
};

export function CollaborationProvider({
  children,
}: CollaborationProviderProps) {
  const collaborationSnapshot =
    useSyncExternalStore(
      collaborationManager.subscribe,
      collaborationManager.getSnapshot,
      collaborationManager.getServerSnapshot,
    );

  const inviteSnapshot = useSyncExternalStore(
    inviteManager.subscribe,
    inviteManager.getSnapshot,
    inviteManager.getServerSnapshot,
  );

  const value =
    useMemo<CollaborationContextValue>(() => {
      const currentCollaborator =
        collaborationSnapshot.currentUserId
          ? collaborationSnapshot.collaborators.find(
              (collaborator) =>
                collaborator.id ===
                collaborationSnapshot.currentUserId,
            ) ?? null
          : null;

      return {
        collaborators:
          collaborationSnapshot.collaborators,

        invites: inviteSnapshot.invites,

        currentUserId:
          collaborationSnapshot.currentUserId,

        currentCollaborator,

        setCurrentUser: Collaboration.setCurrentUser,

        addCollaborator:
          Collaboration.addCollaborator,

        updateCollaborator:
          Collaboration.updateCollaborator,

        removeCollaborator:
          Collaboration.removeCollaborator,

        setCollaboratorRole: Collaboration.setRole,

        createInvite: (
          input: CreateInviteInput,
        ) => {
          return Invites.create(input);
        },

        acceptInvite: (
          inviteId: string,
          collaborator: AddCollaboratorInput,
        ) => {
          const accepted =
            Invites.accept(inviteId);

          if (!accepted) {
            return null;
          }

          Collaboration.addCollaborator({
            ...collaborator,
            role: accepted.role,
            status: "active",
          });

          return accepted;
        },

        revokeInvite: Invites.revoke,

        removeInvite: Invites.remove,

        clearCollaboration: () => {
          Collaboration.clear();
          Invites.clear();
        },
      };
    }, [
      collaborationSnapshot,
      inviteSnapshot,
    ]);

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration():
  CollaborationContextValue {
  const context = useContext(
    CollaborationContext,
  );

  if (!context) {
    throw new Error(
      "useCollaboration must be used inside " +
        "CollaborationProvider.",
    );
  }

  return context;
}
TSX

echo
echo "Created:"
printf '  %s\n' "${FILES[@]}"

echo
echo "Running TypeScript validation..."
npx tsc --noEmit

echo
echo "Running production build..."
npm run build

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ Sprint 21A complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Collaboration foundation includes:"
echo "  • Owner, editor, and viewer roles"
echo "  • Collaborator state management"
echo "  • Persistent local collaboration data"
echo "  • Invite creation and revocation"
echo "  • Invite acceptance"
echo "  • Expiration handling"
echo "  • React collaboration context"
echo "  • External-store subscriptions"
echo
echo "Backup:"
echo "  $BACKUP_DIR"
