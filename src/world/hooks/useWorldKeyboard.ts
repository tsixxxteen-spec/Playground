import { useCallback } from "react";

export function useWorldKeyboard() {
  const onKeyDown = useCallback((_event: KeyboardEvent) => {
    // Reserved for future keyboard shortcuts:
    //
    // Delete
    // Escape
    // Arrow Keys
    // Cmd/Ctrl + Z
    //
    // Implementation will be added in a future sprint.
  }, []);

  return {
    onKeyDown,
  };
}
