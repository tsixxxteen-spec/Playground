import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  SharedWorldMutation,
} from "./types";

const MAX_HISTORY_LENGTH = 300;
const MAX_PROCESSED_IDS = 1_000;

type SharedMutationContextValue = {
  mutations: SharedWorldMutation[];

  applyMutation: (
    mutation: SharedWorldMutation,
  ) => boolean;

  getObjectRevision: (
    objectId: string,
  ) => number;

  getNextObjectRevision: (
    objectId: string,
  ) => number;

  clearMutationHistory: () => void;
};

const SharedMutationContext =
  createContext<
    SharedMutationContextValue | null
  >(null);

type SharedMutationProviderProps = {
  children: ReactNode;
};

export function SharedMutationProvider({
  children,
}: SharedMutationProviderProps) {
  const [
    mutations,
    setMutations,
  ] = useState<
    SharedWorldMutation[]
  >([]);

  const revisionMapRef =
    useRef<Map<string, number>>(
      new Map(),
    );

  const processedIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const processedIdOrderRef =
    useRef<string[]>([]);

  const rememberMutationId =
    useCallback(
      (mutationId: string) => {
        processedIdsRef.current.add(
          mutationId,
        );

        processedIdOrderRef.current.push(
          mutationId,
        );

        while (
          processedIdOrderRef.current
            .length >
          MAX_PROCESSED_IDS
        ) {
          const oldestId =
            processedIdOrderRef.current.shift();

          if (oldestId) {
            processedIdsRef.current.delete(
              oldestId,
            );
          }
        }
      },
      [],
    );

  const applyMutation =
    useCallback(
      (
        mutation:
          SharedWorldMutation,
      ): boolean => {
        if (
          processedIdsRef.current.has(
            mutation.id,
          )
        ) {
          return false;
        }

        const currentRevision =
          revisionMapRef.current.get(
            mutation.objectId,
          ) ?? 0;

        if (
          mutation.revision <=
          currentRevision
        ) {
          rememberMutationId(
            mutation.id,
          );

          return false;
        }

        revisionMapRef.current.set(
          mutation.objectId,
          mutation.revision,
        );

        rememberMutationId(
          mutation.id,
        );

        setMutations((current) => {
          const next = [
            ...current,
            mutation,
          ];

          if (
            next.length <=
            MAX_HISTORY_LENGTH
          ) {
            return next;
          }

          return next.slice(
            next.length -
              MAX_HISTORY_LENGTH,
          );
        });

        return true;
      },
      [rememberMutationId],
    );

  const getObjectRevision =
    useCallback(
      (objectId: string) =>
        revisionMapRef.current.get(
          objectId,
        ) ?? 0,
      [],
    );

  const getNextObjectRevision =
    useCallback(
      (objectId: string) =>
        (
          revisionMapRef.current.get(
            objectId,
          ) ?? 0
        ) + 1,
      [],
    );

  const clearMutationHistory =
    useCallback(() => {
      setMutations([]);
      revisionMapRef.current.clear();
      processedIdsRef.current.clear();
      processedIdOrderRef.current = [];
    }, []);

  const value = useMemo(
    () => ({
      mutations,
      applyMutation,
      getObjectRevision,
      getNextObjectRevision,
      clearMutationHistory,
    }),
    [
      mutations,
      applyMutation,
      getObjectRevision,
      getNextObjectRevision,
      clearMutationHistory,
    ],
  );

  return (
    <SharedMutationContext.Provider
      value={value}
    >
      {children}
    </SharedMutationContext.Provider>
  );
}

export function useSharedMutations() {
  const context = useContext(
    SharedMutationContext,
  );

  if (!context) {
    throw new Error(
      "useSharedMutations must be used inside SharedMutationProvider.",
    );
  }

  return context;
}
