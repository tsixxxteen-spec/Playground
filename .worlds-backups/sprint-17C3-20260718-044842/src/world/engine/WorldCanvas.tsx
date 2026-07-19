import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { WorldProvider } from "../context";
import WorldObject from "./WorldObject";
import {
  normalizePlayground,
  normalizePlaygroundPosition,
} from "../types/playground";
import type {
  PlaygroundCanvasProps,
  PlaygroundPosition,
} from "../types/playground";

export default function WorldCanvas({
  playground,
  className,
  mode = "view",
  onObjectAction,
  onObjectSelect,
  onPlaygroundChange,
}: PlaygroundCanvasProps) {
  const [draft, setDraft] = useState(() =>
    normalizePlayground(playground),
  );

  useEffect(() => {
    setDraft(normalizePlayground(playground));
  }, [playground]);

  const moveObject = useCallback(
    (
      objectId: string,
      position: PlaygroundPosition,
    ) => {
      setDraft((current) => {
        const normalizedPosition =
          normalizePlaygroundPosition(position);

        const next = {
          ...current,
          objects: current.objects.map((object) =>
            object.id === objectId
              ? {
                  ...object,
                  position: normalizedPosition,
                }
              : object,
          ),
        };

        onPlaygroundChange?.(next);
        return next;
      });
    },
    [onPlaygroundChange],
  );

  const objects = draft.objects.filter(
    (object) => object.enabled,
  );

  if (!draft.enabled || objects.length === 0) {
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
        data-world-mode={mode}
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
            onMove={moveObject}
          />
        ))}
      </div>
    </WorldProvider>
  );
}
