import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createAddObjectCommand,
  createDeleteObjectCommand,
  createDuplicateObjectCommand,
  createMoveObjectCommand,
  createUpdateObjectCommand,
  executeWorldCommand,
} from "../commands";
import type {
  WorldCommand,
} from "../commands";
import { WorldProvider, useWorld } from "../context";
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
import { createInstanceId } from "../utils/createInstanceId";

const isEditableShortcutTarget = (
  target: EventTarget | null,
): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.closest(
      "input, textarea, select, [contenteditable='true']",
    ) !== null
  );
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

  const {
    selectedObjectId,
    selectObject,
    clearSelection,
  } = useWorld();

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
          selectedObjectId,
        );

        publishPlayground(next);
        return next;
      });
    },
    [publishPlayground, recordHistory, selectedObjectId],
  );

  const reconcileSelection = useCallback(
    (
      playground: ReturnType<typeof normalizePlayground>,
      selectionId: string | null,
    ) => {
      const selectionExists =
        selectionId !== null &&
        playground.objects.some(
          (object) => object.id === selectionId,
        );

      if (selectionExists && selectionId) {
        selectObject(selectionId);
        return;
      }

      clearSelection();
    },
    [clearSelection, selectObject],
  );

  const handleUndo = useCallback(() => {
    const previous = undo(
      draft,
      selectedObjectId,
    );

    if (!previous) {
      return;
    }

    setDraft(previous.playground);
    publishPlayground(previous.playground);
    reconcileSelection(
      previous.playground,
      previous.selectionId,
    );
  }, [
    draft,
    publishPlayground,
    reconcileSelection,
    selectedObjectId,
    undo,
  ]);

  const handleRedo = useCallback(() => {
    const next = redo(
      draft,
      selectedObjectId,
    );

    if (!next) {
      return;
    }

    setDraft(next.playground);
    publishPlayground(next.playground);
    reconcileSelection(
      next.playground,
      next.selectionId,
    );
  }, [
    draft,
    publishPlayground,
    reconcileSelection,
    redo,
    selectedObjectId,
  ]);

  useEffect(() => {
    if (mode !== "edit") {
      return undefined;
    }

    const handleHistoryShortcut = (
      event: KeyboardEvent,
    ) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        isEditableShortcutTarget(event.target)
      ) {
        return;
      }

      const modifierPressed =
        event.metaKey || event.ctrlKey;

      if (!modifierPressed) {
        return;
      }

      const key = event.key.toLowerCase();
      const undoRequested =
        key === "z" && !event.shiftKey;
      const redoRequested =
        (key === "z" && event.shiftKey) ||
        (key === "y" && event.ctrlKey && !event.metaKey);

      if (undoRequested) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (redoRequested) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener(
      "keydown",
      handleHistoryShortcut,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleHistoryShortcut,
      );
    };
  }, [handleRedo, handleUndo, mode]);

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

  const duplicateObject = useCallback(
    (objectId: string): string | null => {
      const sourceObject = draft.objects.find(
        (object) => object.id === objectId,
      );

      if (!sourceObject) {
        return null;
      }

      const duplicateId = createInstanceId(
        sourceObject.objectId,
      );

      executeCommand(
        createDuplicateObjectCommand(
          objectId,
          duplicateId,
        ),
      );

      return duplicateId;
    },
    [draft.objects, executeCommand],
  );

  const deleteObject = useCallback(
    (objectId: string): boolean => {
      const objectExists = draft.objects.some(
        (object) => object.id === objectId,
      );

      if (!objectExists) {
        return false;
      }

      executeCommand(
        createDeleteObjectCommand(objectId),
      );

      return true;
    },
    [draft.objects, executeCommand],
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
              onDuplicate={duplicateObject}
              onDelete={deleteObject}
            />
          </>
        ) : null}
      </div>
  );
}


export default function WorldCanvas(
  props: PlaygroundCanvasProps,
) {
  return (
    <HistoryProvider limit={100}>
      <WorldProvider>
        <WorldCanvasEditor {...props} />
      </WorldProvider>
    </HistoryProvider>
  );
}
