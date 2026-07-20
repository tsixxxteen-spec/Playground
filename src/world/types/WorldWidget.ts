export interface WorldWidget {
  id: string;

  type: string;

  title: string;

  x: number;
  y: number;

  width: number;
  height: number;

  visible: boolean;

  locked: boolean;

  layer: number;

  settings: Record<string, unknown>;
}