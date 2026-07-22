import { useState } from "react";

export function useWorldDrag() {
  const [draggingObjectId, setDraggingObjectId] = useState<string | null>(null);

  return {
    draggingObjectId,
    setDraggingObjectId,
  };
}
