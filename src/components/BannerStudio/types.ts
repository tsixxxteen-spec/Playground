import type { CSSProperties } from "react";

export type BannerTransform = {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  brightness: number;
};

export const DEFAULT_BANNER_TRANSFORM: BannerTransform = {
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

export function normalizeBannerTransform(
  transform?: Partial<BannerTransform> | null,
): BannerTransform {
  return {
    x: clamp(
      typeof transform?.x === "number"
        ? transform.x
        : 0,
      -0.75,
      0.75,
    ),

    y: clamp(
      typeof transform?.y === "number"
        ? transform.y
        : 0,
      -0.75,
      0.75,
    ),

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
      -20,
      20,
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

export function getBannerImageStyle(
  transform: BannerTransform,
): CSSProperties {
  const safe =
    normalizeBannerTransform(transform);

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
