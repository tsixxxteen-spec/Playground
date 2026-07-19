import { useState } from "react";

export function useWorldHistory<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const push = (state: T) => {
    const next = history.slice(0, index + 1);
    next.push(state);

    setHistory(next);
    setIndex(next.length - 1);
  };

  const undo = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const redo = () => {
    if (index < history.length - 1) {
      setIndex(index + 1);
    }
  };

  return {
    state: history[index],
    push,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  };
}
