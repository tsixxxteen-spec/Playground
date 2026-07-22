import {
  useEffect,
} from "react";

import {
  collaborationTransport,
} from "../transport";

import {
  useSharedMutationController,
} from "./useSharedMutationController";

import type {
  SharedMutationDispatchDetail,
  SharedMutationInput,
  SharedWorldMutation,
} from "./types";

const LOCAL_MUTATION_EVENT =
  "playground:world-mutation";

const APPLIED_MUTATION_EVENT =
  "playground:world-mutation-applied";

function dispatchAppliedMutation(
  mutation: SharedWorldMutation,
  remote: boolean,
) {
  const detail:
    SharedMutationDispatchDetail = {
      mutation,
      remote,
    };

  document.dispatchEvent(
    new CustomEvent(
      APPLIED_MUTATION_EVENT,
      {
        detail,
      },
    ),
  );
}

export default function SharedMutationBridge() {
  const {
    publishMutation,
    applyMutation,
  } = useSharedMutationController();

  useEffect(() => {
    const handleLocalMutation = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          SharedMutationInput
        >;

      const input =
        customEvent.detail;

      if (
        !input ||
        typeof input.objectId !==
          "string" ||
        typeof input.kind !==
          "string"
      ) {
        return;
      }

      const mutation =
        publishMutation(input);

      if (mutation) {
        dispatchAppliedMutation(
          mutation,
          false,
        );
      } else {
        document.dispatchEvent(
          new CustomEvent(
            "playground:world-mutation-rejected",
            {
              detail: {
                input,
                reason:
                  "Object is locked or the mutation is stale.",
              },
            },
          ),
        );
      }
    };

    document.addEventListener(
      LOCAL_MUTATION_EVENT,
      handleLocalMutation,
    );

    return () => {
      document.removeEventListener(
        LOCAL_MUTATION_EVENT,
        handleLocalMutation,
      );
    };
  }, [publishMutation]);

  useEffect(() => {
    return collaborationTransport.subscribe(
      (message) => {
        if (
          message.type !==
          "world-mutation"
        ) {
          return;
        }

        const accepted =
          applyMutation(
            message.mutation,
          );

        if (!accepted) {
          return;
        }

        dispatchAppliedMutation(
          message.mutation,
          true,
        );
      },
    );
  }, [applyMutation]);

  return null;
}
