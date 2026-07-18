import PlaygroundObject from "./PlaygroundObject";
import {
  normalizePlayground,
} from "../types/playground";
import type {
  PlaygroundCanvasProps,
} from "../types/playground";

export default function PlaygroundCanvas({
  playground,
  className,
  mode = "view",
  onObjectAction,
  onObjectSelect,
}: PlaygroundCanvasProps) {
  const normalized = normalizePlayground(playground);
  const objects = normalized.objects.filter(
    (object) => object.enabled,
  );

  if (!normalized.enabled || objects.length === 0) {
    return null;
  }

  const canvasClassName = [
    "playground-canvas",
    `playground-canvas--${mode}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={canvasClassName}
      data-playground-object-count={objects.length}
      aria-label={
        mode === "edit"
          ? "Interactive object editor"
          : "Interactive profile objects"
      }
    >
      {objects.map((object) => (
        <PlaygroundObject
          key={object.id}
          object={object}
          mode={mode}
          onAction={onObjectAction}
          onSelect={onObjectSelect}
        />
      ))}
    </div>
  );
}
