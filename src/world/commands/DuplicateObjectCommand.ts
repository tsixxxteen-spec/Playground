import { createInstanceId } from "../utils/createInstanceId";
import type { PlaygroundObjectInstance } from "../types/playground";
import type { WorldCommand } from "./WorldCommand";

const DUPLICATE_POSITION_OFFSET = 4;
const MAX_POSITION = 100;

const offsetPosition = (
  value: number,
): number =>
  Math.min(
    MAX_POSITION,
    value + DUPLICATE_POSITION_OFFSET,
  );

export const createDuplicateObjectCommand = (
  objectId: string,
  requestedDuplicateId?: string,
): WorldCommand => {
  let duplicateId: string | null =
    requestedDuplicateId ?? null;

  return {
    id: `duplicate-object-${objectId}`,
    label: "Duplicate object",
    execute(playground) {
      const sourceObject = playground.objects.find(
        (object) => object.id === objectId,
      );

      if (!sourceObject) {
        return playground;
      }

      duplicateId ??= createInstanceId(
        sourceObject.objectId,
      );

      const highestZIndex = playground.objects.reduce(
        (highest, object) =>
          Math.max(highest, object.zIndex),
        0,
      );

      const duplicatedObject: PlaygroundObjectInstance = {
        ...sourceObject,
        id: duplicateId,
        position: {
          x: offsetPosition(sourceObject.position.x),
          y: offsetPosition(sourceObject.position.y),
        },
        zIndex: highestZIndex + 1,
      };

      return {
        ...playground,
        objects: [
          ...playground.objects,
          duplicatedObject,
        ],
      };
    },
  };
};
