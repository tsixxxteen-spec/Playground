import type { PersonalizationObjectDefinition } from "./types";

const objects = new Map<string, PersonalizationObjectDefinition>();

export function registerObject(definition: PersonalizationObjectDefinition): PersonalizationObjectDefinition {
  const id = definition.id.trim();
  if (!id) throw new Error("Personalization objects require an id.");
  if (objects.has(id)) return objects.get(id)!;
  const normalized = { ...definition, id };
  objects.set(id, normalized);
  return normalized;
}

export function unregisterObject(id: string): boolean { return objects.delete(id); }
export function findObject(id: string): PersonalizationObjectDefinition | undefined { return objects.get(id); }
export function hasObject(id: string): boolean { return objects.has(id); }
export function listObjects(): PersonalizationObjectDefinition[] { return Array.from(objects.values()); }
export function clearObjects(): void { objects.clear(); }
export function getObjectCount(): number { return objects.size; }
export function searchObjects(query: string): PersonalizationObjectDefinition[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return listObjects();
  return listObjects().filter((item) => [
    item.name,
    item.description ?? "",
    item.category,
    ...(item.keywords ?? []),
  ].join(" ").toLowerCase().includes(needle));
}
