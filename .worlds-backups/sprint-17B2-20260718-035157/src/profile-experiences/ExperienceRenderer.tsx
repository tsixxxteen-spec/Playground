import { getTheme } from "../themes";
import type { ExperienceProfile, ExperienceProps } from "./shared";
import "./ExperienceRenderer.css";

export type { ExperienceProfile };

export default function ExperienceRenderer(props: ExperienceProps) {
  const activeEditorial = getTheme(props.themeId);
  const Experience = activeEditorial.component;

  return (
    <section
      className={`profile-experience-root ${props.className ?? ""}`.trim()}
      style={props.style}
      data-experience={activeEditorial.id}
      aria-label={`${props.profile.displayName} profile`}
    >
      <button className="profile-experience-owner-edit" type="button" onClick={props.onEdit} aria-label="Edit profile">
        <span aria-hidden="true">✦</span>
        Edit profile
      </button>
      <Experience {...props} themeId={activeEditorial.id} />
    </section>
  );
}
