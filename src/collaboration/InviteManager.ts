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
