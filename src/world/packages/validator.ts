import { WorldPackage } from "../types";

export function validateWorldPackage(
  world: WorldPackage
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!world.id) errors.push("Missing id");

  if (!world.title) errors.push("Missing title");

  if (!world.version) errors.push("Missing version");

  if (!world.environment) errors.push("Missing environment");

  return {
    valid: errors.length === 0,
    errors,
  };
}