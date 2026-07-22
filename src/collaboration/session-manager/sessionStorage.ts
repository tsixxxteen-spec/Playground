import {
  isCheckpoint,
} from "../persistence/checkpointStorage";

import type {
  ManagedSession,
} from "./types";

const STORAGE_PREFIX =
  "playground:shared-session:";

function createSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function sanitizeName(
  name: string,
): string {
  const trimmed =
    name.trim();

  return trimmed ||
    "Untitled Session";
}

export function getDefaultSessionName(
  session: ManagedSession,
): string {
  if (
    session.name &&
    session.name.trim()
  ) {
    return session.name.trim();
  }

  const pathParts =
    session.pathname
      .split("/")
      .filter(Boolean);

  const pathname =
    pathParts.length > 0
      ? pathParts[
          pathParts.length - 1
        ]
      : undefined;

  return pathname
    ? `${pathname} Session`
    : "Playground Session";
}

export function listManagedSessions(): ManagedSession[] {
  const sessions:
    ManagedSession[] = [];

  for (
    let index = 0;
    index < localStorage.length;
    index += 1
  ) {
    const key =
      localStorage.key(index);

    if (
      !key ||
      !key.startsWith(STORAGE_PREFIX)
    ) {
      continue;
    }

    const raw =
      localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed: unknown =
        JSON.parse(raw);

      if (!isCheckpoint(parsed)) {
        continue;
      }

      sessions.push({
        ...parsed,
        storageKey: key,
      });
    } catch {
      continue;
    }
  }

  return sessions.sort(
    (left, right) =>
      right.updatedAt -
      left.updatedAt,
  );
}

export function saveManagedSession(
  session: ManagedSession,
): void {
  localStorage.setItem(
    session.storageKey,
    JSON.stringify(session),
  );
}

export function renameManagedSession(
  session: ManagedSession,
  nextName: string,
): ManagedSession {
  const renamed: ManagedSession = {
    ...session,
    name:
      sanitizeName(nextName),
    updatedAt:
      Date.now(),
  };

  saveManagedSession(renamed);

  return renamed;
}

export function duplicateManagedSession(
  session: ManagedSession,
): ManagedSession {
  const now =
    Date.now();

  const duplicateId =
    createSessionId();

  const duplicate:
    ManagedSession = {
      ...session,
      id:
        duplicateId,
      name:
        `${getDefaultSessionName(session)} Copy`,
      storageKey:
        `${STORAGE_PREFIX}saved:${duplicateId}`,
      createdAt:
        now,
      updatedAt:
        now,
    };

  saveManagedSession(duplicate);

  return duplicate;
}

export function deleteManagedSession(
  session: ManagedSession,
): void {
  localStorage.removeItem(
    session.storageKey,
  );
}

export function importManagedSession(
  json: string,
): ManagedSession {
  const parsed: unknown =
    JSON.parse(json);

  if (!isCheckpoint(parsed)) {
    throw new Error(
      "This file is not a valid Playground session.",
    );
  }

  const now =
    Date.now();

  const importId =
    createSessionId();

  const imported:
    ManagedSession = {
      ...parsed,
      id:
        importId,
      name:
        (
          parsed as ManagedSession
        ).name ||
        "Imported Session",
      storageKey:
        `${STORAGE_PREFIX}imported:${importId}`,
      createdAt:
        now,
      updatedAt:
        now,
  };

  saveManagedSession(imported);

  return imported;
}

export function exportManagedSession(
  session: ManagedSession,
): void {
  const blob =
    new Blob(
      [
        JSON.stringify(
          session,
          null,
          2,
        ),
      ],
      {
        type:
          "application/json",
      },
    );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  const safeName =
    getDefaultSessionName(session)
      .replace(
        /[^a-z0-9-_]+/gi,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      )
      .toLowerCase() ||
    "playground-session";

  anchor.href = url;
  anchor.download =
    `${safeName}.json`;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export function getSessionSize(
  session: ManagedSession,
): number {
  return new Blob([
    JSON.stringify(session),
  ]).size;
}
