import { useState } from "react";

export function useWorldHover() {
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);

  return {
    hoveredObjectId,
    setHoveredObjectId,
  };
}
