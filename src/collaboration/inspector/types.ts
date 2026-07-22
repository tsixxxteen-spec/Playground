export type PlaygroundInspectableObject = {
  id: string;
  name: string;
  type: string;
  owner?: string;
  lockedBy?: string;
  layer?: string;
  tags: string[];
  parentId?: string;
  childIds: string[];
  createdAt?: string;
  modifiedAt?: string;
  element: HTMLElement;
};

export type PlaygroundObjectSelectionDetail = {
  objectId: string;
  objectName?: string;
  source?: string;
};

export type InspectorSortMode =
  | "name"
  | "type"
  | "recent";
