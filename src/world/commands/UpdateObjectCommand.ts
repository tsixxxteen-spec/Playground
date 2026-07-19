import type { PlaygroundObjectInstance } from "../types/playground";
import type { WorldCommand } from "./WorldCommand";

export type WorldObjectUpdater = (
  object: PlaygroundObjectInstance,
) => PlaygroundObjectInstance;

export const createUpdateObjectCommand = (
  objectId: string,
  updater: WorldObjectUpdater,
): WorldCommand => ({
  id: `update:${objectId}`,
  label: "Update object",
  execute: (playground) => ({
    ...playground,
    objects: playground.objects.map((object) =>
      object.id === objectId
        ? updater(object)
        : object,
    ),
  }),
});
