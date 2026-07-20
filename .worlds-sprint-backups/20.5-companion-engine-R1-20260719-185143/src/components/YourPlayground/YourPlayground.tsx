import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import EditProfile from "../EditProfile";
import type { EditableProfile } from "../EditProfile";
import type { ProfileTrack } from "../ProfileMusicPlayer";
import { DEFAULT_AVATAR_TRANSFORM, normalizeAvatarTransform } from "../AvatarStudio";
import type { AvatarTransform } from "../AvatarStudio";
import { blobFromSource, deleteProfileMedia, readProfileMedia, saveProfileMedia } from "../../lib/profileMediaStore";
import { DEFAULT_THEME_ID, getTheme, getThemeStyle } from "../../themes";
import { EMPTY_PROFILE_SOUNDTRACK, normalizeSoundtrack } from "../../lib/profileSoundtrack";
import type { ProfileSoundtrack, SoundtrackTrack } from "../../lib/profileSoundtrack";
import { ExperienceRenderer } from "../../profile-experiences";
import {
  EMPTY_PLAYGROUND,
  normalizePlayground,
} from "../../world/types/playground";
import type { PlaygroundData } from "../../world/types/playground";
import { DEFAULT_ENVIRONMENT_SETTINGS, normalizeEnvironmentSettings } from "../../personalization/environments";
import type { EnvironmentSettings } from "../../personalization/environments";
import "./YourPlayground.css";

type Props = {
  displayName: string; username: string; bio: string; avatarSrc?: string;
  postCount: number; followerCount: number; followingCount: number;
  musicTrack: ProfileTrack | null; showMusicPlayer: boolean; children?: ReactNode;
};

const PROFILE_STORAGE_KEY = "playground.profile.settings.v2";

type StoredProfile = {
  displayName: string; username: string; bio: string; avatarSrc?: string | null;
  avatarTransform?: AvatarTransform; avatarTransforms?: Record<string, AvatarTransform>;
  soundtrack?: ProfileSoundtrack; showMusicPlayer: boolean; themeId: string;
  playground?: PlaygroundData;
  environment?: EnvironmentSettings;
};

function canPersistSource(source?: string): boolean {
  return Boolean(source && !source.startsWith("blob:"));
}

function soundtrackForStorage(soundtrack: ProfileSoundtrack): ProfileSoundtrack {
  return {
    ...soundtrack,
    tracks: soundtrack.tracks.map((track) => ({
      ...track,
      source: track.sourceType === "upload" && track.source.startsWith("blob:") ? "" : track.source,
    })),
  };
}

function readStoredProfile(fallback: EditableProfile): EditableProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY) ?? window.localStorage.getItem("playground.profile.settings.v1");
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredProfile> & {
      musicTitle?: string; musicArtist?: string; musicSrc?: string | null;
    };
    const migratedSoundtrack = parsed.soundtrack ??
      (parsed.musicSrc && parsed.musicTitle ? {
        ...EMPTY_PROFILE_SOUNDTRACK,
        tracks: [{
          id: "migrated-profile-track",
          title: parsed.musicTitle,
          artist: parsed.musicArtist ?? fallback.displayName,
          sourceType: "upload" as const,
          source: parsed.musicSrc,
        }],
      } : fallback.soundtrack);

    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : fallback.displayName,
      username: typeof parsed.username === "string" ? parsed.username : fallback.username,
      bio: typeof parsed.bio === "string" ? parsed.bio : fallback.bio,
      avatarSrc: Object.prototype.hasOwnProperty.call(parsed, "avatarSrc")
        ? typeof parsed.avatarSrc === "string" ? parsed.avatarSrc : undefined
        : fallback.avatarSrc,
      avatarTransform: normalizeAvatarTransform(
        parsed.avatarTransform && typeof parsed.avatarTransform === "object"
          ? parsed.avatarTransform
          : fallback.avatarTransform ?? DEFAULT_AVATAR_TRANSFORM,
      ),
      soundtrack: normalizeSoundtrack(migratedSoundtrack ?? EMPTY_PROFILE_SOUNDTRACK),
      showMusicPlayer: typeof parsed.showMusicPlayer === "boolean" ? parsed.showMusicPlayer : fallback.showMusicPlayer,
      themeId: typeof parsed.themeId === "string" ? parsed.themeId : fallback.themeId || DEFAULT_THEME_ID,
      playground: normalizePlayground(parsed.playground ?? fallback.playground),
      environment: normalizeEnvironmentSettings(parsed.environment ?? fallback.environment),
    };
  } catch (error) {
    console.error("Could not read saved profile settings:", error);
    return fallback;
  }
}

function persistProfile(profile: EditableProfile): void {
  const soundtrack = normalizeSoundtrack(profile.soundtrack ?? EMPTY_PROFILE_SOUNDTRACK);
  const stored: StoredProfile = {
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    avatarSrc: canPersistSource(profile.avatarSrc) ? profile.avatarSrc : null,
    avatarTransform: profile.avatarTransform ?? DEFAULT_AVATAR_TRANSFORM,
    soundtrack: soundtrackForStorage(soundtrack),
    showMusicPlayer: soundtrack.tracks.length > 0 && profile.showMusicPlayer,
    themeId: profile.themeId || DEFAULT_THEME_ID,
    playground: normalizePlayground(profile.playground),
    environment: normalizeEnvironmentSettings(profile.environment),
  };
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(stored));
}

export default function YourPlayground(props: Props) {
  const { displayName, username, bio, avatarSrc, postCount, followerCount, followingCount, musicTrack, showMusicPlayer, children } = props;
  const fallbackProfile = useMemo<EditableProfile>(() => ({
    displayName, username, bio, avatarSrc,
    avatarTransform: DEFAULT_AVATAR_TRANSFORM,
    avatarTransforms: { [DEFAULT_THEME_ID]: DEFAULT_AVATAR_TRANSFORM },
    soundtrack: musicTrack ? {
      ...EMPTY_PROFILE_SOUNDTRACK,
      tracks: [{
        id: "default-profile-track",
        title: musicTrack.title,
        artist: musicTrack.artist ?? displayName,
        sourceType: "upload",
        source: musicTrack.audioSrc,
      }],
    } : EMPTY_PROFILE_SOUNDTRACK,
    showMusicPlayer: Boolean(musicTrack) && showMusicPlayer,
    themeId: DEFAULT_THEME_ID,
    environment: DEFAULT_ENVIRONMENT_SETTINGS,
    playground: {
      enabled: true,
      objects: [
        {
          id: "profile-retro-folder",
          objectId: "retro-folder",
          lane: "music",
          enabled: true,
          position: { x: 84, y: 32 },
          rotation: -3,
          scale: 1,
          zIndex: 1,
          action: { type: "open-music" },
        },
      ],
    },
  }), [avatarSrc, bio, displayName, musicTrack, showMusicPlayer, username]);

  const [profile, setProfile] = useState<EditableProfile>(() => readStoredProfile(fallbackProfile));
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    void (async () => {
      try {
        const avatarMigrationKey = "worlds-avatar-hd-migration-v1";

        if (!localStorage.getItem(avatarMigrationKey)) {
          await deleteProfileMedia("profile-avatar");
          localStorage.setItem(avatarMigrationKey, "complete");
        }

        const avatarBlob = await readProfileMedia("profile-avatar");
        const currentSoundtrack = normalizeSoundtrack(profile.soundtrack ?? EMPTY_PROFILE_SOUNDTRACK);
        const restoredTracks = await Promise.all(currentSoundtrack.tracks.map(async (track): Promise<SoundtrackTrack> => {
          if (track.sourceType !== "upload") return track;
          const blob = await readProfileMedia(`profile-track:${track.id}`);
          if (!blob) return track;
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);
          return { ...track, source: objectUrl };
        }));
        if (!active) return;
        let restoredAvatar: string | undefined;
        if (avatarBlob) {
          restoredAvatar = URL.createObjectURL(avatarBlob);
          objectUrls.push(restoredAvatar);
        }
        setProfile((current) => ({
          ...current,
          avatarSrc: restoredAvatar ?? current.avatarSrc,
          soundtrack: { ...currentSoundtrack, tracks: restoredTracks },
        }));
      } catch (error) {
        console.error("Could not restore profile media:", error);
      }
    })();
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const activeTheme = getTheme(profile.themeId || DEFAULT_THEME_ID);
  const activeAvatarTransform = normalizeAvatarTransform(
    profile.avatarTransform ?? DEFAULT_AVATAR_TRANSFORM,
  );
  const soundtrack = normalizeSoundtrack(profile.soundtrack ?? EMPTY_PROFILE_SOUNDTRACK);

  const saveProfile = async (next: EditableProfile) => {
    const mergedNext: EditableProfile = {
      ...next,
      avatarSrc: next.avatarSrc ?? profile.avatarSrc,
      soundtrack: normalizeSoundtrack(next.soundtrack ?? profile.soundtrack),
      playground: normalizePlayground(next.playground ?? profile.playground),
      environment: normalizeEnvironmentSettings(next.environment ?? profile.environment),
    };
    try {
      if (mergedNext.avatarSrc?.startsWith("blob:")) {
        await saveProfileMedia("profile-avatar", await blobFromSource(mergedNext.avatarSrc));
      } else if (!mergedNext.avatarSrc) {
        await deleteProfileMedia("profile-avatar");
      }
      for (const track of mergedNext.soundtrack?.tracks ?? []) {
        if (track.sourceType === "upload" && track.source.startsWith("blob:")) {
          await saveProfileMedia(`profile-track:${track.id}`, await blobFromSource(track.source));
        }
      }
    } catch (error) {
      console.error("Could not permanently save profile media:", error);
    }
    setProfile(mergedNext);
    persistProfile(mergedNext);
    setEditorOpen(false);
  };

  const hiddenAutoplay = soundtrack.tracks.length > 0 && !profile.showMusicPlayer && soundtrack.autoplay;

  return <>
    <ExperienceRenderer
      themeId={activeTheme.id}
      className={activeTheme.className}
      style={getThemeStyle(activeTheme)}
      profile={{
        displayName: profile.displayName,
        username: profile.username,
        bio: profile.bio,
        avatarSrc: profile.avatarSrc,
        avatarTransform: activeAvatarTransform,
      }}
      posts={children}
      postCount={postCount}
      followerCount={followerCount}
      followingCount={followingCount}
      soundtrack={soundtrack}
      showMusicPlayer={profile.showMusicPlayer}
      hiddenAutoplay={hiddenAutoplay}
      playground={profile.playground ?? EMPTY_PLAYGROUND}
      environment={profile.environment}
      onEdit={() => setEditorOpen(true)}
    />
    {editorOpen && <EditProfile profile={profile} onCancel={() => setEditorOpen(false)} onSave={saveProfile} />}
  </>;
}
