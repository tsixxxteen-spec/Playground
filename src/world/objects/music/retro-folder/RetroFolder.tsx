import type {
  PlaygroundObjectRendererProps,
} from "../../../types/playground";
import "./RetroFolder.css";

export default function RetroFolder({
  state,
}: PlaygroundObjectRendererProps) {
  return (
    <span
      className="retro-folder"
      data-retro-folder-state={state}
      aria-hidden="true"
    >
      <span className="retro-folder__tab" />
      <span className="retro-folder__back" />
      <span className="retro-folder__paper">
        <span />
        <span />
        <span />
      </span>
      <span className="retro-folder__front">
        <span className="retro-folder__label">
          MUSIC
        </span>
      </span>
    </span>
  );
}
