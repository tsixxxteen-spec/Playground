import { useContext } from "react";
import { WorldContext } from "./WorldContext";

export function useWorld() {
  const context = useContext(WorldContext);

  if (!context) {
    throw new Error(
      "useWorld must be used inside a WorldProvider.",
    );
  }

  return context;
}
