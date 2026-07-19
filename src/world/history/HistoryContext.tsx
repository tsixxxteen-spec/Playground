import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  PropsWithChildren,
} from "react";

import type {
  PlaygroundData,
} from "../types/playground";

import {
  HistoryManager,
} from "./HistoryManager";
import type {
  HistoryStatus,
} from "./HistoryManager";

export type HistoryContextValue =
  HistoryStatus & {
    record: (
      previous: PlaygroundData,
      next: PlaygroundData,
      commandId: string,
      label: string,
      previousSelectionId: string | null,
    ) => void;
    undo: (
      current: PlaygroundData,
      currentSelectionId: string | null,
    ) => import("./HistoryManager").HistoryRestoreResult | null;
    redo: (
      current: PlaygroundData,
      currentSelectionId: string | null,
    ) => import("./HistoryManager").HistoryRestoreResult | null;
    clear: () => void;
  };

export const HistoryContext =
  createContext<HistoryContextValue | null>(
    null,
  );

type HistoryProviderProps =
  PropsWithChildren<{
    limit?: number;
    mergeWindowMs?: number;
  }>;

export function HistoryProvider({
  children,
  limit = 100,
  mergeWindowMs = 450,
}: HistoryProviderProps) {
  const managerRef =
    useRef<HistoryManager | null>(null);

  const [, setRevision] = useState(0);

  if (!managerRef.current) {
    managerRef.current =
      new HistoryManager(
        limit,
        mergeWindowMs,
      );
  }

  const refresh = useCallback(() => {
    setRevision(
      (revision) => revision + 1,
    );
  }, []);

  const record = useCallback(
    (
      previous: PlaygroundData,
      next: PlaygroundData,
      commandId: string,
      label: string,
      previousSelectionId: string | null,
    ) => {
      managerRef.current?.record(
        previous,
        next,
        commandId,
        label,
        previousSelectionId,
      );

      refresh();
    },
    [refresh],
  );

  const undo = useCallback(
    (
      current: PlaygroundData,
      currentSelectionId: string | null,
    ) => {
      const result =
        managerRef.current?.undo(
          current,
          currentSelectionId,
        ) ?? null;

      refresh();
      return result;
    },
    [refresh],
  );

  const redo = useCallback(
    (
      current: PlaygroundData,
      currentSelectionId: string | null,
    ) => {
      const result =
        managerRef.current?.redo(
          current,
          currentSelectionId,
        ) ?? null;

      refresh();
      return result;
    },
    [refresh],
  );

  const clear = useCallback(() => {
    managerRef.current?.clear();
    refresh();
  }, [refresh]);

  const status =
    managerRef.current.getStatus();

  const value = useMemo(
    () => ({
      ...status,
      record,
      undo,
      redo,
      clear,
    }),
    [
      status.canUndo,
      status.canRedo,
      status.undoLabel,
      status.redoLabel,
      status.undoDepth,
      status.redoDepth,
      record,
      undo,
      redo,
      clear,
    ],
  );

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  );
}
