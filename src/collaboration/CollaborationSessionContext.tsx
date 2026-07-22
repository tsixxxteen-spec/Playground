import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type {
  CollaborationInvitation,
  IncomingCollaborationInvitation,
} from "./invitationTypes";

import {
  clearRequestedCollaborationSessionId,
  createCollaborationSessionId,
  getRequestedCollaborationSessionId,
} from "./sessionLinks";

import type {
  CollaborationParticipant,
  CollaborationSession,
} from "./types";

const STORAGE_KEY =
  "playground:collaboration-session";

const LOCAL_OWNER_ID =
  "local-owner";

type CollaborationSessionContextValue = {
  session: CollaborationSession;
  inviteDialogOpen: boolean;

  openInviteDialog: () => void;
  closeInviteDialog: () => void;

  inviteParticipant: (
    username: string,
  ) => CollaborationInvitation | null;

  cancelInvitation: (
    invitationId: string,
  ) => void;

  receiveInvitation: (
    invitation: IncomingCollaborationInvitation,
  ) => void;

  acceptInvitation: (
    invitationId: string,
  ) => void;

  declineInvitation: (
    invitationId: string,
  ) => void;

  removeParticipant: (
    participantId: string,
  ) => void;

  setParticipants: (
    participants: CollaborationParticipant[],
  ) => void;

  renameSession: (
    name: string,
  ) => void;

  resetSession: () => void;
};

function createDefaultSession(): CollaborationSession {
  return {
    id: createCollaborationSessionId(),
    name: "My Playground",
    isShared: false,
    createdAt: Date.now(),
    ownerId: LOCAL_OWNER_ID,
    participants: [
      {
        id: LOCAL_OWNER_ID,
        name: "You",
        role: "owner",
        isOnline: true,
      },
    ],
    pendingInvitations: [],
    incomingInvitations: [],
  };
}

function readStoredSession(): CollaborationSession {
  if (typeof window === "undefined") {
    return createDefaultSession();
  }

  try {
    const stored = window.localStorage.getItem(
      STORAGE_KEY,
    );

    if (!stored) {
      return createDefaultSession();
    }

    const parsed =
      JSON.parse(stored) as Partial<CollaborationSession>;

    if (
      !parsed.id ||
      !Array.isArray(parsed.participants)
    ) {
      return createDefaultSession();
    }

    return {
      id: parsed.id,
      name: parsed.name ?? "My Playground",
      isShared:
        parsed.isShared ??
        parsed.participants.length > 1,
      createdAt:
        parsed.createdAt ?? Date.now(),
      ownerId:
        parsed.ownerId ?? LOCAL_OWNER_ID,
      participants: parsed.participants,
      pendingInvitations:
        parsed.pendingInvitations ?? [],
      incomingInvitations:
        parsed.incomingInvitations ?? [],
    };
  } catch {
    return createDefaultSession();
  }
}

const CollaborationSessionContext =
  createContext<CollaborationSessionContextValue | null>(
    null,
  );

type CollaborationSessionProviderProps = {
  children: ReactNode;
};

export function CollaborationSessionProvider({
  children,
}: CollaborationSessionProviderProps) {
  const [session, setSession] =
    useState<CollaborationSession>(
      readStoredSession,
    );

  const [inviteDialogOpen, setInviteDialogOpen] =
    useState(false);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(session),
    );
  }, [session]);

  useEffect(() => {
    const requestedSessionId =
      getRequestedCollaborationSessionId();

    if (
      !requestedSessionId ||
      requestedSessionId === session.id
    ) {
      return;
    }

    setSession((currentSession) => {
      const alreadyExists =
        currentSession.incomingInvitations.some(
          (invitation) =>
            invitation.sessionId ===
            requestedSessionId,
        );

      if (alreadyExists) {
        return currentSession;
      }

      const invitation: IncomingCollaborationInvitation =
        {
          id: createCollaborationSessionId(),
          sessionId: requestedSessionId,
          sessionName: "Shared Playground",
          inviterId: "shared-link-owner",
          inviterName: "Playground creator",
          createdAt: Date.now(),
        };

      return {
        ...currentSession,
        incomingInvitations: [
          ...currentSession.incomingInvitations,
          invitation,
        ],
      };
    });

    clearRequestedCollaborationSessionId();
  }, [session.id]);

  const openInviteDialog = useCallback(() => {
    setInviteDialogOpen(true);
  }, []);

  const closeInviteDialog = useCallback(() => {
    setInviteDialogOpen(false);
  }, []);

  const inviteParticipant = useCallback(
    (
      username: string,
    ): CollaborationInvitation | null => {
      const normalizedUsername =
        username.trim();

      if (!normalizedUsername) {
        return null;
      }

      let createdInvitation:
        | CollaborationInvitation
        | null = null;

      setSession((currentSession) => {
        const participantAlreadyExists =
          currentSession.participants.some(
            (participant) =>
              participant.name.toLowerCase() ===
              normalizedUsername.toLowerCase(),
          );

        const invitationAlreadyExists =
          currentSession.pendingInvitations.some(
            (invitation) =>
              invitation.recipientName.toLowerCase() ===
                normalizedUsername.toLowerCase() &&
              invitation.status === "pending",
          );

        if (
          participantAlreadyExists ||
          invitationAlreadyExists
        ) {
          return currentSession;
        }

        createdInvitation = {
          id: createCollaborationSessionId(),
          sessionId: currentSession.id,
          sessionName: currentSession.name,
          inviterId: currentSession.ownerId,
          inviterName: "You",
          recipientName: normalizedUsername,
          createdAt: Date.now(),
          status: "pending",
        };

        return {
          ...currentSession,
          isShared: true,
          pendingInvitations: [
            ...currentSession.pendingInvitations,
            createdInvitation,
          ],
        };
      });

      setInviteDialogOpen(false);

      return createdInvitation;
    },
    [],
  );

  const cancelInvitation = useCallback(
    (invitationId: string) => {
      setSession((currentSession) => {
        const pendingInvitations =
          currentSession.pendingInvitations.filter(
            (invitation) =>
              invitation.id !== invitationId,
          );

        return {
          ...currentSession,
          isShared:
            currentSession.participants.length > 1 ||
            pendingInvitations.length > 0,
          pendingInvitations,
        };
      });
    },
    [],
  );

  const receiveInvitation = useCallback(
    (
      invitation: IncomingCollaborationInvitation,
    ) => {
      setSession((currentSession) => {
        const alreadyExists =
          currentSession.incomingInvitations.some(
            (existingInvitation) =>
              existingInvitation.id ===
                invitation.id ||
              existingInvitation.sessionId ===
                invitation.sessionId,
          );

        if (alreadyExists) {
          return currentSession;
        }

        return {
          ...currentSession,
          incomingInvitations: [
            ...currentSession.incomingInvitations,
            invitation,
          ],
        };
      });
    },
    [],
  );

  const acceptInvitation = useCallback(
    (invitationId: string) => {
      setSession((currentSession) => {
        const invitation =
          currentSession.incomingInvitations.find(
            (item) =>
              item.id === invitationId,
          );

        if (!invitation) {
          return currentSession;
        }

        return {
          id: invitation.sessionId,
          name: invitation.sessionName,
          isShared: true,
          createdAt: Date.now(),
          ownerId: invitation.inviterId,
          participants: [
            {
              id: invitation.inviterId,
              name: invitation.inviterName,
              role: "owner",
              isOnline: true,
            },
            {
              id: LOCAL_OWNER_ID,
              name: "You",
              role: "collaborator",
              isOnline: true,
            },
          ],
          pendingInvitations: [],
          incomingInvitations:
            currentSession.incomingInvitations.filter(
              (item) =>
                item.id !== invitationId,
            ),
        };
      });
    },
    [],
  );

  const declineInvitation = useCallback(
    (invitationId: string) => {
      setSession((currentSession) => ({
        ...currentSession,
        incomingInvitations:
          currentSession.incomingInvitations.filter(
            (invitation) =>
              invitation.id !== invitationId,
          ),
      }));
    },
    [],
  );

  const removeParticipant = useCallback(
    (participantId: string) => {
      setSession((currentSession) => {
        const participants =
          currentSession.participants.filter(
            (participant) =>
              participant.id !== participantId ||
              participant.role === "owner",
          );

        return {
          ...currentSession,
          isShared:
            participants.length > 1 ||
            currentSession.pendingInvitations.length >
              0,
          participants,
        };
      });
    },
    [],
  );

  const setParticipants = useCallback(
    (
      participants: CollaborationParticipant[],
    ) => {
      setSession((currentSession) => ({
        ...currentSession,
        isShared:
          participants.length > 1 ||
          currentSession.pendingInvitations.length >
            0,
        participants,
      }));
    },
    [],
  );

  const renameSession = useCallback(
    (name: string) => {
      const normalizedName = name.trim();

      if (!normalizedName) {
        return;
      }

      setSession((currentSession) => ({
        ...currentSession,
        name: normalizedName,
      }));
    },
    [],
  );

  const resetSession = useCallback(() => {
    setSession(createDefaultSession());
    setInviteDialogOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      inviteDialogOpen,
      openInviteDialog,
      closeInviteDialog,
      inviteParticipant,
      cancelInvitation,
      receiveInvitation,
      acceptInvitation,
      declineInvitation,
      removeParticipant,
      setParticipants,
      renameSession,
      resetSession,
    }),
    [
      session,
      inviteDialogOpen,
      openInviteDialog,
      closeInviteDialog,
      inviteParticipant,
      cancelInvitation,
      receiveInvitation,
      acceptInvitation,
      declineInvitation,
      removeParticipant,
      setParticipants,
      renameSession,
      resetSession,
    ],
  );

  return (
    <CollaborationSessionContext.Provider
      value={value}
    >
      {children}
    </CollaborationSessionContext.Provider>
  );
}

export function useCollaborationSession() {
  const context = useContext(
    CollaborationSessionContext,
  );

  if (!context) {
    throw new Error(
      "useCollaborationSession must be used inside CollaborationSessionProvider.",
    );
  }

  return context;
}
