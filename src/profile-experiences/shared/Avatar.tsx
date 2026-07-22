import {
  DEFAULT_AVATAR_TRANSFORM,
  getAvatarImageStyle,
} from "../../components/AvatarStudio";
import type { ExperienceProfile } from "./ExperienceTypes";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  return words.length
    ? words
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("")
    : "PG";
}

type AvatarProps = {
  profile: ExperienceProfile;
};

export default function Avatar({ profile }: AvatarProps) {
  if (profile.avatarSrc) {
    const img = new Image();
    img.onload = () => {
      console.log("===== AVATAR DEBUG =====");
      console.log("src:", profile.avatarSrc);
      console.log(
        "natural:",
        img.naturalWidth + "x" + img.naturalHeight,
      );
    };
    img.src = profile.avatarSrc;
  }

  return (
    <div className="xp-avatar">
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
        <span>{initials(profile.displayName)}</span>
      )}
    </div>
  );
}