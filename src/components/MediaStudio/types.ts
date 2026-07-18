import type { CSSProperties } from "react";

export type MediaTransform = {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  brightness: number;
};

export const DEFAULT_MEDIA_TRANSFORM: MediaTransform = {
  x: 0,
  y: 0,
  zoom: 1,
  rotation: 0,
  brightness: 1,
};

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

export function normalizeMediaTransform(
  transform?: Partial<MediaTransform> | null,
): MediaTransform {
  const rawX =
    typeof transform?.x === "number"
      ? transform.x
      : 0;

  const rawY =
    typeof transform?.y === "number"
      ? transform.y
      : 0;

  const normalizedX =
    Math.abs(rawX) > 2
      ? rawX / 310
      : rawX;

  const normalizedY =
    Math.abs(rawY) > 2
      ? rawY / 310
      : rawY;

  return {
    x: clamp(normalizedX, -0.6, 0.6),
    y: clamp(normalizedY, -0.6, 0.6),

    zoom: clamp(
      typeof transform?.zoom === "number"
        ? transform.zoom
        : 1,
      1,
      3,
    ),

    rotation: clamp(
      typeof transform?.rotation === "number"
        ? transform.rotation
        : 0,
      -30,
      30,
    ),

    brightness: clamp(
      typeof transform?.brightness === "number"
        ? transform.brightness
        : 1,
      0.5,
      1.5,
    ),
  };
}

export function getMediaImageStyle(
  transform: MediaTransform,
): CSSProperties {
  const safe =
    normalizeMediaTransform(transform);

  return {
    transform: [
      `translate(${safe.x * 100}%, ${safe.y * 100}%)`,
      `scale(${safe.zoom})`,
      `rotate(${safe.rotation}deg)`,
    ].join(" "),

    filter:
      safe.brightness === 1
        ? undefined
        : `brightness(${safe.brightness})`,

    imageRendering: "auto",
    backfaceVisibility: "hidden",
  };
}
