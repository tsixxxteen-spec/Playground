import {
  useMemo,
  useState,
} from "react";

import {
  getCollaborationSessionLink,
} from "../../collaboration/sessionLinks";

import "./ShareSessionPanel.css";

type ShareSessionPanelProps = {
  sessionId: string;
};

export default function ShareSessionPanel({
  sessionId,
}: ShareSessionPanelProps) {
  const [copied, setCopied] =
    useState(false);

  const sessionLink = useMemo(
    () =>
      getCollaborationSessionLink(
        sessionId,
      ),
    [sessionId],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        sessionLink,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      const input =
        document.createElement("textarea");

      input.value = sessionLink;
      input.style.position = "fixed";
      input.style.opacity = "0";

      document.body.appendChild(input);

      input.select();
      document.execCommand("copy");
      input.remove();

      setCopied(true);
    }
  };

  return (
    <div className="share-session-panel">
      <div className="share-session-panel__label">
        <span>Share link</span>
        <small>
          Session {sessionId.slice(0, 8)}
        </small>
      </div>

      <button
        type="button"
        onClick={copyLink}
      >
        {copied ? "Copied" : "Copy Link"}
      </button>
    </div>
  );
}
