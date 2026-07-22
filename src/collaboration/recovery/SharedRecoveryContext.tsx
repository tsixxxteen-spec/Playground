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
  SharedHistoryEntry,
} from "./types";

const MAX_HISTORY = 150;

type SharedRecoveryContextValue = {
  undoStack: SharedHistoryEntry[];
  redoStack: SharedHistoryEntry[];

  pushHistoryEntry: (
    entry: SharedHistoryEntry,
  ) => void;

  popUndoEntry: (
    participantId: string,
  ) => SharedHistoryEntry | null;

  popRedoEntry: (
    participantId: string,
  ) => SharedHistoryEntry | null;

  pushRedoEntry: (
    entry: SharedHistoryEntry,
  ) => void;

  pushUndoEntry: (
    entry: SharedHistoryEntry,
  ) => void;

  clearRecoveryHistory: () => void;
};

const SharedRecoveryContext =
  createContext<
    SharedRecoveryContextValue | null
  >(null);

type SharedRecoveryProviderProps = {
  children: ReactNode;
};

export function SharedRecoveryProvider({
  children,
}: SharedRecoveryProviderProps) {
  const [
    undoStack,
    setUndoStack,
  ] = useState<
    SharedHistoryEntry[]
  >([]);

  const [
    redoStack,
    setRedoStack,
  ] = useState<
    SharedHistoryEntry[]
  >([]);

  const pushHistoryEntry =
    useCallback(
      (entry: SharedHistoryEntry) => {
        setUndoStack((current) =>
          [
            ...current,
            entry,
          ].slice(-MAX_HISTORY),
        );

        setRedoStack([]);
      },
      [],
    );

  const popUndoEntry =
    useCallback(
      (
        participantId: string,
      ): SharedHistoryEntry | null => {
        let selected:
          SharedHistoryEntry | null =
          null;

        setUndoStack((current) => {
          const index =
            [...current]
              .reverse()
              .findIndex(
                (entry) =>
                  entry.participantId ===
                  participantId,
              );

          if (index === -1) {
            return current;
          }

          const actualIndex =
            current.length -
            1 -
            index;

          selected =
            current[actualIndex];

          return current.filter(
            (_, entryIndex) =>
              entryIndex !==
              actualIndex,
          );
        });

        return selected;
      },
      [],
    );

  const popRedoEntry =
    useCallback(
      (
        participantId: string,
      ): SharedHistoryEntry | null => {
        let selected:
          SharedHistoryEntry | null =
          null;

        setRedoStack((current) => {
          const index =
            [...current]
              .reverse()
              .findIndex(
                (entry) =>
                  entry.participantId ===
                  participantId,
              );

          if (index === -1) {
            return current;
          }

          const actualIndex =
            current.length -
            1 -
            index;

          selected =
            current[actualIndex];

          return current.filter(
            (_, entryIndex) =>
              entryIndex !==
              actualIndex,
          );
        });

        return selected;
      },
      [],
    );

  const pushRedoEntry =
    useCallback(
      (entry: SharedHistoryEntry) => {
        setRedoStack((current) =>
          [
            ...current,
            entry,
          ].slice(-MAX_HISTORY),
        );
      },
      [],
    );

  const pushUndoEntry =
    useCallback(
      (entry: SharedHistoryEntry) => {
        setUndoStack((current) =>
          [
            ...current,
            entry,
          ].slice(-MAX_HISTORY),
        );
      },
      [],
    );

  const clearRecoveryHistory =
    useCallback(() => {
      setUndoStack([]);
      setRedoStack([]);
    }, []);

  const value = useMemo(
    () => ({
      undoStack,
      redoStack,
      pushHistoryEntry,
      popUndoEntry,
      popRedoEntry,
      pushRedoEntry,
      pushUndoEntry,
      clearRecoveryHistory,
    }),
    [
      undoStack,
      redoStack,
      pushHistoryEntry,
      popUndoEntry,
      popRedoEntry,
      pushRedoEntry,
      pushUndoEntry,
      clearRecoveryHistory,
    ],
  );

  return (
    <SharedRecoveryContext.Provider
      value={value}
    >
      {children}
    </SharedRecoveryContext.Provider>
  );
}

export function useSharedRecovery() {
  const context =
    useContext(
      SharedRecoveryContext,
    );

  if (!context) {
    throw new Error(
      "useSharedRecovery must be used inside SharedRecoveryProvider.",
    );
  }

  return context;
}
