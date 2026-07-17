import type { CSSProperties, ReactNode } from "react";
import type { AvatarTransform } from "../../components/AvatarStudio";
import type { ProfileSoundtrack } from "../../lib/profileSoundtrack";

export type ExperienceProfile = {
  displayName: string;
  username: string;
  bio: string;
  avatarSrc?: string;
  avatarTransform: AvatarTransform;
};

export type ExperienceProps = {
  themeId: string;
  className?: string;
  style?: CSSProperties;
  profile: ExperienceProfile;
  posts: ReactNode;
  postCount: number;
  followerCount: number;
  followingCount: number;
  soundtrack: ProfileSoundtrack;
  showMusicPlayer: boolean;
  hiddenAutoplay: boolean;
  onEdit: () => void;
};
