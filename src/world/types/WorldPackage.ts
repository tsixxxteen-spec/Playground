import { WorldEnvironment } from "./WorldEnvironment";
import { WorldObject } from "./WorldObject";
import { WorldDecoration } from "./WorldDecoration";
import { WorldWidget } from "./WorldWidget";
import { WorldCompanion } from "./WorldCompanion";
import { WorldSettings } from "./WorldSettings";

export interface WorldPackage {
  id: string;

  title: string;

  description: string;

  creator: string;

  version: string;

  createdAt: string;

  modifiedAt: string;

  environment: WorldEnvironment;

  objects: WorldObject[];

  decorations: WorldDecoration[];

  widgets: WorldWidget[];

  companions: WorldCompanion[];

  settings: WorldSettings;
}