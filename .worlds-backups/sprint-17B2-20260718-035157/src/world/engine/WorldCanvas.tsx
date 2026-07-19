import WorldObject from "./WorldObject";
import {
  normalizePlayground,
} from "../types/playground";
import type {
  WorldCanvasProps,
} from "../types/playground";

export default function WorldCanvas({
  playground,
  className,
  mode = "view",
  onObjectAction,
  onObjectSelect,
}: WorldCanvasProps) {
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
        <WorldObject
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
