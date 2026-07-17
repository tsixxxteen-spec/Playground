import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import EditProfile from "../EditProfile";
import type { EditableProfile } from "../EditProfile";

import ProfileMusicPlayer from "../ProfileMusicPlayer";
import type { ProfileTrack } from "../ProfileMusicPlayer";

import {
  DEFAULT_AVATAR_TRANSFORM,
  getAvatarImageStyle,
  normalizeAvatarTransform,
} from "../AvatarStudio";
import type {
  AvatarTransform,
} from "../AvatarStudio";

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

import "./YourPlayground.css";

type YourPlaygroundProps = {
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

const PROFILE_STORAGE_KEY =
  "playground.profile.settings.v1";

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

function formatCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000)
      .toFixed(value >= 10_000_000 ? 0 : 1)
      .replace(".0", "")}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000)
      .toFixed(value >= 10_000 ? 0 : 1)
      .replace(".0", "")}K`;
  }

  return String(value);
}

function getInitials(displayName: string): string {
  const words = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "PG";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function canPersistSource(
  source: string | undefined,
): boolean {
  if (!source) {
    return false;
  }

  return !source.startsWith("blob:");
}

function readStoredProfile(
  fallback: EditableProfile,
): EditableProfile {
  try {
    const raw = window.localStorage.getItem(
      PROFILE_STORAGE_KEY,
    );

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<StoredProfile>;

    return {
      displayName:
        typeof parsed.displayName === "string"
          ? parsed.displayName
          : fallback.displayName,

      username:
        typeof parsed.username === "string"
          ? parsed.username
          : fallback.username,

      bio:
        typeof parsed.bio === "string"
          ? parsed.bio
          : fallback.bio,

      avatarSrc:
        Object.prototype.hasOwnProperty.call(
          parsed,
          "avatarSrc",
        )
          ? typeof parsed.avatarSrc === "string"
            ? parsed.avatarSrc
            : undefined
          : fallback.avatarSrc,

      avatarTransform:
        normalizeAvatarTransform(
          parsed.avatarTransform &&
          typeof parsed.avatarTransform ===
            "object"
            ? parsed.avatarTransform
            : fallback.avatarTransform ??
              DEFAULT_AVATAR_TRANSFORM,
        ),

      musicTitle:
        typeof parsed.musicTitle === "string"
          ? parsed.musicTitle
          : fallback.musicTitle,

      musicArtist:
        typeof parsed.musicArtist === "string"
          ? parsed.musicArtist
          : fallback.musicArtist,

      musicSrc:
        Object.prototype.hasOwnProperty.call(
          parsed,
          "musicSrc",
        )
          ? typeof parsed.musicSrc === "string"
            ? parsed.musicSrc
            : undefined
          : fallback.musicSrc,

      showMusicPlayer:
        typeof parsed.showMusicPlayer === "boolean"
          ? parsed.showMusicPlayer
          : fallback.showMusicPlayer,

      themeId:
        typeof parsed.themeId === "string"
          ? parsed.themeId
          : fallback.themeId || DEFAULT_THEME_ID,
    };
  } catch (error) {
    console.error(
      "Could not read saved profile settings:",
      error,
    );

    return fallback;
  }
}

function persistProfile(
  profile: EditableProfile,
): void {
  const storedProfile: StoredProfile = {
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,

    avatarSrc: canPersistSource(profile.avatarSrc)
      ? profile.avatarSrc
      : null,

    avatarTransform:
      profile.avatarTransform ??
      DEFAULT_AVATAR_TRANSFORM,

    musicTitle: profile.musicTitle,
    musicArtist: profile.musicArtist,

    musicSrc: canPersistSource(profile.musicSrc)
      ? profile.musicSrc
      : null,

    showMusicPlayer:
      Boolean(profile.musicSrc) &&
      profile.showMusicPlayer,

    themeId: profile.themeId || DEFAULT_THEME_ID,
  };

  try {
    window.localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(storedProfile),
    );
  } catch (error) {
    console.error(
      "Could not save profile settings:",
      error,
    );
  }
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
}: YourPlaygroundProps) {
  const fallbackProfile =
    useMemo<EditableProfile>(
      () => ({
        displayName,
        username,
        bio,
        avatarSrc,
        avatarTransform:
          DEFAULT_AVATAR_TRANSFORM,

        musicTitle:
          musicTrack?.title ?? "FREE",

        musicArtist:
          musicTrack?.artist ?? displayName,

        musicSrc:
          musicTrack?.audioSrc,

        showMusicPlayer:
          Boolean(musicTrack) &&
          showMusicPlayer,

        themeId: DEFAULT_THEME_ID,
      }),
      [
        avatarSrc,
        bio,
        displayName,
        musicTrack,
        showMusicPlayer,
        username,
      ],
    );

  const [profile, setProfile] =
    useState<EditableProfile>(() =>
      readStoredProfile(fallbackProfile),
    );

  const [editorOpen, setEditorOpen] =
    useState(false);

  useEffect(() => {
    let active = true;
    let avatarObjectUrl: string | null = null;
    let musicObjectUrl: string | null = null;

    const restoreMedia = async () => {
      try {
        const [avatarBlob, musicBlob] =
          await Promise.all([
            readProfileMedia("profile-avatar"),
            readProfileMedia("profile-music"),
          ]);

        if (!active) {
          return;
        }

        if (avatarBlob) {
          avatarObjectUrl =
            URL.createObjectURL(avatarBlob);
        }

        if (musicBlob) {
          musicObjectUrl =
            URL.createObjectURL(musicBlob);
        }

        if (
          avatarObjectUrl ||
          musicObjectUrl
        ) {
          setProfile((currentProfile) => ({
            ...currentProfile,

            avatarSrc:
              avatarObjectUrl ??
              currentProfile.avatarSrc,

            musicSrc:
              musicObjectUrl ??
              currentProfile.musicSrc,
          }));
        }
      } catch (error) {
        console.error(
          "Could not restore profile media:",
          error,
        );
      }
    };

    void restoreMedia();

    return () => {
      active = false;

      if (avatarObjectUrl) {
        URL.revokeObjectURL(
          avatarObjectUrl,
        );
      }

      if (musicObjectUrl) {
        URL.revokeObjectURL(
          musicObjectUrl,
        );
      }
    };
  }, []);

  const activeTheme = getTheme(
    profile.themeId || DEFAULT_THEME_ID,
  );

  const themeStyle = getThemeStyle(activeTheme);

  const profileTrack =
    profile.musicSrc && profile.musicTitle
      ? {
          title: profile.musicTitle,
          artist:
            profile.musicArtist ||
            profile.displayName,
          audioSrc: profile.musicSrc,
        }
      : null;

  const saveProfile = async (
    nextProfile: EditableProfile,
  ) => {
    try {
      if (
        nextProfile.avatarSrc?.startsWith(
          "blob:",
        )
      ) {
        const avatarBlob =
          await blobFromSource(
            nextProfile.avatarSrc,
          );

        await saveProfileMedia(
          "profile-avatar",
          avatarBlob,
        );
      } else if (!nextProfile.avatarSrc) {
        await deleteProfileMedia(
          "profile-avatar",
        );
      }

      if (
        nextProfile.musicSrc?.startsWith(
          "blob:",
        )
      ) {
        const musicBlob =
          await blobFromSource(
            nextProfile.musicSrc,
          );

        await saveProfileMedia(
          "profile-music",
          musicBlob,
        );
      } else if (!nextProfile.musicSrc) {
        await deleteProfileMedia(
          "profile-music",
        );
      }
    } catch (error) {
      console.error(
        "Could not permanently save profile media:",
        error,
      );
    }

    setProfile(nextProfile);
    persistProfile(nextProfile);
    setEditorOpen(false);
  };

  return (
    <>
      <section
        className={[
          "your-playground",
          "your-playground--themed",
          activeTheme.className,
          `your-playground--layout-${activeTheme.layout}`,
          `your-playground--music-${activeTheme.musicPlacement}`,
        ].join(" ")}
        style={themeStyle}
        data-theme={activeTheme.id}
        aria-label={`${profile.displayName} profile`}
      >
        <header className="your-playground__profile">
          <div className="your-playground__identity">
            <div className="your-playground__avatar">
              {profile.avatarSrc ? (
                <img
                  src={profile.avatarSrc}
                  alt={`${profile.displayName} profile`}
                  draggable={false}
                  style={getAvatarImageStyle(
                    profile.avatarTransform ??
                      DEFAULT_AVATAR_TRANSFORM,
                  )}
                />
              ) : (
                <span aria-hidden="true">
                  {getInitials(
                    profile.displayName,
                  )}
                </span>
              )}
            </div>

            <div className="your-playground__details">
              <div className="your-playground__name-row">
                <div>
                  <h1>
                    {profile.displayName}
                  </h1>

                  <p>{profile.username}</p>
                </div>

                <button
                  className="your-playground__edit"
                  type="button"
                  onClick={() =>
                    setEditorOpen(true)
                  }
                >
                  Edit profile
                </button>
              </div>

              {profile.bio && (
                <p className="your-playground__bio">
                  {profile.bio}
                </p>
              )}

              <div className="your-playground__music-slot">
                <ProfileMusicPlayer
                  track={profileTrack}
                  visible={
                    profile.showMusicPlayer
                  }
                />
              </div>
            </div>
          </div>

          <dl className="your-playground__stats">
            <div>
              <dt>
                {formatCount(postCount)}
              </dt>
              <dd>Posts</dd>
            </div>

            <div>
              <dt>
                {formatCount(
                  followerCount,
                )}
              </dt>
              <dd>Followers</dd>
            </div>

            <div>
              <dt>
                {formatCount(
                  followingCount,
                )}
              </dt>
              <dd>Following</dd>
            </div>
          </dl>
        </header>

        <div className="your-playground__divider" />

        <section
          className="your-playground__work"
          aria-label={`${profile.displayName} posts`}
        >
          <div className="your-playground__section-heading">
            <span>YOUR WORK</span>
            <span>{postCount}</span>
          </div>

          {children ? (
            children
          ) : (
            <div className="your-playground__empty">
              <strong>
                Your Playground is waiting.
              </strong>

              <p>
                Work you publish will appear
                here.
              </p>
            </div>
          )}
        </section>
      </section>

      {editorOpen && (
        <EditProfile
          profile={profile}
          onCancel={() =>
            setEditorOpen(false)
          }
          onSave={saveProfile}
        />
      )}
    </>
  );
}
