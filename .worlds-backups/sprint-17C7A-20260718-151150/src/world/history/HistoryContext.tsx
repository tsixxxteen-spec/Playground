import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PropsWithChildren } from "react";
import type { PlaygroundData } from "../types/playground";
import { HistoryManager } from "./HistoryManager";
import type { HistoryStatus } from "./HistoryManager";

export type HistoryContextValue =
  HistoryStatus & {
    record: (
      previous: PlaygroundData,
      next: PlaygroundData,
      commandId: string,
      label: string,
    ) => void;
    undo: (
      current: PlaygroundData,
    ) => PlaygroundData | null;
    redo: (
      current: PlaygroundData,
    ) => PlaygroundData | null;
    clear: () => void;
  };

export const HistoryContext =
  createContext<HistoryContextValue | null>(null);

type HistoryProviderProps =
  PropsWithChildren<{
    limit?: number;
  }>;

export function HistoryProvider({
  children,
  limit = 100,
}: HistoryProviderProps) {
  const managerRef = useRef<HistoryManager | null>(null);
  const [, setRevision] = useState(0);

  if (!managerRef.current) {
    managerRef.current = new HistoryManager(limit);
  }

  const refresh = useCallback(() => {
    setRevision((revision) => revision + 1);
  }, []);

  const record = useCallback(
    (
      previous: PlaygroundData,
      next: PlaygroundData,
      commandId: string,
      label: string,
    ) => {
      managerRef.current?.record(
        previous,
        next,
        commandId,
        label,
      );
      refresh();
    },
    [refresh],
  );

  const undo = useCallback(
    (current: PlaygroundData) => {
      const next =
        managerRef.current?.undo(current) ?? null;
      refresh();
      return next;
    },
    [refresh],
  );

  const redo = useCallback(
    (current: PlaygroundData) => {
      const next =
        managerRef.current?.redo(current) ?? null;
      refresh();
      return next;
    },
    [refresh],
  );

  const clear = useCallback(() => {
    managerRef.current?.clear();
    refresh();
  }, [refresh]);

  const status = managerRef.current.getStatus();

  const value = useMemo(
    () => ({
      ...status,
      record,
      undo,
      redo,
      clear,
    }),
    [
      status.canRedo,
      status.canUndo,
      status.redoLabel,
      status.undoLabel,
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
