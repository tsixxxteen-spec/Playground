import type { WorldPackage } from "../types";
import type { WorldAutosave } from "./WorldAutosave";
import type { WorldStorage } from "./WorldStorage";

type GetCurrentWorld = () => WorldPackage | null;

export class DebouncedWorldAutosave implements WorldAutosave {
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly storage: WorldStorage,
    private readonly getCurrentWorld: GetCurrentWorld,
    private readonly delayMilliseconds = 1000,
  ) {}

  markDirty(): void {
    this.dirty = true;
    this.scheduleSave();
  }

  scheduleSave(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.timer = null;

      void this.forceSave().catch((error: unknown) => {
        console.error("World autosave failed.", error);
      });
    }, this.delayMilliseconds);
  }

  async forceSave(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.dirty) {
      return;
    }

    const world = this.getCurrentWorld();

    if (!world) {
      return;
    }

    await this.storage.saveWorld(world);
    this.dirty = false;
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  isDirty(): boolean {
    return this.dirty;
  }
}