import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  SharedLockTakeoverRequest,
  SharedObjectLock,
  SharedObjectSelection,
} from "./types";

type SharedSelectionContextValue = {
  selections: SharedObjectSelection[];
  locks: SharedObjectLock[];
  takeoverRequests:
    SharedLockTakeoverRequest[];

  upsertSelection: (
    selection: SharedObjectSelection,
  ) => void;

  removeSelection: (
    participantId: string,
  ) => void;

  upsertLock: (
    lock: SharedObjectLock,
  ) => void;

  removeLock: (
    objectId: string,
  ) => void;

  addTakeoverRequest: (
    request: SharedLockTakeoverRequest,
  ) => void;

  removeTakeoverRequest: (
    requestId: string,
  ) => void;

  getLock: (
    objectId: string,
  ) => SharedObjectLock | undefined;

  isLockedByOther: (
    objectId: string,
    participantId: string,
  ) => boolean;
};

const SharedSelectionContext =
  createContext<
    SharedSelectionContextValue | null
  >(null);

type SharedSelectionProviderProps = {
  children: ReactNode;
};

export function SharedSelectionProvider({
  children,
}: SharedSelectionProviderProps) {
  const [
    selections,
    setSelections,
  ] = useState<
    SharedObjectSelection[]
  >([]);

  const [
    locks,
    setLocks,
  ] = useState<
    SharedObjectLock[]
  >([]);

  const [
    takeoverRequests,
    setTakeoverRequests,
  ] = useState<
    SharedLockTakeoverRequest[]
  >([]);

  const upsertSelection =
    useCallback(
      (
        incoming:
          SharedObjectSelection,
      ) => {
        setSelections((current) => {
          const exists =
            current.some(
              (selection) =>
                selection.participantId ===
                incoming.participantId,
            );

          if (!exists) {
            return [
              ...current,
              incoming,
            ];
          }

          return current.map(
            (selection) =>
              selection.participantId ===
                incoming.participantId
                ? incoming
                : selection,
          );
        });
      },
      [],
    );

  const removeSelection =
    useCallback(
      (participantId: string) => {
        setSelections((current) =>
          current.filter(
            (selection) =>
              selection.participantId !==
              participantId,
          ),
        );
      },
      [],
    );

  const upsertLock =
    useCallback(
      (incoming: SharedObjectLock) => {
        setLocks((current) => {
          const exists =
            current.some(
              (lock) =>
                lock.objectId ===
                incoming.objectId,
            );

          if (!exists) {
            return [
              ...current,
              incoming,
            ];
          }

          return current.map(
            (lock) =>
              lock.objectId ===
                incoming.objectId
                ? incoming
                : lock,
          );
        });
      },
      [],
    );

  const removeLock =
    useCallback(
      (objectId: string) => {
        setLocks((current) =>
          current.filter(
            (lock) =>
              lock.objectId !==
              objectId,
          ),
        );
      },
      [],
    );

  const addTakeoverRequest =
    useCallback(
      (
        incoming:
          SharedLockTakeoverRequest,
      ) => {
        setTakeoverRequests(
          (current) => {
            const exists =
              current.some(
                (request) =>
                  request.id ===
                  incoming.id,
              );

            if (exists) {
              return current;
            }

            return [
              ...current,
              incoming,
            ];
          },
        );
      },
      [],
    );

  const removeTakeoverRequest =
    useCallback(
      (requestId: string) => {
        setTakeoverRequests(
          (current) =>
            current.filter(
              (request) =>
                request.id !==
                requestId,
            ),
        );
      },
      [],
    );

  const getLock = useCallback(
    (objectId: string) =>
      locks.find(
        (lock) =>
          lock.objectId === objectId,
      ),
    [locks],
  );

  const isLockedByOther =
    useCallback(
      (
        objectId: string,
        participantId: string,
      ) => {
        const lock = locks.find(
          (item) =>
            item.objectId === objectId,
        );

        if (!lock) {
          return false;
        }

        return (
          lock.ownerId !== participantId &&
          lock.expiresAt > Date.now()
        );
      },
      [locks],
    );

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        const now = Date.now();

        setLocks((current) =>
          current.filter(
            (lock) =>
              lock.expiresAt > now,
          ),
        );
      }, 2_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const value = useMemo(
    () => ({
      selections,
      locks,
      takeoverRequests,
      upsertSelection,
      removeSelection,
      upsertLock,
      removeLock,
      addTakeoverRequest,
      removeTakeoverRequest,
      getLock,
      isLockedByOther,
    }),
    [
      selections,
      locks,
      takeoverRequests,
      upsertSelection,
      removeSelection,
      upsertLock,
      removeLock,
      addTakeoverRequest,
      removeTakeoverRequest,
      getLock,
      isLockedByOther,
    ],
  );

  return (
    <SharedSelectionContext.Provider
      value={value}
    >
      {children}
    </SharedSelectionContext.Provider>
  );
}

export function useSharedSelection() {
  const context = useContext(
    SharedSelectionContext,
  );

  if (!context) {
    throw new Error(
      "useSharedSelection must be used inside SharedSelectionProvider.",
    );
  }

  return context;
}
