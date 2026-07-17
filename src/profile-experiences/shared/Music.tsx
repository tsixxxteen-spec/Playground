import ProfileMusicPlayer from "../../components/ProfileMusicPlayer";
import type { ProfileSoundtrack } from "../../lib/profileSoundtrack";

type MusicProps = {
  soundtrack: ProfileSoundtrack;
  visible: boolean;
  hiddenAutoplay: boolean;
  variant: string;
  label?: string;
};

export default function Music({
  soundtrack,
  visible,
  hiddenAutoplay,
  variant,
  label,
}: MusicProps) {
  if (
    !soundtrack.tracks.length ||
    (!visible && !hiddenAutoplay)
  ) {
    return null;
  }

  return (
    <section className={`xp-music xp-music--${variant}`}>
      {label && (
        <span className="xp-music__label">
          {label}
        </span>
      )}

      <ProfileMusicPlayer
        soundtrack={soundtrack}
        variant={variant}
        visible
        hiddenMode={hiddenAutoplay}
        defaultExpanded={
          !hiddenAutoplay &&
          (variant === "graphite" || variant === "release")
        }
      />
    </section>
  );
}
