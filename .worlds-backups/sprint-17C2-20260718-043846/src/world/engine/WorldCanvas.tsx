import { WorldProvider } from "../context";
import WorldObject from "./WorldObject";
import {
  normalizePlayground,
} from "../types/playground";
import type {
  PlaygroundCanvasProps,
} from "../types/playground";

export default function WorldCanvas({
  playground,
  className,
  mode = "view",
  onObjectAction,
  onObjectSelect,
}: PlaygroundCanvasProps) {
  const normalized =
    normalizePlayground(playground);

  const objects = normalized.objects.filter(
    (object) => object.enabled,
  );

  if (
    !normalized.enabled ||
    objects.length === 0
  ) {
    return null;
  }

  const canvasClassName = [
    "world-canvas",
    `world-canvas--${mode}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <WorldProvider>
      <div
        className={canvasClassName}
        data-world-object-count={objects.length}
        aria-label={
          mode === "edit"
            ? "Interactive object editor"
            : "Interactive profile objects"
        }
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 6,
          overflow: "hidden",
          pointerEvents: "none",
        }}
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
    </WorldProvider>
  );
}
