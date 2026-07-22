import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  SharedCursorPresence,
} from "../../collaboration/cursors/types";

import "./SharedCursor.css";

type SharedCursorProps = {
  cursor:
    SharedCursorPresence;
};

type PixelPosition = {
  x: number;
  y: number;
};

export default function SharedCursor({
  cursor,
}: SharedCursorProps) {
  const targetRef =
    useRef<PixelPosition>({
      x:
        cursor.position.x *
        window.innerWidth,
      y:
        cursor.position.y *
        window.innerHeight,
    });

  const frameRef =
    useRef<number | null>(null);

  const [
    renderedPosition,
    setRenderedPosition,
  ] = useState<PixelPosition>(
    targetRef.current,
  );

  useEffect(() => {
    targetRef.current = {
      x:
        cursor.position.x *
        window.innerWidth,
      y:
        cursor.position.y *
        window.innerHeight,
    };
  }, [
    cursor.position.x,
    cursor.position.y,
  ]);

  useEffect(() => {
    const animate = () => {
      setRenderedPosition(
        (current) => {
          const target =
            targetRef.current;

          return {
            x:
              current.x +
              (target.x -
                current.x) *
                0.24,
            y:
              current.y +
              (target.y -
                current.y) *
                0.24,
          };
        },
      );

      frameRef.current =
        window.requestAnimationFrame(
          animate,
        );
    };

    frameRef.current =
      window.requestAnimationFrame(
        animate,
      );

    return () => {
      if (
        frameRef.current !== null
      ) {
        window.cancelAnimationFrame(
          frameRef.current,
        );
      }
    };
  }, []);

  return (
    <div
      className="shared-cursor"
      data-activity={
        cursor.activityState
      }
      style={{
        transform:
          `translate3d(${renderedPosition.x}px, ${renderedPosition.y}px, 0)`,
      }}
    >
      <svg
        className="shared-cursor__pointer"
        width="22"
        height="28"
        viewBox="0 0 22 28"
        aria-hidden="true"
      >
        <path
          d="M2 1.5V22.2L7.1 17.1L10.2 25.5L14.2 23.9L11 15.7H18.8L2 1.5Z"
          fill="currentColor"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      <div className="shared-cursor__label">
        {cursor.participantName}

        {cursor.activityState !==
          "active" && (
          <span>
            {cursor.activityState}
          </span>
        )}
      </div>
    </div>
  );
}
