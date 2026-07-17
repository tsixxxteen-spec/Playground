import type { ReactNode } from "react";

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
  return (
    <section
      className="your-playground"
      aria-label={`${displayName} profile`}
    >
      <header className="your-playground__profile">
        <div className="your-playground__identity">
          <div className="your-playground__avatar">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={`${displayName} profile`}
                draggable={false}
              />
            ) : (
              <span aria-hidden="true">
                {getInitials(displayName)}
              </span>
            )}
          </div>

          <div className="your-playground__details">
            <div className="your-playground__name-row">
              <div>
                <h1>{displayName}</h1>
                <p>{username}</p>
              </div>

              <button
                className="your-playground__edit"
                type="button"
                disabled
                title="Profile editing arrives in the next sprint"
              >
                Edit profile
              </button>
            </div>

            <p className="your-playground__bio">
              {bio}
            </p>

            <ProfileMusicPlayer
              track={musicTrack}
              visible={showMusicPlayer}
            />
          </div>
        </div>

        <dl className="your-playground__stats">
          <div>
            <dt>{formatCount(postCount)}</dt>
            <dd>Posts</dd>
          </div>

          <div>
            <dt>{formatCount(followerCount)}</dt>
            <dd>Followers</dd>
          </div>

          <div>
            <dt>{formatCount(followingCount)}</dt>
            <dd>Following</dd>
          </div>
        </dl>
      </header>

      <div className="your-playground__divider" />

      <section
        className="your-playground__work"
        aria-label={`${displayName} posts`}
      >
        <div className="your-playground__section-heading">
          <span>YOUR WORK</span>
          <span>{postCount}</span>
        </div>

        {children ? (
          children
        ) : (
          <div className="your-playground__empty">
            <strong>Your Playground is waiting.</strong>
            <p>
              Work you publish will appear here.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
