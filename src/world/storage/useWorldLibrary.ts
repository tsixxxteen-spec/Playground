import { useContext } from "react";
import { WorldLibraryContext } from "./WorldLibraryContext";

export function useWorldLibrary() {
  const context = useContext(WorldLibraryContext);

  if (!context) {
    throw new Error(
      "useWorldLibrary must be used inside a WorldLibraryProvider.",
    );
  }

  return context;
}
