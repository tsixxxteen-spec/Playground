export {
  default as SessionManager,
} from "./SessionManager";

export {
  deleteManagedSession,
  duplicateManagedSession,
  exportManagedSession,
  getDefaultSessionName,
  getSessionSize,
  importManagedSession,
  listManagedSessions,
  renameManagedSession,
  saveManagedSession,
} from "./sessionStorage";

export type {
  ManagedSession,
  SessionSaveStatus,
} from "./types";
