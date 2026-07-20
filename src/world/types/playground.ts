import type {
  ComponentType,
  CSSProperties,
} from "react";
import type { PlaygroundLane } from "../constants/lanes";

export type PlaygroundObjectState =
  | "idle"
  | "hovered"
  | "opening"
  | "open"
  | "closing"
  | "dragging"
  | "disabled";

export type PlaygroundActionType =
  | "open-music"
  | "open-photos"
  | "open-videos"
  | "open-url"
  | "toggle-light"
  | "water-plant"
  | "sip-coffee"
  | "pet-companion"
  | "none";

export type PlaygroundPosition = {
  x: number;
  y: number;
};

export type PlaygroundAction = {
  type: PlaygroundActionType;
  target?: string;
};

export type PlaygroundObjectInstance = {
  id: string;
  objectId: string;
  lane: PlaygroundLane;
  enabled: boolean;
  position: PlaygroundPosition;
  rotation: number;
  scale: number;
  zIndex: number;
  action: PlaygroundAction;
};

export type PlaygroundData = {
  enabled: boolean;
  objects: PlaygroundObjectInstance[];
};

export type PlaygroundMotionDefinition = {
  idleClassName?: string;
  hoverClassName?: string;
  openingClassName?: string;
  openClassName?: string;
  closingClassName?: string;
  draggingClassName?: string;
};

export type PlaygroundObjectRendererProps = {
  state: PlaygroundObjectState;
  definition: PlaygroundObjectDefinition;
  object: PlaygroundObjectInstance;
};

export type PlaygroundObjectDefinition = {
  id: string;
  name: string;
  description?: string;
  lane: PlaygroundLane;
  component?: ComponentType<PlaygroundObjectRendererProps>;
  asset?: string;
  previewAsset?: string;
  fallbackLabel: string;
  defaultAction: PlaygroundAction;
  defaultScale?: number;
  className?: string;
  style?: CSSProperties;
  motion?: PlaygroundMotionDefinition;
};

export type PlaygroundInteractionEvent = {
  object: PlaygroundObjectInstance;
  definition: PlaygroundObjectDefinition;
  action: PlaygroundAction;
};

export type PlaygroundInteractionHandler = (
  event: PlaygroundInteractionEvent,
) => void;

export type PlaygroundCanvasMode = "view" | "edit";

export type PlaygroundCanvasProps = {
  playground?: PlaygroundData | null;
  className?: string;
  mode?: PlaygroundCanvasMode;
  onObjectAction?: PlaygroundInteractionHandler;
  onObjectSelect?: (
    object: PlaygroundObjectInstance,
  ) => void;
  onPlaygroundChange?: (
    playground: PlaygroundData,
  ) => void;
};

export const EMPTY_PLAYGROUND: PlaygroundData = {
  enabled: false,
  objects: [],
};

export const normalizePlaygroundPosition = (
  position: PlaygroundPosition,
): PlaygroundPosition => ({
  x: Math.min(100, Math.max(0, position.x)),
  y: Math.min(100, Math.max(0, position.y)),
});

export const normalizePlaygroundObject = (
  object: PlaygroundObjectInstance,
): PlaygroundObjectInstance => ({
  ...object,
  enabled: object.enabled !== false,
  position: normalizePlaygroundPosition(object.position),
  rotation: Number.isFinite(object.rotation)
    ? object.rotation
    : 0,
  scale:
    Number.isFinite(object.scale) && object.scale > 0
      ? object.scale
      : 1,
  zIndex: Number.isFinite(object.zIndex)
    ? object.zIndex
    : 0,
});

export const normalizePlayground = (
  playground?: PlaygroundData | null,
): PlaygroundData => {
  if (!playground) return EMPTY_PLAYGROUND;

  return {
    enabled: playground.enabled === true,
    objects: Array.isArray(playground.objects)
      ? playground.objects.map(normalizePlaygroundObject)
      : [],
  };
};
