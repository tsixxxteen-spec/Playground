import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { CollaborationSessionProvider } from "./collaboration/CollaborationSessionContext";
import PresenceBridge from "./presence/PresenceBridge";
import { CollaborationTransportProvider } from "./collaboration/transport/CollaborationTransportContext";

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
        <PresenceBridge />
              <App />
      </CollaborationTransportProvider>
    </CollaborationSessionProvider>
    
  </React.StrictMode>,
);