import type { CSSProperties } from "react";
import type { PlaygroundLane } from "../constants/lanes";

export type PlaygroundObjectState =
  | "idle"
  | "hovered"
  | "opening"
  | "open"
  | "closing"
  | "disabled";

export type PlaygroundActionType =
  | "open-music"
  | "open-photos"
  | "open-videos"
  | "open-url"
  | "none";

export type PlaygroundPosition = {
  /**
   * Position as a percentage of the canvas width.
   * Keeping this normalized makes layouts portable between screen sizes.
   */
  x: number;

  /**
   * Position as a percentage of the canvas height.
   */
  y: number;
};

export type PlaygroundAction = {
  type: PlaygroundActionType;
  target?: string;
};

export type PlaygroundObjectInstance = {
  /** Unique ID for this placed object. */
  id: string;

  /** Registry key, such as "retro-desktop-folder". */
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
  /**
   * Master switch. When false, the object layer renders nothing.
   */
  enabled: boolean;

  objects: PlaygroundObjectInstance[];
};

export type PlaygroundMotionDefinition = {
  idleClassName?: string;
  hoverClassName?: string;
  openingClassName?: string;
  openClassName?: string;
  closingClassName?: string;
};

export type PlaygroundObjectDefinition = {
  /** Stable registry key. */
  id: string;

  name: string;
  description?: string;
  lane: PlaygroundLane;

  /**
   * Optional asset URLs. These can later point to PNG, WebP, SVG,
   * or theme-specific artwork.
   */
  asset?: string;
  previewAsset?: string;

  /**
   * Accessible fallback shown when an artwork asset is not supplied.
   */
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
