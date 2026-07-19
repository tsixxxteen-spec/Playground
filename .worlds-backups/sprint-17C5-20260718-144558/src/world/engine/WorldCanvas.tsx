import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { WorldProvider } from "../context";
import { WorldInspector } from "../inspector";
import WorldObject from "./WorldObject";
import {
  normalizePlayground,
  normalizePlaygroundPosition,
} from "../types/playground";
import type {
  PlaygroundCanvasProps,
  PlaygroundObjectInstance,
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

  const commitDraft = useCallback(
    (
      updater: (
        current: typeof draft,
      ) => typeof draft,
    ) => {
      setDraft((current) => {
        const next = updater(current);
        onPlaygroundChange?.(next);
        return next;
      });
    },
    [onPlaygroundChange],
  );

  const updateObject = useCallback(
    (
      objectId: string,
      updater: (
        object: PlaygroundObjectInstance,
      ) => PlaygroundObjectInstance,
    ) => {
      commitDraft((current) => ({
        ...current,
        objects: current.objects.map((object) =>
          object.id === objectId
            ? updater(object)
            : object,
        ),
      }));
    },
    [commitDraft],
  );

  const moveObject = useCallback(
    (
      objectId: string,
      position: PlaygroundPosition,
    ) => {
      updateObject(objectId, (object) => ({
        ...object,
        position:
          normalizePlaygroundPosition(position),
      }));
    },
    [updateObject],
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

        {mode === "edit" ? (
          <WorldInspector
            playground={draft}
            onObjectChange={updateObject}
          />
        ) : null}
      </div>
    </WorldProvider>
  );
}
