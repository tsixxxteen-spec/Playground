import type {
  SharedMutationDispatchDetail,
  SharedMutationInput,
} from "./types";

export const SHARED_WORLD_MUTATION_EVENT =
  "playground:world-mutation";

export const SHARED_WORLD_MUTATION_APPLIED_EVENT =
  "playground:world-mutation-applied";

export const SHARED_WORLD_MUTATION_REJECTED_EVENT =
  "playground:world-mutation-rejected";

export function dispatchSharedWorldMutation(
  mutation: SharedMutationInput,
) {
  document.dispatchEvent(
    new CustomEvent(
      SHARED_WORLD_MUTATION_EVENT,
      {
        detail: mutation,
      },
    ),
  );
}

export function subscribeToSharedWorldMutations(
  listener: (
    detail:
      SharedMutationDispatchDetail,
  ) => void,
) {
  const handler = (
    event: Event,
  ) => {
    const customEvent =
      event as CustomEvent<
        SharedMutationDispatchDetail
      >;

    listener(
      customEvent.detail,
    );
  };

  document.addEventListener(
    SHARED_WORLD_MUTATION_APPLIED_EVENT,
    handler,
  );

  return () => {
    document.removeEventListener(
      SHARED_WORLD_MUTATION_APPLIED_EVENT,
      handler,
    );
  };
}
