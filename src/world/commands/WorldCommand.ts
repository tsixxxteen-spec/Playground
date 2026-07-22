import type { PlaygroundData } from "../types/playground";

export type WorldCommand = {
  id: string;
  label: string;
  execute: (playground: PlaygroundData) => PlaygroundData;
};

export const executeWorldCommand = (
  command: WorldCommand,
  playground: PlaygroundData,
): PlaygroundData => command.execute(playground);
