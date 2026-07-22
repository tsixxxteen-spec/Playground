import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  createAddObjectCommand,
  createMoveObjectCommand,
  createUpdateObjectCommand,
  executeWorldCommand,
} from "../commands";
import type {
  WorldCommand,
} from "../commands";
import { WorldProvider } from "../context";
import { WorldInspector } from "../inspector";
import { WorldObjectLibrary } from "../library";
import WorldObject from "./WorldObject";
import {
  normalizePlayground,
  normalizePlaygroundPosition,
} from "../types/playground";
import type {
  PlaygroundCanvasProps,
  PlaygroundObjectDefinition,
  PlaygroundObjectInstance,
  PlaygroundPosition,
} from "../types/playground";

const createInstanceId = (
  definitionId: string,
): string => {
  const uniquePart =
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  return `${definitionId}-${uniquePart}`;
};

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

  const executeCommand = useCallback(
    (command: WorldCommand) => {
      setDraft((current) => {
        const next = executeWorldCommand(
          command,
          current,
        );

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
      executeCommand(
        createUpdateObjectCommand(
          objectId,
          updater,
        ),
      );
    },
    [executeCommand],
  );

  const moveObject = useCallback(
    (
      objectId: string,
      position: PlaygroundPosition,
    ) => {
      executeCommand(
        createMoveObjectCommand(
          objectId,
          normalizePlaygroundPosition(position),
        ),
      );
    },
    [executeCommand],
  );

  const addObject = useCallback(
    (
      definition: PlaygroundObjectDefinition,
    ): string => {
      const id = createInstanceId(definition.id);

      const nextObject: PlaygroundObjectInstance = {
        id,
        objectId: definition.id,
        lane: definition.lane,
        enabled: true,
        position: {
          x: 50,
          y: 50,
        },
        rotation: 0,
        scale: definition.defaultScale ?? 1,
        zIndex: draft.objects.length + 1,
        action: definition.defaultAction,
      };

      executeCommand(
        createAddObjectCommand(nextObject),
      );

      return id;
    },
    [draft.objects.length, executeCommand],
  );

  const objects = draft.objects.filter(
    (object) => object.enabled,
  );

  if (!draft.enabled && mode !== "edit") {
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
          <>
            <WorldObjectLibrary
              onAddObject={addObject}
            />

            <WorldInspector
              playground={draft}
              onObjectChange={updateObject}
            />
          </>
        ) : null}
      </div>
    </WorldProvider>
  );
}
