import { useEffect } from "react";

import PersistentSessionBridge from "../collaboration/persistence/PersistentSessionBridge";
import SharedRecoveryBridge from "../collaboration/recovery/SharedRecoveryBridge";
import EditorMutationAdapter from "../collaboration/mutations/EditorMutationAdapter";
import SharedMutationBridge from "../collaboration/mutations/SharedMutationBridge";
import SessionControls from "../collaboration/persistence/SessionControls";
import SessionManager from "../collaboration/session-manager/SessionManager";
import VisualHistoryPanel from "../collaboration/history/VisualHistoryPanel";
import CollaborationDashboard from "../collaboration/dashboard/CollaborationDashboard";
import ObjectInspectorPanel from "../collaboration/inspector/ObjectInspectorPanel";
import CollaborationCommandCenter from "../collaboration/command-center/CollaborationCommandCenter";
import CollaborationDiagnosticsPanel from "../collaboration/diagnostics/CollaborationDiagnosticsPanel";
import ReleaseReadinessPanel from "../collaboration/release-readiness/ReleaseReadinessPanel";
import ProfileExperiencePolishBridge from "../profile-experience/polish/ProfileExperiencePolishBridge";

import {
  announcePlaygroundRuntimeReady,
} from "./runtime-events";

export const PLAYGROUND_RUNTIME_SYSTEMS = [
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

export type PlaygroundRuntimeSystem =
  typeof PLAYGROUND_RUNTIME_SYSTEMS[number];

export default function PlaygroundRuntime() {
  useEffect(() => {
    announcePlaygroundRuntimeReady(
      PLAYGROUND_RUNTIME_SYSTEMS,
    );
  }, []);

  return (
    <>
      <PersistentSessionBridge />
      <SharedRecoveryBridge />
      <EditorMutationAdapter />
      <SharedMutationBridge />
      <SessionControls />
      <SessionManager />
      <VisualHistoryPanel />
      <CollaborationDashboard />
      <ObjectInspectorPanel />
      <CollaborationCommandCenter />
      <CollaborationDiagnosticsPanel />
      <ReleaseReadinessPanel />
      <ProfileExperiencePolishBridge />
    </>
  );
}
