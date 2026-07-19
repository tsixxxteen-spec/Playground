import type { WorldCommand } from "./WorldCommand";

export const createDeleteObjectCommand = (
  objectId: string,
): WorldCommand => ({
  id: `delete:${objectId}`,
  label: "Delete object",
  execute: (playground) => ({
    ...playground,
    objects: playground.objects.filter(
      (object) => object.id !== objectId,
    ),
  }),
});
