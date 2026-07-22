import {
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useWorld } from "../context";
import { worldRegistry } from "./WorldRegistry";
import type {
  PlaygroundCanvasMode,
  PlaygroundInteractionHandler,
  PlaygroundObjectInstance,
  PlaygroundObjectState,
  PlaygroundPosition,
} from "../types/playground";

type Props = {
  object: PlaygroundObjectInstance;
  mode?: PlaygroundCanvasMode;
  onAction?: PlaygroundInteractionHandler;
  onSelect?: (
    object: PlaygroundObjectInstance,
  ) => void;
  onMove?: (
    objectId: string,
    position: PlaygroundPosition,
  ) => void;
};

type DragSession = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPosition: PlaygroundPosition;
  canvasWidth: number;
  canvasHeight: number;
  dragStarted: boolean;
};

const DRAG_START_THRESHOLD_PX = 5;

const motionClassForState = (
  state: PlaygroundObjectState,
  motion:
    | {
        idleClassName?: string;
        hoverClassName?: string;
        openingClassName?: string;
        openClassName?: string;
        closingClassName?: string;
        draggingClassName?: string;
      }
    | undefined,
): string | undefined => {
  if (!motion) return undefined;

  switch (state) {
    case "hovered":
      return motion.hoverClassName;
    case "opening":
      return motion.openingClassName;
    case "open":
      return motion.openClassName;
    case "closing":
      return motion.closingClassName;
    case "dragging":
      return motion.draggingClassName;
    case "idle":
    default:
      return motion.idleClassName;
  }
};

export default function WorldObject({
  object,
  mode = "view",
  onAction,
  onSelect,
  onMove,
}: Props) {
  const definition = worldRegistry.get(
    object.objectId,
  );

  const {
    selectObject,
    isSelected,
    setHoveredObjectId,
    setDraggingObjectId,
  } = useWorld();

  const [state, setState] =
    useState<PlaygroundObjectState>("idle");

  const dragSessionRef =
    useRef<DragSession | null>(null);

  const draggedRef = useRef(false);

  const selected = isSelected(object.id);
  const dragging = state === "dragging";

  const style = useMemo<CSSProperties>(
    () => ({
      position: "absolute",
      left: `${object.position.x}%`,
      top: `${object.position.y}%`,
      zIndex: dragging
        ? Math.max(object.zIndex, 999)
        : object.zIndex,
      padding: 0,
      border: 0,
      borderRadius: 12,
      background: "transparent",
      color: "inherit",
      cursor:
        mode === "edit"
          ? dragging
            ? "grabbing"
            : "grab"
          : "pointer",
      pointerEvents: "auto",
      transform: `translate(-50%, -50%) rotate(${object.rotation}deg) scale(${object.scale})`,
      transformOrigin: "center center",
      transition: dragging
        ? "filter 90ms ease, box-shadow 90ms ease"
        : "left 140ms cubic-bezier(.2,.8,.2,1), top 140ms cubic-bezier(.2,.8,.2,1), transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 150ms ease, filter 150ms ease",
      touchAction:
        mode === "edit"
          ? "none"
          : "auto",
      boxShadow:
        mode === "edit" && selected
          ? dragging
            ? "0 0 0 2px rgba(255,255,255,.98), 0 0 0 7px rgba(75,145,255,.88), 0 18px 34px rgba(0,0,0,.28)"
            : "0 0 0 2px rgba(255,255,255,.95), 0 0 0 6px rgba(75,145,255,.75)"
          : mode === "edit" && state === "hovered"
            ? "0 0 0 1px rgba(255,255,255,.72), 0 0 0 4px rgba(75,145,255,.3)"
            : "none",
      filter: dragging
        ? "drop-shadow(0 18px 18px rgba(0,0,0,.32))"
        : state === "hovered" && mode === "edit"
          ? "brightness(1.04)"
          : undefined,
      ...definition?.style,
    }),
    [
      definition?.style,
      dragging,
      mode,
      object.position.x,
      object.position.y,
      object.rotation,
      object.scale,
      object.zIndex,
      selected,
    ],
  );

  if (!object.enabled || !definition) {
    return null;
  }

  const trigger = () => {
    if (mode === "edit") {
      selectObject(object.id);
      onSelect?.(object);
      return;
    }

    setState("opening");

    onAction?.({
      object,
      definition,
      action:
        object.action.type === "none"
          ? definition.defaultAction
          : object.action,
    });

    window.setTimeout(() => {
      setState("open");
    }, 160);
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (mode !== "edit") return;

    const canvas = event.currentTarget.closest(
      ".world-canvas",
    );

    if (!(canvas instanceof HTMLElement)) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();

    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    selectObject(object.id);
    onSelect?.(object);
    draggedRef.current = false;

    dragSessionRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: object.position,
      canvasWidth: bounds.width,
      canvasHeight: bounds.height,
      dragStarted: false,
    };
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const session = dragSessionRef.current;

    if (
      mode !== "edit" ||
      !session ||
      session.pointerId !== event.pointerId
    ) {
      return;
    }

    const deltaX =
      event.clientX - session.startClientX;
    const deltaY =
      event.clientY - session.startClientY;

    const travelDistance = Math.hypot(
      deltaX,
      deltaY,
    );

    if (
      !session.dragStarted &&
      travelDistance < DRAG_START_THRESHOLD_PX
    ) {
      return;
    }

    if (!session.dragStarted) {
      session.dragStarted = true;
      draggedRef.current = true;
      setDraggingObjectId(object.id);
      setState("dragging");
    }

    onMove?.(object.id, {
      x:
        session.startPosition.x +
        (deltaX / session.canvasWidth) * 100,
      y:
        session.startPosition.y +
        (deltaY / session.canvasHeight) * 100,
    });
  };

  const finishDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const session = dragSessionRef.current;

    if (
      !session ||
      session.pointerId !== event.pointerId
    ) {
      return;
    }

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    const dragStarted = session.dragStarted;

    dragSessionRef.current = null;

    if (dragStarted) {
      setDraggingObjectId(null);
    }

    setState(
      event.currentTarget.matches(":hover")
        ? "hovered"
        : "idle",
    );
  };

  const handleClick = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }

    trigger();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      trigger();
    }
  };

  const motionClassName =
    motionClassForState(
      state,
      definition.motion,
    );

  const className = [
    "world-object",
    `world-object--${definition.lane}`,
    definition.className,
    motionClassName,
    selected
      ? "world-object--selected"
      : "",
    dragging
      ? "world-object--dragging"
      : "",
    mode === "edit"
      ? "world-object--editable"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const Component = definition.component;

  return (
    <button
      type="button"
      className={className}
      style={style}
      data-object-id={object.id}
      data-definition-id={definition.id}
      data-state={state}
      data-selected={selected}
      data-dragging={dragging}
      aria-label={definition.name}
      aria-pressed={
        mode === "edit"
          ? selected
          : undefined
      }
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onPointerEnter={() => {
        if (!dragSessionRef.current) {
          setState("hovered");
        }

        setHoveredObjectId(object.id);
      }}
      onPointerLeave={() => {
        if (!dragSessionRef.current) {
          setState("idle");
        }

        setHoveredObjectId(null);
      }}
    >
      {Component ? (
        <Component
          state={state}
          definition={definition}
          object={object}
        />
      ) : definition.asset ? (
        <img
          src={definition.asset}
          alt=""
          draggable={false}
        />
      ) : (
        <span aria-hidden="true">
          {definition.fallbackLabel}
        </span>
      )}
    </button>
  );
}
