import {
  ContactSheet,
  EightBit,
  FilmArchive,
  Graphite,
  IvoryIndex,
  PressKit,
  Stardust,
} from "./experiences";
import type {
  ExperienceProfile,
  ExperienceProps,
} from "./shared";
import "./ExperienceRenderer.css";

export type { ExperienceProfile };

const experienceMap = {
  "ivory-index": IvoryIndex,
  "contact-sheet": ContactSheet,
  graphite: Graphite,
  "eight-bit": EightBit,
  "film-archive": FilmArchive,
  stardust: Stardust,
  "press-kit": PressKit,
} as const;

export default function ExperienceRenderer(
  props: ExperienceProps,
) {
  const Experience =
    experienceMap[
      props.themeId as keyof typeof experienceMap
    ] ?? IvoryIndex;

  return (
    <section
      className={
        `profile-experience-root ${props.className ?? ""}`.trim()
      }
      style={props.style}
      data-experience={props.themeId}
      aria-label={`${props.profile.displayName} profile`}
    >
      <button
        className="profile-experience-owner-edit"
        type="button"
        onClick={props.onEdit}
        aria-label="Edit profile"
      >
        <span aria-hidden="true">✦</span>
        Edit profile
      </button>

      <Experience {...props} />
    </section>
  );
}
