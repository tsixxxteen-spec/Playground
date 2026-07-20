import type { PlaygroundObjectRendererProps } from "../../../world/types/playground";
import "./ObjectGlyph.css";

export default function ObjectGlyph({ definition, state }: PlaygroundObjectRendererProps) {
  const glyph = definition.fallbackLabel.slice(0, 2).toUpperCase();
  return (
    <span className="personalization-object-glyph" data-state={state} aria-hidden="true">
      <span>{glyph}</span>
    </span>
  );
}
