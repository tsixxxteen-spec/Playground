import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { CollaborationSessionProvider } from "./collaboration/CollaborationSessionContext";
import PresenceBridge from "./presence/PresenceBridge";
import { CollaborationTransportProvider } from "./collaboration/transport/CollaborationTransportContext";
import { SharedCursorProvider } from "./collaboration/cursors/SharedCursorContext";
import SharedCursorBridge from "./collaboration/cursors/SharedCursorBridge";
import SharedCursorOverlay from "./components/collaboration/SharedCursorOverlay";

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
          <PresenceBridge />
                        <SharedCursorBridge />
          <SharedCursorOverlay />
          <App />
        </SharedCursorProvider>
      </CollaborationTransportProvider>
    </CollaborationSessionProvider>
    
  </React.StrictMode>,
);