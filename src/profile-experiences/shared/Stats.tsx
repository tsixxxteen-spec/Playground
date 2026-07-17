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
  "postCount" | "followerCount" | "followingCount"
>;

export default function Stats({
  postCount,
  followerCount,
  followingCount,
}: StatsProps) {
  return (
    <dl className="xp-stats">
      {[
        ["Posts", postCount],
        ["Followers", followerCount],
        ["Following", followingCount],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{formatCount(Number(value))}</dt>
          <dd>{label}</dd>
        </div>
      ))}
    </dl>
  );
}
