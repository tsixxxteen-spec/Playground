import { useEffect } from "react";
import { useWorld } from "../context";
import HistoryToolbar from "./HistoryToolbar";
import { worldRegistry } from "../engine/WorldRegistry";
import type {
  PlaygroundData,
  PlaygroundObjectInstance,
} from "../types/playground";
import "./WorldInspector.css";

type WorldInspectorProps = {
  playground: PlaygroundData;
  onObjectChange: (
    objectId: string,
    updater: (
      object: PlaygroundObjectInstance,
    ) => PlaygroundObjectInstance,
  ) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: (objectId: string) => string | null;
  onDelete?: (objectId: string) => boolean;
  snapEnabled?: boolean;
  gridSize?: number;
  onSnapEnabledChange?: (enabled: boolean) => void;
  onGridSizeChange?: (size: number) => void;
  onBringForward?: (objectId: string) => void;
  onSendBackward?: (objectId: string) => void;
  onCenterHorizontal?: (objectId: string) => void;
  onCenterVertical?: (objectId: string) => void;
};

type SliderFieldProps = {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
};

const clamp = (
  value: number,
  minimum: number,
  maximum: number,
): number => Math.min(maximum, Math.max(minimum, value));

function SliderField({
  label,
  value,
  minimum,
  maximum,
  step,
  suffix = "",
  onChange,
}: SliderFieldProps) {
  const safeValue = clamp(value, minimum, maximum);

  return (
    <label className="world-inspector__slider-field">
      <span className="world-inspector__slider-header">
        <span>{label}</span>
        <output>
          {Number(safeValue.toFixed(2))}
          {suffix}
        </output>
      </span>

      <input
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={safeValue}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      />
    </label>
  );
}

export default function WorldInspector({
  playground,
  onObjectChange,
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  snapEnabled = true,
  gridSize = 5,
  onSnapEnabledChange,
  onGridSizeChange,
  onBringForward,
  onSendBackward,
  onCenterHorizontal,
  onCenterVertical,
}: WorldInspectorProps) {
  const {
    selectedObjectId,
    selectObject,
    clearSelection,
  } = useWorld();

  const selectedObject = playground.objects.find(
    (object) => object.id === selectedObjectId,
  );

  useEffect(() => {
    if (!onDuplicate || !selectedObject) {
      return undefined;
    }

    const handleDuplicateShortcut = (
      event: KeyboardEvent,
    ) => {
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest(
            "input, textarea, select, [contenteditable='true']",
          ) !== null);

      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        isEditableTarget
      ) {
        return;
      }

      const modifierPressed =
        event.metaKey || event.ctrlKey;

      if (
        modifierPressed &&
        event.key.toLowerCase() === "d" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        const duplicateId = onDuplicate(
          selectedObject.id,
        );

        if (duplicateId) {
          selectObject(duplicateId);
        }
      }
    };

    window.addEventListener(
      "keydown",
      handleDuplicateShortcut,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleDuplicateShortcut,
      );
    };
  }, [onDuplicate, selectedObject, selectObject]);

  useEffect(() => {
    if (!onDelete || !selectedObject) {
      return undefined;
    }

    const handleDeleteShortcut = (
      event: KeyboardEvent,
    ) => {
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest(
            "input, textarea, select, [contenteditable='true']",
          ) !== null);

      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        isEditableTarget
      ) {
        return;
      }

      const deleteRequested =
        event.key === "Delete" ||
        event.key === "Backspace";

      if (!deleteRequested) {
        return;
      }

      event.preventDefault();

      if (onDelete(selectedObject.id)) {
        clearSelection();
      }
    };

    window.addEventListener(
      "keydown",
      handleDeleteShortcut,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleDeleteShortcut,
      );
    };
  }, [clearSelection, onDelete, selectedObject]);

  if (!selectedObject) {
    return null;
  }

  const definition = worldRegistry.get(
    selectedObject.objectId,
  );

  const updateObject = (
    updater: (
      object: PlaygroundObjectInstance,
    ) => PlaygroundObjectInstance,
  ) => {
    onObjectChange(selectedObject.id, updater);
  };

  const updatePosition = (
    axis: "x" | "y",
    value: number,
  ) => {
    updateObject((object) => ({
      ...object,
      position: {
        ...object.position,
        [axis]: clamp(value, 0, 100),
      },
    }));
  };

  const updateScale = (value: number) => {
    updateObject((object) => ({
      ...object,
      scale: clamp(value, 0.25, 4),
    }));
  };

  const updateRotation = (value: number) => {
    updateObject((object) => ({
      ...object,
      rotation: clamp(value, -180, 180),
    }));
  };

  const resetPosition = () => {
    updateObject((object) => ({
      ...object,
      position: {
        x: 50,
        y: 50,
      },
    }));
  };

  const resetTransform = () => {
    updateObject((object) => ({
      ...object,
      scale: definition?.defaultScale ?? 1,
      rotation: 0,
    }));
  };

  return (
    <aside
      className="world-inspector"
      aria-label="World object inspector"
    >
      <div className="world-inspector__header">
        <div>
          <p className="world-inspector__eyebrow">
            Selected object
          </p>
          <h2 className="world-inspector__title">
            {definition?.name ?? selectedObject.objectId}
          </h2>
        </div>

        <div className="world-inspector__header-actions">
          <div className="world-inspector__action-row">
            <HistoryToolbar
              onUndo={onUndo}
              onRedo={onRedo}
            />

            {onDuplicate ? (
              <button
                type="button"
                className="world-inspector__action world-inspector__action--secondary"
                aria-label="Duplicate selected object"
                title="Duplicate selected object (Command or Control + D)"
                onClick={() => {
                  const duplicateId = onDuplicate(
                    selectedObject.id,
                  );

                  if (duplicateId) {
                    selectObject(duplicateId);
                  }
                }}
              >
                Duplicate
              </button>
            ) : null}

            {onDelete ? (
              <button
                type="button"
                className="world-inspector__action world-inspector__action--danger"
                aria-label="Delete selected object"
                title="Delete selected object (Delete or Backspace)"
                onClick={() => {
                  if (onDelete(selectedObject.id)) {
                    clearSelection();
                  }
                }}
              >
                Delete Object
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className="world-inspector__close"
            aria-label="Close inspector"
            onClick={clearSelection}
          >
            ×
          </button>
        </div>
      </div>

      <section className="world-inspector__section">
        <div className="world-inspector__section-heading">
          <h3>Position</h3>
          <button
            type="button"
            className="world-inspector__reset"
            onClick={resetPosition}
          >
            Reset
          </button>
        </div>

        <SliderField
          label="X"
          value={selectedObject.position.x}
          minimum={0}
          maximum={100}
          step={0.1}
          suffix="%"
          onChange={(value) => {
            updatePosition("x", value);
          }}
        />

        <SliderField
          label="Y"
          value={selectedObject.position.y}
          minimum={0}
          maximum={100}
          step={0.1}
          suffix="%"
          onChange={(value) => {
            updatePosition("y", value);
          }}
        />
      </section>

      <section className="world-inspector__section">
        <div className="world-inspector__section-heading">
          <h3>Transform</h3>
          <button
            type="button"
            className="world-inspector__reset"
            onClick={resetTransform}
          >
            Reset
          </button>
        </div>

        <SliderField
          label="Scale"
          value={selectedObject.scale}
          minimum={0.25}
          maximum={4}
          step={0.05}
          suffix="×"
          onChange={updateScale}
        />

        <SliderField
          label="Rotation"
          value={selectedObject.rotation}
          minimum={-180}
          maximum={180}
          step={1}
          suffix="°"
          onChange={updateRotation}
        />
      </section>


      <section className="world-inspector__section">
        <div className="world-inspector__section-heading"><h3>Precision</h3></div>
        <label className="world-inspector__toggle-row">
          <span>Snap to grid</span>
          <input type="checkbox" checked={snapEnabled} onChange={(event) => onSnapEnabledChange?.(event.target.checked)} />
        </label>
        <label className="world-inspector__select-row">
          <span>Grid size</span>
          <select value={gridSize} onChange={(event) => onGridSizeChange?.(Number(event.target.value))}>
            <option value={1}>1%</option><option value={2.5}>2.5%</option><option value={5}>5%</option><option value={10}>10%</option>
          </select>
        </label>
        <div className="world-inspector__button-grid">
          <button type="button" onClick={() => onCenterHorizontal?.(selectedObject.id)}>Center X</button>
          <button type="button" onClick={() => onCenterVertical?.(selectedObject.id)}>Center Y</button>
          <button type="button" onClick={() => onBringForward?.(selectedObject.id)}>Bring Forward</button>
          <button type="button" onClick={() => onSendBackward?.(selectedObject.id)}>Send Back</button>
        </div>
        <p className="world-inspector__hint">Arrow keys nudge 1%. Hold Shift to nudge 5%.</p>
      </section>

      <div className="world-inspector__meta">
        <span>ID</span>
        <code>{selectedObject.id}</code>
      </div>
    </aside>
  );
}
