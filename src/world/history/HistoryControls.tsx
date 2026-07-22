import { useHistory } from "./useHistory";
import "./HistoryControls.css";

type HistoryControlsProps = {
  onUndo: () => void;
  onRedo: () => void;
};

export default function HistoryControls({
  onUndo,
  onRedo,
}: HistoryControlsProps) {
  const {
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  } = useHistory();

  return (
    <div
      className="world-history-controls"
      aria-label="Editing history"
    >
      <button
        type="button"
        disabled={!canUndo}
        title={
          undoLabel
            ? `Undo ${undoLabel} (⌘Z)`
            : "Nothing to undo"
        }
        aria-label={
          undoLabel
            ? `Undo ${undoLabel}`
            : "Undo"
        }
        onClick={onUndo}
      >
        ↶
      </button>

      <button
        type="button"
        disabled={!canRedo}
        title={
          redoLabel
            ? `Redo ${redoLabel} (⌘⇧Z)`
            : "Nothing to redo"
        }
        aria-label={
          redoLabel
            ? `Redo ${redoLabel}`
            : "Redo"
        }
        onClick={onRedo}
      >
        ↷
      </button>
    </div>
  );
}
