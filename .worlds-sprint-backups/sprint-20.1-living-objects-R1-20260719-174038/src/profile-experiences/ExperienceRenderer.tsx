import { getTheme } from "../themes";
import WorldCanvas from "../world/engine/WorldCanvas";
import { registerWorld } from "../world/registerWorld";
import type { PlaygroundData } from "../world/types/playground";
import type { ExperienceProfile, ExperienceProps } from "./shared";
import "./ExperienceRenderer.css";

export type { ExperienceProfile };

type WorldExperienceProps = ExperienceProps & {
  playground?: PlaygroundData;
};

registerWorld();

export default function ExperienceRenderer(props: WorldExperienceProps) {
  const activeEditorial = getTheme(props.themeId);
  const Experience = activeEditorial.component;
  const { playground, ...experienceProps } = props;

  return (
    <section
      className={`profile-experience-root ${props.className ?? ""}`.trim()}
      style={{ ...props.style, position: "relative" }}
      data-experience={activeEditorial.id}
      aria-label={`${props.profile.displayName} profile`}
    >
      <button className="profile-experience-owner-edit" type="button" onClick={props.onEdit} aria-label="Edit profile">
        <span aria-hidden="true">✦</span>
        Edit profile
      </button>
      <WorldCanvas
        playground={playground}
        onObjectAction={(event) => {
          console.info("World object action:", event.action.type);
        }}
      />
      <Experience
        {...experienceProps}
        themeId={activeEditorial.id}
      />
    </section>
  );
}
