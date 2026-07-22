export type PresenceStatus =
  | "exploring"
  | "editing"
  | "idle";

export interface PresenceUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  x: number;
  y: number;
  status: PresenceStatus;
  color: string;
  joinedAt: number;
}
