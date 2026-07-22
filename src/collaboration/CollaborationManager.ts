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
