import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { usePresence } from "./PresenceContext";

import "./Presence.css";

const VIEWER_VISIBILITY_KEY =
  "playground:show-page-viewers";

function readViewerVisibility(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const stored =
    window.localStorage.getItem(
      VIEWER_VISIBILITY_KEY,
    );

  return stored !== "false";
}

export default function PresenceLayer() {
  const {
    users,
    mode,
  } = usePresence();

  const [
    showViewerCount,
    setShowViewerCount,
  ] = useState(readViewerVisibility);

  useEffect(() => {
    window.localStorage.setItem(
      VIEWER_VISIBILITY_KEY,
      String(showViewerCount),
    );
  }, [showViewerCount]);

  const viewerCount = useMemo(
    () => users.length,
    [users],
  );

  if (mode === "off") {
    return null;
  }

  return (
    <div
      className="presence-layer presence-layer--viewer-count"
      aria-label="Page viewer presence"
    >
      <button
        type="button"
        className={
          showViewerCount
            ? "page-viewer-count"
            : "page-viewer-count page-viewer-count--hidden"
        }
        aria-label={
          showViewerCount
            ? `Hide page viewer count. ${viewerCount} viewers currently present.`
            : "Show page viewer count"
        }
        aria-pressed={showViewerCount}
        title={
          showViewerCount
            ? "Hide page viewers"
            : "Show page viewers"
        }
        onClick={() => {
          setShowViewerCount(
            (current) => !current,
          );
        }}
      >
        <span
          className="page-viewer-count__twinkle"
          aria-hidden="true"
        >
          <span className="page-viewer-count__star page-viewer-count__star--one" />
          <span className="page-viewer-count__star page-viewer-count__star--two" />
          <span className="page-viewer-count__star page-viewer-count__star--three" />
        </span>

        {showViewerCount && (
          <span className="page-viewer-count__number">
            {viewerCount.toLocaleString()}
          </span>
        )}
      </button>
    </div>
  );
}
