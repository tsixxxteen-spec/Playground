import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  CollaborationParticipant,
  CollaborationSession,
} from "./types";

type CollaborationSessionContextValue = {
  session: CollaborationSession;
  inviteDialogOpen: boolean;
  openInviteDialog: () => void;
  closeInviteDialog: () => void;
  inviteParticipant: (username: string) => void;
  removeParticipant: (participantId: string) => void;
  setParticipants: (
    participants: CollaborationParticipant[],
  ) => void;
};

const defaultSession: CollaborationSession = {
  id: "local-playground-session",
  isShared: false,
  participants: [
    {
      id: "local-owner",
      name: "You",
      role: "owner",
      isOnline: true,
    },
  ],
};

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
    useState<CollaborationSession>(defaultSession);

  const [inviteDialogOpen, setInviteDialogOpen] =
    useState(false);

  const openInviteDialog = useCallback(() => {
    setInviteDialogOpen(true);
  }, []);

  const closeInviteDialog = useCallback(() => {
    setInviteDialogOpen(false);
  }, []);

  const inviteParticipant = useCallback(
    (username: string) => {
      const normalizedUsername = username.trim();

      if (!normalizedUsername) {
        return;
      }

      setSession((currentSession) => {
        const alreadyExists =
          currentSession.participants.some(
            (participant) =>
              participant.name.toLowerCase() ===
              normalizedUsername.toLowerCase(),
          );

        if (alreadyExists) {
          return currentSession;
        }

        const participant: CollaborationParticipant = {
          id: crypto.randomUUID(),
          name: normalizedUsername,
          role: "collaborator",
          isOnline: false,
        };

        return {
          ...currentSession,
          isShared: true,
          participants: [
            ...currentSession.participants,
            participant,
          ],
        };
      });

      setInviteDialogOpen(false);
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
          isShared: participants.length > 1,
          participants,
        };
      });
    },
    [],
  );

  const setParticipants = useCallback(
    (participants: CollaborationParticipant[]) => {
      setSession((currentSession) => ({
        ...currentSession,
        isShared: participants.length > 1,
        participants,
      }));
    },
    [],
  );

  const value = useMemo(
    () => ({
      session,
      inviteDialogOpen,
      openInviteDialog,
      closeInviteDialog,
      inviteParticipant,
      removeParticipant,
      setParticipants,
    }),
    [
      session,
      inviteDialogOpen,
      openInviteDialog,
      closeInviteDialog,
      inviteParticipant,
      removeParticipant,
      setParticipants,
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
