import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ReactNode } from "react";
import type { PresenceUser } from "./PresenceTypes";

type PresenceContextValue = {
  users: PresenceUser[];
};

const PresenceContext = createContext<PresenceContextValue>({
  users: [],
});

type PresenceProviderProps = {
  children: ReactNode;
};

export function PresenceProvider({
  children,
}: PresenceProviderProps) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const now = Date.now();

    setUsers([
      {
        id: "maya",
        username: "@maya",
        displayName: "Maya",
        x: 18,
        y: 24,
        color: "#67B4FF",
        status: "exploring",
        joinedAt: now,
      },
      {
        id: "chris",
        username: "@chris",
        displayName: "Chris",
        x: 74,
        y: 38,
        color: "#6EE7B7",
        status: "editing",
        joinedAt: now,
      },
    ]);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setUsers((current) =>
        current.map((user) => ({
          ...user,
          x: Math.max(
            6,
            Math.min(
              94,
              user.x + (Math.random() - 0.5) * 4,
            ),
          ),
          y: Math.max(
            8,
            Math.min(
              92,
              user.y + (Math.random() - 0.5) * 4,
            ),
          ),
        })),
      );
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const value = useMemo(
    () => ({
      users,
    }),
    [users],
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(): PresenceContextValue {
  return useContext(PresenceContext);
}
