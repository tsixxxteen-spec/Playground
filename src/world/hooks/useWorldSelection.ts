import { useCallback, useState } from "react";

export function useWorldSelection() {
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const selectObject = useCallback((id: string) => {
    setSelectedObjectId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedObjectId(null);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedObjectId === id,
    [selectedObjectId]
  );

  return {
    selectedObjectId,
    selectObject,
    clearSelection,
    isSelected,
  };
}
