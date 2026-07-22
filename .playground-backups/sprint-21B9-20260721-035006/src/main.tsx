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
              <PresenceBridge />
                                                  <SharedCursorBridge />
                                    <SharedCursorOverlay />
                                    <SharedSelectionBridge />
                          <RemoteSelectionOverlay />
                          <SharedMutationBridge />
              <EditorMutationAdapter />
              <App />
            </SharedMutationProvider>
          </SharedSelectionProvider>
        </SharedCursorProvider>
      </CollaborationTransportProvider>
    </CollaborationSessionProvider>
    
  </React.StrictMode>,
);