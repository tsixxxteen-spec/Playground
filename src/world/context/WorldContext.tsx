import {
  createContext,
  useEffect,
  type ReactNode,
} from "react";
import { useWorldDrag } from "../hooks/useWorldDrag";
import { useWorldHover } from "../hooks/useWorldHover";
import { useWorldSelection } from "../hooks/useWorldSelection";

export type WorldContextValue = {
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  draggingObjectId: string | null;

  selectObject: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;

  setHoveredObjectId: (id: string | null) => void;
  setDraggingObjectId: (id: string | null) => void;
};

export const WorldContext =
  createContext<WorldContextValue | null>(null);

type WorldProviderProps = {
  children: ReactNode;
};

export function WorldProvider({
  children,
}: WorldProviderProps) {
  const {
    selectedObjectId,
    selectObject,
    clearSelection,
    isSelected,
  } = useWorldSelection();

  const {
    hoveredObjectId,
    setHoveredObjectId,
  } = useWorldHover();

  const {
    draggingObjectId,
    setDraggingObjectId,
  } = useWorldDrag();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [clearSelection]);

  return (
    <WorldContext.Provider
      value={{
        selectedObjectId,
        hoveredObjectId,
        draggingObjectId,
        selectObject,
        clearSelection,
        isSelected,
        setHoveredObjectId,
        setDraggingObjectId,
      }}
    >
      {children}
    </WorldContext.Provider>
  );
}
