import { useWorld } from "../context";
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
}: WorldInspectorProps) {
  const {
    selectedObjectId,
    clearSelection,
  } = useWorld();

  const selectedObject = playground.objects.find(
    (object) => object.id === selectedObjectId,
  );

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

        <button
          type="button"
          className="world-inspector__close"
          aria-label="Close inspector"
          onClick={clearSelection}
        >
          ×
        </button>
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

      <div className="world-inspector__meta">
        <span>ID</span>
        <code>{selectedObject.id}</code>
      </div>
    </aside>
  );
}
