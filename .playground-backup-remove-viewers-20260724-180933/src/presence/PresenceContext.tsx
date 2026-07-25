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
return () => {
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
