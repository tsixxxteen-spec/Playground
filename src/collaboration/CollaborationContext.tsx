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
