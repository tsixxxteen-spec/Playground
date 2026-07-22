export const COLLABORATION_SESSION_QUERY_KEY =
  "playgroundSession";

export function createCollaborationSessionId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

export function getCollaborationSessionLink(
  sessionId: string,
) {
  if (typeof window === "undefined") {
    return sessionId;
  }

  const url = new URL(window.location.href);

  url.searchParams.set(
    COLLABORATION_SESSION_QUERY_KEY,
    sessionId,
  );

  return url.toString();
}

export function getRequestedCollaborationSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);

  return url.searchParams.get(
    COLLABORATION_SESSION_QUERY_KEY,
  );
}

export function clearRequestedCollaborationSessionId() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  url.searchParams.delete(
    COLLABORATION_SESSION_QUERY_KEY,
  );

  window.history.replaceState(
    window.history.state,
    "",
    url.toString(),
  );
}
