import {
  PLAYGROUND_RUNTIME_SYSTEMS,
} from "./PlaygroundRuntime";

export const PLAYGROUND_RUNTIME_MANIFEST = {
  name:
    "Playground Runtime",

  architectureVersion:
    "21B.15A",

  systems:
    PLAYGROUND_RUNTIME_SYSTEMS,

  strictBioCanvasCompanionBounds:
    true,

  followSystemManagedExternally:
    true,

  privateFollowerCountsManagedExternally:
    true,
} as const;
