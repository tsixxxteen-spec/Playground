import { WorldPackage } from "../types";

export function deserializeWorld(json: string): WorldPackage {
  return JSON.parse(json) as WorldPackage;
}