import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useCollaborationSession,
} from "../../collaboration/CollaborationSessionContext";

import {
  useSharedSelection,
} from "../../collaboration/selection/SharedSelectionContext";

import type {
  SharedObjectLock,
  SharedObjectSelection,
} from "../../collaboration/selection/types";

import "./RemoteSelectionOverlay.css";

type SelectionRect = {
  selection:
    SharedObjectSelection;

  lock:
    SharedObjectLock | undefined;

  top: number;
  left: number;
  width: number;
  height: number;
};

function findObjectElement(
  objectId: string,
): HTMLElement | null {
  const elements =
    document.querySelectorAll<HTMLElement>(
      "[data-playground-object-id]",
    );

  for (const element of elements) {
    if (
      element.dataset
        .playgroundObjectId === objectId
    ) {
      return element;
    }
  }

  return null;
}

export default function RemoteSelectionOverlay() {
  const {
    session,
  } = useCollaborationSession();

  const {
    selections,
    locks,
  } = useSharedSelection();

  const [
    layoutVersion,
    setLayoutVersion,
  ] = useState(0);

  const localParticipant =
    session.participants.find(
      (participant) =>
        participant.id ===
          "local-owner" ||
        participant.name === "You",
    ) ?? session.participants[0];

  useEffect(() => {
    let frameId = 0;

    const update = () => {
      setLayoutVersion(
        (current) =>
          current + 1,
      );

      frameId =
        window.requestAnimationFrame(
          update,
        );
    };

    frameId =
      window.requestAnimationFrame(
        update,
      );

    return () => {
      window.cancelAnimationFrame(
        frameId,
      );
    };
  }, []);

  const rects = useMemo(
    () => {
      void layoutVersion;

      return selections
        .filter(
          (selection) =>
            selection.participantId !==
            localParticipant?.id,
        )
        .map((selection) => {
          const element =
            findObjectElement(
              selection.objectId,
            );

          if (!element) {
            return null;
          }

          const rect =
            element.getBoundingClientRect();

          return {
            selection,
            lock: locks.find(
              (lock) =>
                lock.objectId ===
                selection.objectId,
            ),
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
        })
        .filter(
          (
            item,
          ): item is SelectionRect =>
            item !== null,
        );
    },
    [
      selections,
      locks,
      localParticipant?.id,
      layoutVersion,
    ],
  );

  return (
    <div
      className="remote-selection-overlay"
      aria-hidden="true"
    >
      {rects.map((item) => (
        <div
          key={
            item.selection
              .participantId
          }
          className="remote-selection-outline"
          data-locked={
            Boolean(item.lock)
          }
          style={{
            top: item.top,
            left: item.left,
            width: item.width,
            height: item.height,
          }}
        >
          <span className="remote-selection-outline__label">
            {
              item.selection
                .participantName
            }

            {item.lock && (
              <small>
                Editing
              </small>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
