export type SoundtrackSourceType = "upload" | "spotify" | "youtube";

export type SoundtrackTrack = {
  id: string;
  title: string;
  artist: string;
  sourceType: SoundtrackSourceType;
  source: string;
  filename?: string;
};

export type ProfileSoundtrack = {
  tracks: SoundtrackTrack[];
  autoplay: boolean;
  shuffle: boolean;
  repeat: boolean;
};

export const MAX_PROFILE_TRACKS = 25;

export const EMPTY_PROFILE_SOUNDTRACK: ProfileSoundtrack = {
  tracks: [],
  autoplay: false,
  shuffle: false,
  repeat: false,
};

export function createTrackId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `track-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function detectExternalTrackType(value: string): "spotify" | "youtube" | null {
  try {
    const host = new URL(value.trim()).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "open.spotify.com" || host === "spotify.com" || host.endsWith(".spotify.com")) return "spotify";
    if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be" || host === "music.youtube.com") return "youtube";
    return null;
  } catch {
    return null;
  }
}

export function normalizeSoundtrack(value?: Partial<ProfileSoundtrack> | null): ProfileSoundtrack {
  const tracks = Array.isArray(value?.tracks)
    ? value.tracks.filter((track): track is SoundtrackTrack => Boolean(
        track &&
        typeof track.id === "string" &&
        typeof track.title === "string" &&
        typeof track.artist === "string" &&
        typeof track.sourceType === "string" &&
        typeof track.source === "string",
      )).slice(0, MAX_PROFILE_TRACKS)
    : [];

  return {
    tracks,
    autoplay: Boolean(value?.autoplay),
    shuffle: Boolean(value?.shuffle),
    repeat: Boolean(value?.repeat),
  };
}
