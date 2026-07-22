import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  SharedCursorPresence,
} from "./types";

type SharedCursorContextValue = {
  cursors: SharedCursorPresence[];

  upsertCursor: (
    cursor: SharedCursorPresence,
  ) => void;

  removeCursor: (
    participantId: string,
  ) => void;

  clearCursors: () => void;
};

const SharedCursorContext =
  createContext<
    SharedCursorContextValue | null
  >(null);

type SharedCursorProviderProps = {
  children: ReactNode;
};

export function SharedCursorProvider({
  children,
}: SharedCursorProviderProps) {
  const [cursors, setCursors] =
    useState<SharedCursorPresence[]>([]);

  const upsertCursor = useCallback(
    (
      incoming:
        SharedCursorPresence,
    ) => {
      setCursors((current) => {
        const exists = current.some(
          (cursor) =>
            cursor.participantId ===
            incoming.participantId,
        );

        if (!exists) {
          return [
            ...current,
            incoming,
          ];
        }

        return current.map(
          (cursor) =>
            cursor.participantId ===
              incoming.participantId
              ? {
                  ...cursor,
                  ...incoming,
                }
              : cursor,
        );
      });
    },
    [],
  );

  const removeCursor = useCallback(
    (participantId: string) => {
      setCursors((current) =>
        current.filter(
          (cursor) =>
            cursor.participantId !==
            participantId,
        ),
      );
    },
    [],
  );

  const clearCursors = useCallback(
    () => {
      setCursors([]);
    },
    [],
  );

  const value = useMemo(
    () => ({
      cursors,
      upsertCursor,
      removeCursor,
      clearCursors,
    }),
    [
      cursors,
      upsertCursor,
      removeCursor,
      clearCursors,
    ],
  );

  return (
    <SharedCursorContext.Provider
      value={value}
    >
      {children}
    </SharedCursorContext.Provider>
  );
}

export function useSharedCursors() {
  const context = useContext(
    SharedCursorContext,
  );

  if (!context) {
    throw new Error(
      "useSharedCursors must be used inside SharedCursorProvider.",
    );
  }

  return context;
}
