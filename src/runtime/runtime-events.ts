export const PLAYGROUND_RUNTIME_READY_EVENT =
  "playground:runtime-ready";

export function announcePlaygroundRuntimeReady(
  systems: readonly string[],
): void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_RUNTIME_READY_EVENT,
      {
        detail: {
          systems,
          architectureVersion:
            "21B.15C",
          strictBioCanvasCompanionBounds:
            true,
        },
      },
    ),
  );
}
