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
  avatarSrc?: string;
  musicTitle: string;
  musicArtist?: string;
  musicSrc?: string;
  showMusicPlayer: boolean;
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
        typeof parsed.avatarSrc === "string"
          ? parsed.avatarSrc
          : fallback.avatarSrc,

      musicTitle:
        typeof parsed.musicTitle === "string"
          ? parsed.musicTitle
          : fallback.musicTitle,

      musicArtist:
        typeof parsed.musicArtist === "string"
          ? parsed.musicArtist
          : fallback.musicArtist,

      musicSrc:
        typeof parsed.musicSrc === "string"
          ? parsed.musicSrc
          : fallback.musicSrc,

      showMusicPlayer:
        typeof parsed.showMusicPlayer === "boolean"
          ? parsed.showMusicPlayer
          : fallback.showMusicPlayer,
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
      : undefined,

    musicTitle: profile.musicTitle,
    musicArtist: profile.musicArtist,

    musicSrc: canPersistSource(profile.musicSrc)
      ? profile.musicSrc
      : undefined,

    showMusicPlayer:
      Boolean(profile.musicSrc) &&
      profile.showMusicPlayer,
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

        musicTitle:
          musicTrack?.title ?? "FREE",

        musicArtist:
          musicTrack?.artist ?? displayName,

        musicSrc:
          musicTrack?.audioSrc,

        showMusicPlayer:
          Boolean(musicTrack) &&
          showMusicPlayer,
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
    if (!editorOpen) {
      return;
    }

    const currentProfile = profile;

    return () => {
      if (
        currentProfile.avatarSrc?.startsWith(
          "blob:",
        )
      ) {
        // The active preview remains valid for this
        // session. Permanent file storage comes later.
      }
    };
  }, [editorOpen, profile]);

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

  const saveProfile = (
    nextProfile: EditableProfile,
  ) => {
    setProfile(nextProfile);
    persistProfile(nextProfile);
    setEditorOpen(false);
  };

  return (
    <>
      <section
        className="your-playground"
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

              <ProfileMusicPlayer
                track={profileTrack}
                visible={
                  profile.showMusicPlayer
                }
              />
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
