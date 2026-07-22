import "./SessionBadge.css";

type SessionBadgeProps = {
  shared: boolean;
};

export default function SessionBadge({
  shared,
}: SessionBadgeProps) {
  return (
    <div
      className={`session-badge ${
        shared ? "session-badge--shared" : ""
      }`}
    >
      <span className="session-badge__dot" />

      {shared ? "Shared Session" : "Private Session"}
    </div>
  );
}
