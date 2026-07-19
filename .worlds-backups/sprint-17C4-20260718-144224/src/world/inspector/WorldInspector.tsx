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

const clamp = (
  value: number,
  minimum: number,
  maximum: number,
): number => Math.min(maximum, Math.max(minimum, value));

const parseInputNumber = (
  value: string,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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

  const updatePosition = (
    axis: "x" | "y",
    rawValue: string,
  ) => {
    onObjectChange(selectedObject.id, (object) => ({
      ...object,
      position: {
        ...object.position,
        [axis]: clamp(
          parseInputNumber(
            rawValue,
            object.position[axis],
          ),
          0,
          100,
        ),
      },
    }));
  };

  const updateScale = (rawValue: string) => {
    onObjectChange(selectedObject.id, (object) => ({
      ...object,
      scale: clamp(
        parseInputNumber(rawValue, object.scale),
        0.25,
        4,
      ),
    }));
  };

  const updateRotation = (rawValue: string) => {
    onObjectChange(selectedObject.id, (object) => ({
      ...object,
      rotation: clamp(
        parseInputNumber(rawValue, object.rotation),
        -180,
        180,
      ),
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

      <div className="world-inspector__section">
        <h3>Position</h3>

        <div className="world-inspector__grid">
          <label>
            <span>X</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={Number(
                selectedObject.position.x.toFixed(2),
              )}
              onChange={(event) => {
                updatePosition("x", event.target.value);
              }}
            />
          </label>

          <label>
            <span>Y</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={Number(
                selectedObject.position.y.toFixed(2),
              )}
              onChange={(event) => {
                updatePosition("y", event.target.value);
              }}
            />
          </label>
        </div>
      </div>

      <div className="world-inspector__section">
        <h3>Transform</h3>

        <label className="world-inspector__field">
          <span>Scale</span>
          <input
            type="number"
            min="0.25"
            max="4"
            step="0.05"
            value={Number(
              selectedObject.scale.toFixed(2),
            )}
            onChange={(event) => {
              updateScale(event.target.value);
            }}
          />
        </label>

        <label className="world-inspector__field">
          <span>Rotation</span>
          <input
            type="number"
            min="-180"
            max="180"
            step="1"
            value={Number(
              selectedObject.rotation.toFixed(1),
            )}
            onChange={(event) => {
              updateRotation(event.target.value);
            }}
          />
        </label>
      </div>

      <div className="world-inspector__meta">
        <span>ID</span>
        <code>{selectedObject.id}</code>
      </div>
    </aside>
  );
}
