export interface WorldObject {
  id: string;

  type: string;

  x: number;
  y: number;

  rotation: number;

  scale: number;

  visible: boolean;

  locked: boolean;

  layer: number;
}