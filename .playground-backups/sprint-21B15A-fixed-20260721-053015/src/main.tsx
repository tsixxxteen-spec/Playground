import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { CollaborationSessionProvider } from "./collaboration/CollaborationSessionContext";
import PresenceBridge from "./presence/PresenceBridge";
import { CollaborationTransportProvider } from "./collaboration/transport/CollaborationTransportContext";
import { SharedCursorProvider } from "./collaboration/cursors/SharedCursorContext";
import SharedCursorBridge from "./collaboration/cursors/SharedCursorBridge";
import SharedCursorOverlay from "./components/collaboration/SharedCursorOverlay";
import { SharedSelectionProvider } from "./collaboration/selection/SharedSelectionContext";
import SharedSelectionBridge from "./collaboration/selection/SharedSelectionBridge";
import RemoteSelectionOverlay from "./components/collaboration/RemoteSelectionOverlay";
import { SharedMutationProvider } from "./collaboration/mutations/SharedMutationContext";
import SharedMutationBridge from "./collaboration/mutations/SharedMutationBridge";
import EditorMutationAdapter from "./collaboration/mutations/EditorMutationAdapter";
import { SharedRecoveryProvider } from "./collaboration/recovery/SharedRecoveryContext";
import SharedRecoveryBridge from "./collaboration/recovery/SharedRecoveryBridge";
import PersistentSessionBridge from "./collaboration/persistence/PersistentSessionBridge";
import SessionControls from "./collaboration/persistence/SessionControls";
import SessionManager from "./collaboration/session-manager/SessionManager";
import VisualHistoryPanel from "./collaboration/history/VisualHistoryPanel";
import CollaborationDashboard from "./collaboration/dashboard/CollaborationDashboard";
import ObjectInspectorPanel from "./collaboration/inspector/ObjectInspectorPanel";
import CollaborationCommandCenter from "./collaboration/command-center/CollaborationCommandCenter";
import CollaborationDiagnosticsPanel from "./collaboration/diagnostics/CollaborationDiagnosticsPanel";
import ReleaseReadinessPanel from "./collaboration/release-readiness/ReleaseReadinessPanel";
import ProfileExperiencePolishBridge from "./profile-experience/polish/ProfileExperiencePolishBridge";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'Playground could not start because the "#root" element is missing.',
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    
      <CollaborationSessionProvider>
      <CollaborationTransportProvider>
        <SharedCursorProvider>
          <SharedSelectionProvider>
            <SharedMutationProvider>
              <SharedRecoveryProvider>
                <PresenceBridge />
                                                                  <SharedCursorBridge />
                                                    <SharedCursorOverlay />
                                                    <SharedSelectionBridge />
                                          <RemoteSelectionOverlay />
                                          <SharedMutationBridge />
                              <EditorMutationAdapter />
                <SharedRecoveryBridge />
                <PersistentSessionBridge />
                <SessionControls />
                <SessionManager />
                <VisualHistoryPanel />
                <CollaborationDashboard />
                <ObjectInspectorPanel />
                <CollaborationCommandCenter />
                <CollaborationDiagnosticsPanel />
                <ReleaseReadinessPanel />
                <ProfileExperiencePolishBridge />
                              <App />
              </SharedRecoveryProvider>
            </SharedMutationProvider>
          </SharedSelectionProvider>
        </SharedCursorProvider>
      </CollaborationTransportProvider>
    </CollaborationSessionProvider>
    
  </React.StrictMode>,
);