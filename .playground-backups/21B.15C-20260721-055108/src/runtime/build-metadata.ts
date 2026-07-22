import {
  PLAYGROUND_RUNTIME_CONFIG,
} from "./runtime-config";

function readMetadataValue(
  value: unknown,
  fallback: string,
): string {
  return typeof value === "string" &&
    value.trim().length > 0
    ? value
    : fallback;
}

export const PLAYGROUND_BUILD_METADATA = {
  application:
    "Playground",

  version:
    readMetadataValue(
      import.meta.env
        .VITE_PLAYGROUND_VERSION,
      "0.0.0",
    ),

  buildNumber:
    readMetadataValue(
      import.meta.env
        .VITE_PLAYGROUND_BUILD_NUMBER,
      "development",
    ),

  buildDate:
    readMetadataValue(
      import.meta.env
        .VITE_PLAYGROUND_BUILD_DATE,
      "unknown",
    ),

  architectureVersion:
    "21B.15B",

  environment:
    PLAYGROUND_RUNTIME_CONFIG.environment,

  releaseChannel:
    PLAYGROUND_RUNTIME_CONFIG.releaseChannel,

  production:
    PLAYGROUND_RUNTIME_CONFIG.isProduction,

  strictBioCanvasCompanionBounds:
    true,
} as const;

export type PlaygroundBuildMetadata =
  typeof PLAYGROUND_BUILD_METADATA;

export const PLAYGROUND_BUILD_METADATA_EVENT =
  "playground:build-metadata-ready";

export function announcePlaygroundBuildMetadata():
  void {
  document.dispatchEvent(
    new CustomEvent(
      PLAYGROUND_BUILD_METADATA_EVENT,
      {
        detail:
          PLAYGROUND_BUILD_METADATA,
      },
    ),
  );
}
