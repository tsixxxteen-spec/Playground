import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import EditProfile from "../EditProfile";
import type { EditableProfile } from "../EditProfile";
import type { ProfileTrack } from "../ProfileMusicPlayer";
import {
  DEFAULT_AVATAR_TRANSFORM,
  normalizeAvatarTransform,
} from "../AvatarStudio";
import type { AvatarTransform } from "../AvatarStudio";
import {
  blobFromSource,
  deleteProfileMedia,
  readProfileMedia,
  saveProfileMedia,
} from "../../lib/profileMediaStore";
import {
  DEFAULT_THEME_ID,
  getTheme,
  getThemeStyle,
} from "../../themes";
import { ExperienceRenderer } from "../../profile-experiences";
import "./YourPlayground.css";

type Props = {
  displayName: string;
  username: string;
  bio: string;
  avatarSrc?: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  musicTrack: ProfileTrack | null;
  showMusicPlayer: boolean;
  children?: ReactNode;
};

const PROFILE_STORAGE_KEY = "playground.profile.settings.v1";

type StoredProfile = {
  displayName: string;
  username: string;
  bio: string;
  avatarSrc?: string | null;
  avatarTransform?: AvatarTransform;
  musicTitle: string;
  musicArtist?: string;
  musicSrc?: string | null;
  showMusicPlayer: boolean;
  themeId: string;
};

function canPersistSource(source?: string): boolean {
  return Boolean(source && !source.startsWith("blob:"));
}

function readStoredProfile(fallback: EditableProfile): EditableProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredProfile>;
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
      musicTitle: typeof parsed.musicTitle === "string" ? parsed.musicTitle : fallback.musicTitle,
      musicArtist: typeof parsed.musicArtist === "string" ? parsed.musicArtist : fallback.musicArtist,
      musicSrc: Object.prototype.hasOwnProperty.call(parsed, "musicSrc")
        ? typeof parsed.musicSrc === "string" ? parsed.musicSrc : undefined
        : fallback.musicSrc,
      showMusicPlayer: typeof parsed.showMusicPlayer === "boolean" ? parsed.showMusicPlayer : fallback.showMusicPlayer,
      themeId: typeof parsed.themeId === "string" ? parsed.themeId : fallback.themeId || DEFAULT_THEME_ID,
    };
  } catch (error) {
    console.error("Could not read saved profile settings:", error);
    return fallback;
  }
}

function persistProfile(profile: EditableProfile): void {
  const stored: StoredProfile = {
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    avatarSrc: canPersistSource(profile.avatarSrc) ? profile.avatarSrc : null,
    avatarTransform: profile.avatarTransform ?? DEFAULT_AVATAR_TRANSFORM,
    musicTitle: profile.musicTitle,
    musicArtist: profile.musicArtist,
    musicSrc: canPersistSource(profile.musicSrc) ? profile.musicSrc : null,
    showMusicPlayer: Boolean(profile.musicSrc) && profile.showMusicPlayer,
    themeId: profile.themeId || DEFAULT_THEME_ID,
  };
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(stored));
}

export default function YourPlayground({
  displayName,
  username,
  bio,
  avatarSrc,
  postCount,
  followerCount,
  followingCount,
  musicTrack,
  showMusicPlayer,
  children,
}: Props) {
  const fallbackProfile = useMemo<EditableProfile>(() => ({
    displayName,
    username,
    bio,
    avatarSrc,
    avatarTransform: DEFAULT_AVATAR_TRANSFORM,
    musicTitle: musicTrack?.title ?? "FREE",
    musicArtist: musicTrack?.artist ?? displayName,
    musicSrc: musicTrack?.audioSrc,
    showMusicPlayer: Boolean(musicTrack) && showMusicPlayer,
    themeId: DEFAULT_THEME_ID,
  }), [avatarSrc, bio, displayName, musicTrack, showMusicPlayer, username]);

  const [profile, setProfile] = useState<EditableProfile>(() => readStoredProfile(fallbackProfile));
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let avatarUrl: string | null = null;
    let musicUrl: string | null = null;
    void (async () => {
      try {
        const [avatarBlob, musicBlob] = await Promise.all([
          readProfileMedia("profile-avatar"),
          readProfileMedia("profile-music"),
        ]);
        if (!active) return;
        if (avatarBlob) avatarUrl = URL.createObjectURL(avatarBlob);
        if (musicBlob) musicUrl = URL.createObjectURL(musicBlob);
        if (avatarUrl || musicUrl) {
          setProfile((current) => ({
            ...current,
            avatarSrc: avatarUrl ?? current.avatarSrc,
            musicSrc: musicUrl ?? current.musicSrc,
          }));
        }
      } catch (error) {
        console.error("Could not restore profile media:", error);
      }
    })();
    return () => {
      active = false;
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
      if (musicUrl) URL.revokeObjectURL(musicUrl);
    };
  }, []);

  const activeTheme = getTheme(profile.themeId || DEFAULT_THEME_ID);
  const track = profile.musicSrc && profile.musicTitle
    ? {
        title: profile.musicTitle,
        artist: profile.musicArtist || profile.displayName,
        audioSrc: profile.musicSrc,
      }
    : null;

  const saveProfile = async (next: EditableProfile) => {
    try {
      if (next.avatarSrc?.startsWith("blob:")) {
        await saveProfileMedia("profile-avatar", await blobFromSource(next.avatarSrc));
      } else if (!next.avatarSrc) {
        await deleteProfileMedia("profile-avatar");
      }
      if (next.musicSrc?.startsWith("blob:")) {
        await saveProfileMedia("profile-music", await blobFromSource(next.musicSrc));
      } else if (!next.musicSrc) {
        await deleteProfileMedia("profile-music");
      }
    } catch (error) {
      console.error("Could not permanently save profile media:", error);
    }
    setProfile(next);
    persistProfile(next);
    setEditorOpen(false);
  };

  return (
    <>
      <ExperienceRenderer
        themeId={activeTheme.id}
        className={activeTheme.className}
        style={getThemeStyle(activeTheme)}
        profile={{
          displayName: profile.displayName,
          username: profile.username,
          bio: profile.bio,
          avatarSrc: profile.avatarSrc,
          avatarTransform: profile.avatarTransform ?? DEFAULT_AVATAR_TRANSFORM,
        }}
        posts={children}
        postCount={postCount}
        followerCount={followerCount}
        followingCount={followingCount}
        track={track}
        showMusicPlayer={profile.showMusicPlayer}
        onEdit={() => setEditorOpen(true)}
      />

      {editorOpen && (
        <EditProfile
          profile={profile}
          onCancel={() => setEditorOpen(false)}
          onSave={saveProfile}
        />
      )}
    </>
  );
}
