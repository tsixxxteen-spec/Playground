import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import WorldCanvas from "../engine/WorldCanvas";
import {
  playgroundToWorldPackage,
  worldPackageToPlayground,
} from "../adapters/WorldPackageAdapter";
import { worldStorage } from "../storage/LocalWorldStorage";

import type { PlaygroundData } from "../types/playground";
import type { WorldPackage } from "../types";

import "./WorldWorkspace.css";

type WorldWorkspaceProps = {
  world: WorldPackage;
  onClose: () => void;
  onWorldSaved?: (world: WorldPackage) => void;
};

export default function WorldWorkspace({
  world,
  onClose,
  onWorldSaved,
}: WorldWorkspaceProps) {
  const [playground, setPlayground] =
    useState<PlaygroundData>(() =>
      worldPackageToPlayground(world),
    );

  const [workingWorld, setWorkingWorld] =
    useState<WorldPackage>(world);

  const [saveState, setSaveState] = useState<
    "saved" | "unsaved" | "saving" | "error"
  >("saved");

  const autosaveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  useEffect(() => {
    setWorkingWorld(world);
    setPlayground(
      worldPackageToPlayground(world),
    );
    setSaveState("saved");
  }, [world]);

  const saveWorld = useCallback(
    async (
      nextPlayground: PlaygroundData =
        playground,
    ) => {
      setSaveState("saving");

      try {
        const nextWorld =
          playgroundToWorldPackage(
            nextPlayground,
            workingWorld,
          );

        await worldStorage.saveWorld(nextWorld);

        setWorkingWorld(nextWorld);
        setSaveState("saved");
        onWorldSaved?.(nextWorld);
      } catch (error) {
        console.error(
          "Failed to save World.",
          error,
        );

        setSaveState("error");
      }
    },
    [
      onWorldSaved,
      playground,
      workingWorld,
    ],
  );

  const handlePlaygroundChange = useCallback(
    (nextPlayground: PlaygroundData) => {
      setPlayground(nextPlayground);
      setSaveState("unsaved");

      if (autosaveTimerRef.current) {
        clearTimeout(
          autosaveTimerRef.current,
        );
      }

      autosaveTimerRef.current = setTimeout(
        () => {
          void saveWorld(nextPlayground);
        },
        800,
      );
    },
    [saveWorld],
  );

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(
          autosaveTimerRef.current,
        );
      }
    };
  }, []);

  const handleClose = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(
        autosaveTimerRef.current,
      );

      autosaveTimerRef.current = null;
    }

    if (saveState === "unsaved") {
      await saveWorld();
    }

    onClose();
  };

  return (
    <section
      className="world-workspace"
      aria-label={`Editing ${workingWorld.title}`}
    >
      <header className="world-workspace__header">
        <div className="world-workspace__identity">
          <button
            type="button"
            className="world-workspace__back"
            onClick={() => {
              void handleClose();
            }}
          >
            ← Library
          </button>

          <div>
            <h1>{workingWorld.title}</h1>

            <p>
              {saveState === "saving"
                ? "Saving…"
                : saveState === "unsaved"
                  ? "Unsaved changes"
                  : saveState === "error"
                    ? "Save failed"
                    : "Saved"}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="world-workspace__save"
          disabled={saveState === "saving"}
          onClick={() => {
            void saveWorld();
          }}
        >
          Save
        </button>
      </header>

      <div className="world-workspace__stage">
        <WorldCanvas
          playground={playground}
          mode="edit"
          onPlaygroundChange={
            handlePlaygroundChange
          }
        />
      </div>
    </section>
  );
}
