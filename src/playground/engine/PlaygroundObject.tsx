import {
  useMemo,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent,
} from "react";
import { playgroundRegistry } from "./PlaygroundRegistry";
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

export default function PlaygroundObject({
  object,
  mode = "view",
  onAction,
  onSelect,
}: Props) {
  const definition = playgroundRegistry.get(
    object.objectId,
  );

  const [state, setState] =
    useState<PlaygroundObjectState>("idle");

  const style = useMemo<CSSProperties>(
    () => ({
      position: "absolute",
      left: `${object.position.x}%`,
      top: `${object.position.y}%`,
      zIndex: object.zIndex,
      transform: `translate(-50%, -50%) rotate(${object.rotation}deg) scale(${object.scale})`,
      transformOrigin: "center center",
      touchAction: mode === "edit" ? "none" : "auto",
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
    ],
  );

  if (!object.enabled || !definition) {
    return null;
  }

  const trigger = () => {
    if (mode === "edit") {
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

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      trigger();
    }
  };

  const motionClassName = motionClassForState(
    state,
    definition.motion,
  );

  const className = [
    "playground-object",
    `playground-object--${definition.lane}`,
    definition.className,
    motionClassName,
    mode === "edit"
      ? "playground-object--editable"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      style={style}
      data-object-id={object.id}
      data-definition-id={definition.id}
      data-state={state}
      aria-label={definition.name}
      onClick={trigger}
      onKeyDown={onKeyDown}
      onPointerEnter={() => setState("hovered")}
      onPointerLeave={() => setState("idle")}
    >
      {definition.asset ? (
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
