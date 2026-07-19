import {
  useCallback,
  useEffect,
  useRef,
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
import { HistoryProvider, useHistory } from "../history";
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

function WorldCanvasEditor({
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

  const {
    clear: clearHistory,
    record: recordHistory,
    undo,
    redo,
  } = useHistory();

  const pendingInternalPlaygroundRef = useRef<
    ReturnType<typeof normalizePlayground> | null
  >(null);

  useEffect(() => {
    const normalized = normalizePlayground(playground);
    const pending = pendingInternalPlaygroundRef.current;

    if (
      pending &&
      JSON.stringify(pending) === JSON.stringify(normalized)
    ) {
      pendingInternalPlaygroundRef.current = null;
      return;
    }

    pendingInternalPlaygroundRef.current = null;
    setDraft(normalized);
    clearHistory();
  }, [playground, clearHistory]);

  const publishPlayground = useCallback(
    (next: ReturnType<typeof normalizePlayground>) => {
      pendingInternalPlaygroundRef.current = next;
      onPlaygroundChange?.(next);
    },
    [onPlaygroundChange],
  );

  const executeCommand = useCallback(
    (command: WorldCommand) => {
      setDraft((current) => {
        const next = executeWorldCommand(
          command,
          current,
        );

        recordHistory(
          current,
          next,
          command.id,
          command.label,
        );

        publishPlayground(next);
        return next;
      });
    },
    [publishPlayground, recordHistory],
  );

  const handleUndo = useCallback(() => {
    const previous = undo(draft);

    if (!previous) {
      return;
    }

    setDraft(previous);
    publishPlayground(previous);
  }, [draft, publishPlayground, undo]);

  const handleRedo = useCallback(() => {
    const next = redo(draft);

    if (!next) {
      return;
    }

    setDraft(next);
    publishPlayground(next);
  }, [draft, publishPlayground, redo]);

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
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          </>
        ) : null}
      </div>
    </WorldProvider>
  );
}


export default function WorldCanvas(
  props: PlaygroundCanvasProps,
) {
  return (
    <HistoryProvider limit={100}>
      <WorldCanvasEditor {...props} />
    </HistoryProvider>
  );
}
