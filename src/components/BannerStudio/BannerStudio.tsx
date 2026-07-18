import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";

import "./BannerStudio.css";

export type BannerTransform = {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  brightness: number;
};

type BannerStudioProps = {
  imageSrc: string;
  initialTransform?: BannerTransform;
  onCancel: () => void;
  onSave: (transform: BannerTransform) => void;
};

export const DEFAULT_BANNER_TRANSFORM: BannerTransform = {
  // X and Y are normalized ratios rather than pixels.
  // 0.1 means 10% of the banner's rendered size.
  x: 0,
  y: 0,
  zoom: 1,
  rotation: 0,
  brightness: 1,
};

export function normalizeBannerTransform(
  transform?: Partial<BannerTransform> | null,
): BannerTransform {
  const rawX =
    typeof transform?.x === "number"
      ? transform.x
      : 0;

  const rawY =
    typeof transform?.y === "number"
      ? transform.y
      : 0;

  /*
   * Migrate transforms saved by the earlier pixel-based
   * version. Banner Studio previously used a 310px canvas.
   */
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

export function getBannerImageStyle(
  transform: BannerTransform,
): CSSProperties {
  const safeTransform =
    normalizeBannerTransform(transform);

  return {
    transform: [
      `translate3d(${safeTransform.x * 100}%, ${safeTransform.y * 100}%, 0)`,
      `scale(${safeTransform.zoom})`,
      `rotate(${safeTransform.rotation}deg)`,
    ].join(" "),

    filter:
      `brightness(${safeTransform.brightness})`,
  };
}

export default function BannerStudio({
  imageSrc,
  initialTransform = DEFAULT_BANNER_TRANSFORM,
  onCancel,
  onSave,
}: BannerStudioProps) {
  const [transform, setTransform] =
    useState<BannerTransform>(() =>
      normalizeBannerTransform(
        initialTransform,
      ),
    );

  const dragRef = useRef<{
    pointerId: number;
    startPointerX: number;
    startPointerY: number;
    startImageX: number;
    startImageY: number;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.body.classList.add(
      "banner-studio-open",
    );

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.classList.remove(
        "banner-studio-open",
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onCancel]);

  const updateTransform = (
    values: Partial<BannerTransform>,
  ) => {
    setTransform((current) => ({
      ...current,
      ...values,
    }));
  };

  const startDragging = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    dragRef.current = {
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startImageX: transform.x,
      startImageY: transform.y,
    };
  };

  const moveImage = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current;

    if (
      !drag ||
      drag.pointerId !== event.pointerId
    ) {
      return;
    }

    const canvasBounds =
      event.currentTarget.getBoundingClientRect();

    const movementX =
      event.clientX - drag.startPointerX;

    const movementY =
      event.clientY - drag.startPointerY;

    const normalizedMovementX =
      movementX / canvasBounds.width;

    const normalizedMovementY =
      movementY / canvasBounds.height;

    setTransform((current) => ({
      ...current,

      x: clamp(
        drag.startImageX +
          normalizedMovementX,
        -0.6,
        0.6,
      ),

      y: clamp(
        drag.startImageY +
          normalizedMovementY,
        -0.6,
        0.6,
      ),
    }));
  };

  const stopDragging = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (
      dragRef.current?.pointerId !==
      event.pointerId
    ) {
      return;
    }

    dragRef.current = null;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }
  };

  const resetTransform = () => {
    setTransform({
      ...DEFAULT_BANNER_TRANSFORM,
    });
  };

  return (
    <div
      className="banner-studio"
      role="dialog"
      aria-modal="true"
      aria-labelledby="banner-studio-title"
    >
      <button
        className="banner-studio__backdrop"
        type="button"
        onClick={onCancel}
        aria-label="Close Banner Studio"
      />

      <section className="banner-studio__panel">
        <header className="banner-studio__header">
          <div>
            <span>PROFILE PHOTO</span>

            <h2 id="banner-studio-title">
              Banner Studio
            </h2>
          </div>

          <button
            className="banner-studio__close"
            type="button"
            onClick={onCancel}
            aria-label="Close Banner Studio"
          >
            <span />
            <span />
          </button>
        </header>

        <div className="banner-studio__content">
          <p className="banner-studio__instruction">
            Drag the image until it sits exactly where
            you want it.
          </p>

          <div className="banner-studio__stage">
            <div
              className="banner-studio__canvas"
              onPointerDown={startDragging}
              onPointerMove={moveImage}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              onLostPointerCapture={stopDragging}
              onDoubleClick={resetTransform}
              role="application"
              aria-label="Drag to position banner image"
            >
              <img
                src={imageSrc}
                alt=""
                draggable={false}
                style={getBannerImageStyle(
                  transform,
                )}
              />

              <div
                className="banner-studio__grid"
                aria-hidden="true"
              />

              <div
                className="banner-studio__ring"
                aria-hidden="true"
              />
            </div>

            <span className="banner-studio__hint">
              Drag to move · Double-click to reset
            </span>
          </div>

          <div className="banner-studio__controls">
            <label>
              <div>
                <span>Zoom</span>

                <output>
                  {Math.round(
                    transform.zoom * 100,
                  )}
                  %
                </output>
              </div>

              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={transform.zoom}
                onChange={(event) =>
                  updateTransform({
                    zoom: Number(
                      event.target.value,
                    ),
                  })
                }
              />
            </label>

            <label>
              <div>
                <span>Rotation</span>

                <output>
                  {Math.round(
                    transform.rotation,
                  )}
                  °
                </output>
              </div>

              <input
                type="range"
                min="-30"
                max="30"
                step="1"
                value={transform.rotation}
                onChange={(event) =>
                  updateTransform({
                    rotation: Number(
                      event.target.value,
                    ),
                  })
                }
              />
            </label>

            <label>
              <div>
                <span>Brightness</span>

                <output>
                  {Math.round(
                    transform.brightness * 100,
                  )}
                  %
                </output>
              </div>

              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.01"
                value={transform.brightness}
                onChange={(event) =>
                  updateTransform({
                    brightness: Number(
                      event.target.value,
                    ),
                  })
                }
              />
            </label>

            <div className="banner-studio__coordinates">
              <span>
                X {Math.round(transform.x * 100)}
              </span>

              <span>
                Y {Math.round(transform.y * 100)}
              </span>
            </div>
          </div>
        </div>

        <footer className="banner-studio__footer">
          <button
            className="banner-studio__reset"
            type="button"
            onClick={resetTransform}
          >
            Reset
          </button>

          <div>
            <button
              className="banner-studio__cancel"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>

            <button
              className="banner-studio__save"
              type="button"
              onClick={() =>
                onSave(
                  normalizeBannerTransform(
                    transform,
                  ),
                )
              }
            >
              Use photo
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
