import type { PlaygroundObjectInstance } from "../types/playground";
import type { WorldCommand } from "./WorldCommand";

export const createAddObjectCommand = (
  object: PlaygroundObjectInstance,
): WorldCommand => ({
  id: `add:${object.id}`,
  label: "Add object",
  execute: (playground) => ({
    ...playground,
    enabled: true,
    objects: [...playground.objects, object],
  }),
});
