import { useMemo, useState } from "react";

type CreatorDraft = {
  id: string;
  name: string;
  category: string;
  description: string;
  tier: "Included" | "Premium";
  accent: string;
  version: string;
  createdAt: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const STORAGE_KEY = "playground.marketplace.creator-drafts.v1";

function readDrafts(): CreatorDraft[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CreatorDraft[]) : [];
  } catch {
    return [];
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function exportDraft(draft: CreatorDraft) {
  const manifest = {
    schemaVersion: 1,
    type: "playground-theme-manifest",
    theme: {
      id: slugify(draft.name),
      name: draft.name,
      category: draft.category,
      description: draft.description,
      tier: draft.tier,
      version: draft.version,
      creator: "Independent Creator",
      colors: {
        accent: draft.accent,
      },
    },
    generatedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${slugify(draft.name) || "playground-theme"}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function CreatorStudio({ open, onClose }: Props) {
  const [drafts, setDrafts] = useState<CreatorDraft[]>(readDrafts);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Creator");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState<CreatorDraft["tier"]>("Premium");
  const [accent, setAccent] = useState("#8f7cff");
  const [version, setVersion] = useState("1.0.0");
  const [message, setMessage] = useState("");

  const canSave = useMemo(
    () =>
      name.trim().length >= 2 &&
      description.trim().length >= 12 &&
      version.trim().length > 0,
    [description, name, version],
  );

  const persist = (next: CreatorDraft[]) => {
    setDrafts(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveDraft = () => {
    if (!canSave) {
      setMessage("Add a name, version, and a fuller description.");
      return;
    }

    const draft: CreatorDraft = {
      id: crypto.randomUUID(),
      name: name.trim(),
      category,
      description: description.trim(),
      tier,
      accent,
      version: version.trim(),
      createdAt: new Date().toISOString(),
    };

    persist([draft, ...drafts]);
    setName("");
    setDescription("");
    setMessage("Draft saved locally.");
  };

  if (!open) return null;

  return (
    <div
      className="creator-studio"
      role="dialog"
      aria-modal="true"
      aria-label="Creator Studio"
    >
      <button
        className="creator-studio__backdrop"
        type="button"
        onClick={onClose}
        aria-label="Close Creator Studio"
      />

      <section className="creator-studio__panel">
        <header className="creator-studio__header">
          <div>
            <p>Marketplace Creator Studio</p>
            <h2>Package a profile world</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="creator-studio__body">
          <form
            className="creator-studio__form"
            onSubmit={(event) => {
              event.preventDefault();
              saveDraft();
            }}
          >
            <label>
              <span>Theme name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example: Glass Garden"
                autoFocus
              />
            </label>

            <div className="creator-studio__row">
              <label>
                <span>Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option>Creator</option>
                  <option>Editorial</option>
                  <option>Experimental</option>
                  <option>Minimal</option>
                  <option>Music</option>
                </select>
              </label>

              <label>
                <span>Access tier</span>
                <select
                  value={tier}
                  onChange={(event) =>
                    setTier(event.target.value as CreatorDraft["tier"])
                  }
                >
                  <option>Premium</option>
                  <option>Included</option>
                </select>
              </label>
            </div>

            <label>
              <span>Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the visual system, intended audience, and interaction style."
                rows={5}
              />
            </label>

            <div className="creator-studio__row">
              <label>
                <span>Accent color</span>
                <input
                  type="color"
                  value={accent}
                  onChange={(event) => setAccent(event.target.value)}
                />
              </label>

              <label>
                <span>Version</span>
                <input
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder="1.0.0"
                />
              </label>
            </div>

            <div
              className="creator-studio__preview"
              style={{ "--creator-accent": accent } as React.CSSProperties}
            >
              <i />
              <strong>{name || "Untitled World"}</strong>
              <span>{category}</span>
            </div>

            {message && (
              <p className="creator-studio__message" role="status">
                {message}
              </p>
            )}

            <button
              className="creator-studio__save"
              type="submit"
              disabled={!canSave}
            >
              Save local draft
            </button>
          </form>

          <aside className="creator-studio__drafts">
            <div>
              <span>Local drafts</span>
              <strong>{drafts.length}</strong>
            </div>

            {drafts.length === 0 ? (
              <div className="creator-studio__empty">
                <strong>No creator drafts yet</strong>
                <span>
                  Drafts stay on this device until backend publishing is added.
                </span>
              </div>
            ) : (
              <div className="creator-studio__draft-list">
                {drafts.map((draft) => (
                  <article key={draft.id}>
                    <span
                      style={{ background: draft.accent }}
                      aria-hidden="true"
                    />
                    <div>
                      <small>{draft.category}</small>
                      <strong>{draft.name}</strong>
                      <small>
                        {draft.tier} · v{draft.version}
                      </small>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => exportDraft(draft)}
                      >
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          persist(
                            drafts.filter((item) => item.id !== draft.id),
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>

        <footer className="creator-studio__footer">
          Publishing, review, payouts, and license verification will connect
          to the marketplace backend in a later release.
        </footer>
      </section>
    </div>
  );
}
