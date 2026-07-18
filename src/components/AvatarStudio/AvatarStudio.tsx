import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";

import "./AvatarStudio.css";

export type AvatarTransform = {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  brightness: number;
};

type AvatarStudioProps = {
  imageSrc: string;
  initialTransform?: AvatarTransform;
  onCancel: () => void;
  onSave: (transform: AvatarTransform) => void;
};

export const DEFAULT_AVATAR_TRANSFORM: AvatarTransform = {
  // X and Y are normalized ratios rather than pixels.
  // 0.1 means 10% of the avatar's rendered size.
  x: 0,
  y: 0,
  zoom: 1,
  rotation: 0,
  brightness: 1,
};

export function normalizeAvatarTransform(
  transform?: Partial<AvatarTransform> | null,
): AvatarTransform {
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
   * version. Avatar Studio previously used a 310px canvas.
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

export function getAvatarImageStyle(
  transform: AvatarTransform,
): CSSProperties {
  const safeTransform =
    normalizeAvatarTransform(transform);

  const brightnessFilter =
    Math.abs(safeTransform.brightness - 1) < 0.001
      ? undefined
      : `brightness(${safeTransform.brightness})`;

  return {
    /*
     * Keep this as a 2D transform. translate3d() plus an always-on
     * CSS filter can make Chromium cache the avatar as a low-resolution
     * GPU texture and then enlarge that texture when zooming.
     */
    transform: [
      `translate(${safeTransform.x * 100}%, ${safeTransform.y * 100}%)`,
      `scale(${safeTransform.zoom})`,
      `rotate(${safeTransform.rotation}deg)`,
    ].join(" "),

    transformOrigin: "center center",
    imageRendering: "auto",
    filter: brightnessFilter,
  };
}

export default function AvatarStudio({
  imageSrc,
  initialTransform = DEFAULT_AVATAR_TRANSFORM,
  onCancel,
  onSave,
}: AvatarStudioProps) {
  const [transform, setTransform] =
    useState<AvatarTransform>(() =>
      normalizeAvatarTransform(
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
      "avatar-studio-open",
    );

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.classList.remove(
        "avatar-studio-open",
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onCancel]);

  const updateTransform = (
    values: Partial<AvatarTransform>,
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
      ...DEFAULT_AVATAR_TRANSFORM,
    });
  };

  return (
    <div
      className="avatar-studio"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-studio-title"
    >
      <button
        className="avatar-studio__backdrop"
        type="button"
        onClick={onCancel}
        aria-label="Close Avatar Studio"
      />

      <section className="avatar-studio__panel">
        <header className="avatar-studio__header">
          <div>
            <span>PROFILE PHOTO</span>

            <h2 id="avatar-studio-title">
              Avatar Studio
            </h2>
          </div>

          <button
            className="avatar-studio__close"
            type="button"
            onClick={onCancel}
            aria-label="Close Avatar Studio"
          >
            <span />
            <span />
          </button>
        </header>

        <div className="avatar-studio__content">
          <p className="avatar-studio__instruction">
            Drag the image until it sits exactly where
            you want it.
          </p>

          <div className="avatar-studio__stage">
            <div
              className="avatar-studio__canvas"
              onPointerDown={startDragging}
              onPointerMove={moveImage}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              onLostPointerCapture={stopDragging}
              onDoubleClick={resetTransform}
              role="application"
              aria-label="Drag to position profile photo"
            >
              <img
                src={imageSrc}
                alt=""
                draggable={false}
                style={getAvatarImageStyle(
                  transform,
                )}
              />

              <div
                className="avatar-studio__grid"
                aria-hidden="true"
              />

              <div
                className="avatar-studio__ring"
                aria-hidden="true"
              />
            </div>

            <span className="avatar-studio__hint">
              Drag to move · Double-click to reset
            </span>
          </div>

          <div className="avatar-studio__controls">
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

            <div className="avatar-studio__coordinates">
              <span>
                X {Math.round(transform.x * 100)}
              </span>

              <span>
                Y {Math.round(transform.y * 100)}
              </span>
            </div>
          </div>
        </div>

        <footer className="avatar-studio__footer">
          <button
            className="avatar-studio__reset"
            type="button"
            onClick={resetTransform}
          >
            Reset
          </button>

          <div>
            <button
              className="avatar-studio__cancel"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>

            <button
              className="avatar-studio__save"
              type="button"
              onClick={() =>
                onSave(
                  normalizeAvatarTransform(
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
