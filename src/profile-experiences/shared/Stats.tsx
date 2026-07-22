import type { KeyboardEvent } from "react";
import type { ExperienceProps } from "./ExperienceTypes";

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

type StatsProps = Pick<
  ExperienceProps,
  | "postCount"
  | "followerCount"
  | "followingCount"
  | "isOwner"
  | "onFollowersClick"
  | "onFollowingClick"
>;

export default function Stats({
  postCount,
  followerCount,
  followingCount,
  isOwner = true,
  onFollowersClick,
  onFollowingClick,
}: StatsProps) {
  const visibleStats: {
  label: string;
  value: number;
  onClick?: () => void;
}[] = [
    {
      label: "Posts",
      value: postCount,
      onClick: undefined,
    },
  ];

  if (isOwner) {
    visibleStats.push(
      {
        label: "Followers",
        value: followerCount,
        onClick: onFollowersClick,
      },
      {
        label: "Following",
        value: followingCount,
        onClick: onFollowingClick,
      },
    );
  }

  return (
    <dl
      className="xp-stats"
      aria-label={isOwner ? "Your profile statistics" : "Profile statistics"}
    >
      {visibleStats.map(({ label, value, onClick }) => {
        const interactive = typeof onClick === "function";

        const handleKeyDown = (
          event: KeyboardEvent<HTMLDivElement>,
        ) => {
          if (!interactive) {
            return;
          }

          if (
      (event.key === "Enter" || event.key === " ") &&
      onClick
    ) {
      event.preventDefault();
      onClick();
    }
        };

        return (
          <div
            key={label}
            className={
              interactive
                ? "xp-stat xp-stat--interactive"
                : "xp-stat"
            }
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={
              interactive
                ? `Open your ${label.toLowerCase()}`
                : undefined
            }
            onClick={onClick}
            onKeyDown={handleKeyDown}
          >
            <dt>{formatCount(value)}</dt>

            <dd>
              {label}

              {interactive ? (
                <span
                  className="xp-stat__arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
