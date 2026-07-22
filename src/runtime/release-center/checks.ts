import type { PlaygroundBuildMetadata } from "../build-metadata";
import type { PlaygroundRuntimeConfig } from "../runtime-config";

export type ReleaseCheckStatus = "pass" | "warning" | "fail";

export interface ReleaseCheck {
  id: string;
  label: string;
  status: ReleaseCheckStatus;
  detail: string;
}

interface ReleaseCheckInput {
  systems: readonly string[];
  config: PlaygroundRuntimeConfig;
  metadata: PlaygroundBuildMetadata;
}

function check(
  id: string,
  label: string,
  passed: boolean,
  detail: string,
  failureDetail = detail,
  failureStatus: ReleaseCheckStatus = "fail",
): ReleaseCheck {
  return {
    id,
    label,
    status: passed ? "pass" : failureStatus,
    detail: passed ? detail : failureDetail,
  };
}

export function runPlaygroundReleaseChecks({
  systems,
  config,
  metadata,
}: ReleaseCheckInput): ReleaseCheck[] {
  const expectedSystems = [
    "PersistentSessionBridge",
    "SharedRecoveryBridge",
    "EditorMutationAdapter",
    "SharedMutationBridge",
    "SessionControls",
    "SessionManager",
    "VisualHistoryPanel",
    "CollaborationDashboard",
    "ObjectInspectorPanel",
    "CollaborationCommandCenter",
    "CollaborationDiagnosticsPanel",
    "ReleaseReadinessPanel",
    "ProfileExperiencePolishBridge",
  ] as const;

  const missingSystems = expectedSystems.filter(
    (system) => !systems.includes(system),
  );

  const storageAvailable = (() => {
    try {
      const key = "__playground_release_center__";
      window.localStorage.setItem(key, "ok");
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  })();

  const rootPresent = Boolean(document.getElementById("root"));
  const productionMetadataPresent =
    metadata.version !== "0.0.0" &&
    metadata.buildNumber !== "development" &&
    metadata.buildDate !== "unknown";

  return [
    check(
      "runtime",
      "Unified runtime",
      systems.length >= expectedSystems.length && missingSystems.length === 0,
      `${systems.length} runtime systems registered.`,
      `Missing: ${missingSystems.join(", ") || "unknown runtime systems"}.`,
    ),
    check(
      "collaboration",
      "Collaboration stack",
      systems.includes("CollaborationDashboard") &&
        systems.includes("CollaborationCommandCenter"),
      "Dashboard and command center are registered.",
      "A collaboration runtime surface is missing.",
    ),
    check(
      "sessions",
      "Sessions and recovery",
      systems.includes("SessionManager") &&
        systems.includes("PersistentSessionBridge") &&
        systems.includes("SharedRecoveryBridge"),
      "Session persistence and recovery are registered.",
      "Session persistence or recovery is incomplete.",
    ),
    check(
      "history",
      "Visual history",
      systems.includes("VisualHistoryPanel"),
      "Visual history is registered.",
      "Visual history is not registered.",
    ),
    check(
      "mutations",
      "Shared mutations",
      systems.includes("EditorMutationAdapter") &&
        systems.includes("SharedMutationBridge"),
      "Mutation adapter and bridge are registered.",
      "Shared mutation wiring is incomplete.",
    ),
    check(
      "profile",
      "Profile experience",
      systems.includes("ProfileExperiencePolishBridge"),
      "Profile polish runtime is registered.",
      "Profile polish runtime is missing.",
    ),
    check(
      "companion-bounds",
      "Companion bounds",
      config.profileExperience.strictBioCanvasCompanionBounds,
      "Companions remain constrained to the bio canvas.",
      "Strict bio-canvas companion bounds are disabled.",
    ),
    check(
      "environment-effects",
      "Environmental effects",
      config.profileExperience.fullPageEnvironmentalEffects,
      "Full-page environmental effects are enabled.",
      "Full-page environmental effects are disabled.",
    ),
    check(
      "follow-protection",
      "Follow system ownership",
      config.profileExperience.followSystemManagedExternally,
      "Follow state remains externally managed.",
      "Follow state ownership changed.",
    ),
    check(
      "follower-privacy",
      "Private follower counts",
      config.profileExperience.privateFollowerCountsManagedExternally,
      "Private follower counts remain externally managed.",
      "Private follower-count ownership changed.",
    ),
    check(
      "runtime-mode",
      "Runtime environment",
      Boolean(config.environment && config.releaseChannel),
      `${config.environment} / ${config.releaseChannel}.`,
      "Runtime environment metadata is incomplete.",
    ),
    check(
      "production-flags",
      "Production diagnostics",
      !config.isProduction || !config.diagnostics.mountPanel,
      config.isProduction
        ? "Diagnostics are disabled in production."
        : "Development diagnostics are permitted.",
      "Diagnostics are mounted in production.",
    ),
    check(
      "build-metadata",
      "Build metadata",
      !config.isProduction || productionMetadataPresent,
      config.isProduction
        ? `${metadata.version} · build ${metadata.buildNumber}.`
        : "Development metadata fallback is active.",
      "Production metadata values are still using development fallbacks.",
      "warning",
    ),
    check(
      "architecture",
      "Architecture version",
      metadata.architectureVersion === "21B.15C",
      metadata.architectureVersion,
      `Expected 21B.15C, received ${metadata.architectureVersion}.`,
    ),
    check(
      "root",
      "Application root",
      rootPresent,
      '#root is mounted.',
      '#root is missing.',
    ),
    check(
      "storage",
      "Local storage",
      storageAvailable,
      "Local persistence is available.",
      "Local storage is unavailable.",
      "warning",
    ),
    check(
      "events",
      "Runtime events",
      typeof CustomEvent === "function",
      "CustomEvent is available.",
      "CustomEvent is unavailable.",
    ),
    check(
      "broadcast",
      "Collaboration transport",
      "BroadcastChannel" in window,
      "BroadcastChannel is available.",
      "BroadcastChannel is unavailable in this environment.",
      "warning",
    ),
  ];
}
