import type {
  CollaborationConnectionState,
} from "../../collaboration/transport";

import "./ConnectionBadge.css";

type ConnectionBadgeProps = {
  state:
    CollaborationConnectionState;

  onReconnect?: () => void;
};

const LABELS: Record<
  CollaborationConnectionState,
  string
> = {
  idle: "Offline",
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  disconnected: "Offline",
  error: "Connection Error",
};

export default function ConnectionBadge({
  state,
  onReconnect,
}: ConnectionBadgeProps) {
  const canReconnect =
    state === "error" ||
    state === "disconnected";

  return (
    <button
      type="button"
      className="connection-badge"
      data-state={state}
      disabled={!canReconnect}
      onClick={
        canReconnect
          ? onReconnect
          : undefined
      }
      title={
        canReconnect
          ? "Reconnect collaboration"
          : LABELS[state]
      }
    >
      <span
        className="connection-badge__dot"
      />

      {LABELS[state]}
    </button>
  );
}
