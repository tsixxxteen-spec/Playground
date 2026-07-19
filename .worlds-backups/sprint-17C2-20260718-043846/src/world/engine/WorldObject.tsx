import {
  useMemo,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent,
} from "react";
import { useWorld } from "../context";
import { worldRegistry } from "./WorldRegistry";
import type {
  PlaygroundCanvasMode,
  PlaygroundInteractionHandler,
  PlaygroundObjectInstance,
  PlaygroundObjectState,
} from "../types/playground";

type Props = {
  object: PlaygroundObjectInstance;
  mode?: PlaygroundCanvasMode;
  onAction?: PlaygroundInteractionHandler;
  onSelect?: (
    object: PlaygroundObjectInstance,
  ) => void;
};

const motionClassForState = (
  state: PlaygroundObjectState,
  motion:
    | {
        idleClassName?: string;
        hoverClassName?: string;
        openingClassName?: string;
        openClassName?: string;
        closingClassName?: string;
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
}: Props) {
  const definition = worldRegistry.get(
    object.objectId,
  );

  const {
    selectObject,
    isSelected,
    setHoveredObjectId,
  } = useWorld();

  const [state, setState] =
    useState<PlaygroundObjectState>("idle");

  const selected = isSelected(object.id);

  const style = useMemo<CSSProperties>(
    () => ({
      position: "absolute",
      left: `${object.position.x}%`,
      top: `${object.position.y}%`,
      zIndex: object.zIndex,
      padding: 0,
      border: 0,
      borderRadius: 12,
      background: "transparent",
      color: "inherit",
      cursor:
        mode === "edit"
          ? "grab"
          : "pointer",
      pointerEvents: "auto",
      transform: `translate(-50%, -50%) rotate(${object.rotation}deg) scale(${object.scale})`,
      transformOrigin: "center center",
      transition:
        "transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease",
      touchAction:
        mode === "edit"
          ? "none"
          : "auto",
      boxShadow:
        mode === "edit" && selected
          ? "0 0 0 2px rgba(255,255,255,.95), 0 0 0 6px rgba(75,145,255,.75)"
          : "none",
      ...definition?.style,
    }),
    [
      definition?.style,
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
      aria-label={definition.name}
      aria-pressed={
        mode === "edit"
          ? selected
          : undefined
      }
      onClick={trigger}
      onKeyDown={handleKeyDown}
      onPointerEnter={() => {
        setState("hovered");
        setHoveredObjectId(object.id);
      }}
      onPointerLeave={() => {
        setState("idle");
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
