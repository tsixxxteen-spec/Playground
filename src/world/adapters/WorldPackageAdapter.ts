import type {
  PlaygroundData,
  PlaygroundObjectInstance,
} from "../types/playground";
import type {
  WorldObject,
  WorldPackage,
} from "../types";

const DEFAULT_LANE =
  "foreground" as PlaygroundObjectInstance["lane"];

export function worldPackageToPlayground(
  world: WorldPackage,
): PlaygroundData {
  return {
    enabled: true,

    objects: world.objects.map(
      (object): PlaygroundObjectInstance => ({
        id: object.id,
        objectId: object.type,
        lane: DEFAULT_LANE,
        enabled: object.visible,
        position: {
          x: object.x,
          y: object.y,
        },
        rotation: object.rotation,
        scale: object.scale,
        zIndex: object.layer,
        action: {
          type: "none",
        },
      }),
    ),
  };
}

export function playgroundToWorldPackage(
  playground: PlaygroundData,
  world: WorldPackage,
): WorldPackage {
  const existingObjects = new Map(
    world.objects.map((object) => [
      object.id,
      object,
    ]),
  );

  const objects: WorldObject[] =
    playground.objects.map((object) => {
      const existing = existingObjects.get(object.id);

      return {
        id: object.id,
        type: object.objectId,
        x: object.position.x,
        y: object.position.y,
        rotation: object.rotation,
        scale: object.scale,
        visible: object.enabled,
        locked: existing?.locked ?? false,
        layer: object.zIndex,
      };
    });

  return {
    ...world,
    objects,
    modifiedAt: new Date().toISOString(),
  };
}
