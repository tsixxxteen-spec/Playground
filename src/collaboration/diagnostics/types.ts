export type DiagnosticHealthState =
  | "healthy"
  | "warning"
  | "error";

export type DiagnosticCheck = {
  id: string;
  label: string;
  description: string;
  state: DiagnosticHealthState;
  value: string;
};

export type DiagnosticActivityKind =
  | "event"
  | "error"
  | "warning"
  | "system";

export type DiagnosticActivity = {
  id: string;
  kind: DiagnosticActivityKind;
  title: string;
  detail?: string;
  timestamp: number;
};

export type CollaborationDiagnosticReport = {
  generatedAt: string;
  url: string;
  userAgent: string;
  online: boolean;
  storageAvailable: boolean;
  localStorageKeys: number;
  checks: DiagnosticCheck[];
  recentActivity: DiagnosticActivity[];
};
