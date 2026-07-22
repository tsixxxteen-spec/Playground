export type ReadinessTestState =
  | "pending"
  | "running"
  | "passed"
  | "warning"
  | "failed";

export type ReadinessTestResult = {
  id: string;
  title: string;
  description: string;
  state: ReadinessTestState;
  detail: string;
  durationMs?: number;
};

export type ReleaseReadinessReport = {
  generatedAt: string;
  score: number;
  passed: number;
  warnings: number;
  failed: number;
  results: ReadinessTestResult[];
  location: string;
  userAgent: string;
};
