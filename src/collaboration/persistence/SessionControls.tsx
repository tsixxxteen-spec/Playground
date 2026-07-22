import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ChangeEvent,
} from "react";

import {
  PLAYGROUND_CHECKPOINT_ERROR_EVENT,
  PLAYGROUND_CHECKPOINT_RESTORED_EVENT,
  PLAYGROUND_CHECKPOINT_SAVED_EVENT,
  PLAYGROUND_EXPORT_SESSION_EVENT,
  PLAYGROUND_IMPORT_SESSION_EVENT,
  PLAYGROUND_RESTORE_CHECKPOINT_EVENT,
  PLAYGROUND_SAVE_CHECKPOINT_EVENT,
} from "./events";

import "./session-controls.css";

type StatusTone =
  | "idle"
  | "success"
  | "error";

type StatusState = {
  message: string;
  tone: StatusTone;
};

const DEFAULT_STATUS: StatusState = {
  message: "Session ready",
  tone: "idle",
};

function dispatchEvent(
  eventName: string,
): void {
  document.dispatchEvent(
    new CustomEvent(eventName),
  );
}

export default function SessionControls() {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    status,
    setStatus,
  ] = useState<StatusState>(
    DEFAULT_STATUS,
  );

  const [
    isExpanded,
    setIsExpanded,
  ] = useState(false);

  useEffect(() => {
    let resetTimer:
      number | undefined;

    const showTemporaryStatus = (
      nextStatus: StatusState,
    ) => {
      setStatus(nextStatus);

      if (resetTimer) {
        window.clearTimeout(
          resetTimer,
        );
      }

      resetTimer =
        window.setTimeout(() => {
          setStatus(
            DEFAULT_STATUS,
          );
        }, 3200);
    };

    const handleSaved = () => {
      showTemporaryStatus({
        message: "Session saved",
        tone: "success",
      });
    };

    const handleRestored = () => {
      showTemporaryStatus({
        message: "Session restored",
        tone: "success",
      });
    };

    const handleError = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          message?: string;
        }>;

      showTemporaryStatus({
        message:
          customEvent.detail
            ?.message ??
          "Session action failed",
        tone: "error",
      });
    };

    document.addEventListener(
      PLAYGROUND_CHECKPOINT_SAVED_EVENT,
      handleSaved,
    );

    document.addEventListener(
      PLAYGROUND_CHECKPOINT_RESTORED_EVENT,
      handleRestored,
    );

    document.addEventListener(
      PLAYGROUND_CHECKPOINT_ERROR_EVENT,
      handleError,
    );

    return () => {
      document.removeEventListener(
        PLAYGROUND_CHECKPOINT_SAVED_EVENT,
        handleSaved,
      );

      document.removeEventListener(
        PLAYGROUND_CHECKPOINT_RESTORED_EVENT,
        handleRestored,
      );

      document.removeEventListener(
        PLAYGROUND_CHECKPOINT_ERROR_EVENT,
        handleError,
      );

      if (resetTimer) {
        window.clearTimeout(
          resetTimer,
        );
      }
    };
  }, []);

  const handleImportFile = async (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const json =
        await file.text();

      document.dispatchEvent(
        new CustomEvent(
          PLAYGROUND_IMPORT_SESSION_EVENT,
          {
            detail: {
              json,
            },
          },
        ),
      );
    } catch {
      setStatus({
        message:
          "Could not read session file",
        tone: "error",
      });
    }
  };

  return (
    <aside
      className={
        isExpanded
          ? "playground-session-controls playground-session-controls--expanded"
          : "playground-session-controls"
      }
      aria-label="Session controls"
    >
      <button
        type="button"
        className="playground-session-controls__toggle"
        aria-expanded={isExpanded}
        onClick={() => {
          setIsExpanded(
            (current) => !current,
          );
        }}
      >
        <span>
          Session
        </span>

        <span
          aria-hidden="true"
          className="playground-session-controls__chevron"
        >
          {isExpanded ? "×" : "⋯"}
        </span>
      </button>

      {isExpanded && (
        <div className="playground-session-controls__panel">
          <div
            className={`playground-session-controls__status playground-session-controls__status--${status.tone}`}
            role="status"
          >
            {status.message}
          </div>

          <button
            type="button"
            className="playground-session-controls__button"
            onClick={() => {
              dispatchEvent(
                PLAYGROUND_SAVE_CHECKPOINT_EVENT,
              );
            }}
          >
            Save checkpoint
          </button>

          <button
            type="button"
            className="playground-session-controls__button"
            onClick={() => {
              dispatchEvent(
                PLAYGROUND_RESTORE_CHECKPOINT_EVENT,
              );
            }}
          >
            Restore checkpoint
          </button>

          <div className="playground-session-controls__divider" />

          <button
            type="button"
            className="playground-session-controls__button"
            onClick={() => {
              dispatchEvent(
                PLAYGROUND_EXPORT_SESSION_EVENT,
              );
            }}
          >
            Export session
          </button>

          <button
            type="button"
            className="playground-session-controls__button"
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            Import session
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="playground-session-controls__file-input"
            onChange={handleImportFile}
          />
        </div>
      )}
    </aside>
  );
}
