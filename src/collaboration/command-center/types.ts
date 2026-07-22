export type WorkspaceCommandId =
  | "sessions"
  | "history"
  | "collaboration"
  | "inspector";

export type WorkspaceCommand = {
  id: WorkspaceCommandId;
  title: string;
  description: string;
  shortcut: string;
  symbol: string;
  searchTerms: string[];
  key: string;
};
