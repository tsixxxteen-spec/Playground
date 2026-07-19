import { useHistory } from "../history";
import "./HistoryToolbar.css";

type HistoryToolbarProps = {
  onUndo?: () => void;
  onRedo?: () => void;
};

const actionTitle = (
  action: "Undo" | "Redo",
  label: string | null,
): string => (label ? `${action} ${label}` : action);

export default function HistoryToolbar({
  onUndo,
  onRedo,
}: HistoryToolbarProps) {
  const {
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  } = useHistory();

  const undoDisabled = !canUndo || !onUndo;
  const redoDisabled = !canRedo || !onRedo;

  return (
    <div
      className="history-toolbar"
      role="toolbar"
      aria-label="History controls"
    >
      <button
        type="button"
        className="history-toolbar__button"
        disabled={undoDisabled}
        aria-label={actionTitle("Undo", undoLabel)}
        title={actionTitle("Undo", undoLabel)}
        onClick={onUndo}
      >
        <span aria-hidden="true">↶</span>
      </button>

      <button
        type="button"
        className="history-toolbar__button"
        disabled={redoDisabled}
        aria-label={actionTitle("Redo", redoLabel)}
        title={actionTitle("Redo", redoLabel)}
        onClick={onRedo}
      >
        <span aria-hidden="true">↷</span>
      </button>
    </div>
  );
}
