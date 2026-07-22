export type PlaygroundReleaseChannel =
  | "development"
  | "preview"
  | "production";

function readBooleanEnvironmentValue(
  value: unknown,
  fallback: boolean,
): boolean {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized =
    value.trim().toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no"
  ) {
    return false;
  }

  return fallback;
}

function resolveReleaseChannel():
  PlaygroundReleaseChannel {
  const configured =
    import.meta.env
      .VITE_PLAYGROUND_RELEASE_CHANNEL;

  if (
    configured === "development" ||
    configured === "preview" ||
    configured === "production"
  ) {
    return configured;
  }

  return import.meta.env.PROD
    ? "production"
    : "development";
}

const isDevelopment =
  import.meta.env.DEV;

const isProduction =
  import.meta.env.PROD;

export const PLAYGROUND_RUNTIME_CONFIG = {
  environment:
    import.meta.env.MODE,

  releaseChannel:
    resolveReleaseChannel(),

  isDevelopment,

  isProduction,

  diagnostics: {
    mountPanel:
      readBooleanEnvironmentValue(
        import.meta.env
          .VITE_PLAYGROUND_MOUNT_DIAGNOSTICS,
        isDevelopment,
      ),

    runAutomatically:
      readBooleanEnvironmentValue(
        import.meta.env
          .VITE_PLAYGROUND_AUTO_DIAGNOSTICS,
        isDevelopment,
      ),

    allowShortcut:
      true,
  },

  releaseReadiness: {
    mountPanel:
      readBooleanEnvironmentValue(
        import.meta.env
          .VITE_PLAYGROUND_MOUNT_RELEASE_READINESS,
        isDevelopment,
      ),

    runAutomatically:
      readBooleanEnvironmentValue(
        import.meta.env
          .VITE_PLAYGROUND_AUTO_RELEASE_READINESS,
        isDevelopment,
      ),

    allowShortcut:
      true,
  },

  logging: {
    verbose:
      readBooleanEnvironmentValue(
        import.meta.env
          .VITE_PLAYGROUND_VERBOSE_LOGGING,
        isDevelopment,
      ),
  },

  profileExperience: {
    strictBioCanvasCompanionBounds:
      true,

    fullPageEnvironmentalEffects:
      true,

    followSystemManagedExternally:
      true,

    privateFollowerCountsManagedExternally:
      true,
  },
} as const;

export type PlaygroundRuntimeConfig =
  typeof PLAYGROUND_RUNTIME_CONFIG;
