export type PresenceStatus =
  | "exploring"
  | "editing"
  | "idle";

export type PresenceMode =
  | "off"
  | "ambient"
  | "full";

export type PresenceUser = {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  x: number;
  y: number;
  status: PresenceStatus;
  color: string;
  joinedAt: number;
  activity?: string;
  themeVariant?: string;
};

export type PresenceSnapshot = {
  users: PresenceUser[];
  mode: PresenceMode;
};
