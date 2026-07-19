export const PLAYGROUND_LANES = {
  MUSIC: "music",
  PHOTOS: "photos",
  VIDEOS: "videos",
} as const;

export type PlaygroundLane =
  (typeof PLAYGROUND_LANES)[keyof typeof PLAYGROUND_LANES];

export const PLAYGROUND_LANE_LABELS: Record<PlaygroundLane, string> = {
  [PLAYGROUND_LANES.MUSIC]: "Music",
  [PLAYGROUND_LANES.PHOTOS]: "Photos",
  [PLAYGROUND_LANES.VIDEOS]: "Videos",
};

export const isPlaygroundLane = (
  value: unknown,
): value is PlaygroundLane =>
  typeof value === "string" &&
  Object.values(PLAYGROUND_LANES).includes(
    value as PlaygroundLane,
  );
