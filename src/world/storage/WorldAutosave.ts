export interface WorldAutosave {
  markDirty(): void;

  scheduleSave(): void;

  forceSave(): Promise<void>;

  cancel(): void;

  isDirty(): boolean;
}
