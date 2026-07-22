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
