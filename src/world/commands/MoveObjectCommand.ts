import type { PlaygroundPosition } from "../types/playground";
import type { WorldCommand } from "./WorldCommand";

export const createMoveObjectCommand = (
  objectId: string,
  position: PlaygroundPosition,
): WorldCommand => ({
  id: `move:${objectId}`,
  label: "Move object",
  execute: (playground) => ({
    ...playground,
    objects: playground.objects.map((object) =>
      object.id === objectId
        ? { ...object, position }
        : object,
    ),
  }),
});
