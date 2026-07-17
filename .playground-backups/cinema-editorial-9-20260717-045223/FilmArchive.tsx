import { useState } from "react";
import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

const collections = [
  {
    id: "all",
    label: "Complete archive",
    code: "ARC–001",
    note: "All deposited works",
  },
  {
    id: "motion",
    label: "Motion studies",
    code: "MOV–016",
    note: "Film, video, and moving image",
  },
  {
    id: "stills",
    label: "Photographic records",
    code: "STL–035",
    note: "Frames, portraits, and contact prints",
  },
] as const;

export default function FilmArchive(props: ExperienceProps) {
  const [activeCollection, setActiveCollection] =
    useState<(typeof collections)[number]["id"]>("all");

  const selected =
    collections.find(
      (collection) => collection.id === activeCollection,
    ) ?? collections[0];

  return (
    <main className="xp xp--film-archive">
      <header className="xp-archive__masthead">
        <div className="xp-archive__institution">
          <span>PLAYGROUND IMAGE ARCHIVE</span>
          <strong>PERMANENT COLLECTION</strong>
        </div>

        <div className="xp-archive__record">
          <span>RECORD</span>
          <strong>{selected.code}</strong>
        </div>

        <button
          className="xp-archive__edit"
          type="button"
          onClick={props.onEdit}
        >
          Edit record
        </button>
      </header>

      <section className="xp-archive__identity">
        <div className="xp-archive__portrait">
          <span className="xp-archive__edge-code">
            35 • PG • 2026 • 35 • PG • 2026
          </span>
          <Avatar profile={props.profile} />
          <span className="xp-archive__frame-number">
            FRAME 01A
          </span>
        </div>

        <div className="xp-archive__catalog">
          <p className="xp-archive__eyebrow">
            CREATOR FILE / ACTIVE HOLDING
          </p>
          <h1>{props.profile.displayName}</h1>
          <p className="xp-archive__handle">
            {props.profile.username}
          </p>

          {props.profile.bio && (
            <blockquote>{props.profile.bio}</blockquote>
          )}

          <Stats {...props} />

          <Music
            soundtrack={props.soundtrack}
            visible={props.showMusicPlayer}
            hiddenAutoplay={props.hiddenAutoplay}
            variant="editorial"
            label="Audio document"
          />
        </div>

        <aside className="xp-archive__finding-aid">
          <p>FINDING AID</p>

          <dl>
            <div>
              <dt>Collection</dt>
              <dd>{selected.label}</dd>
            </div>
            <div>
              <dt>Contents</dt>
              <dd>{selected.note}</dd>
            </div>
            <div>
              <dt>Holdings</dt>
              <dd>{props.postCount} records</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Open for viewing</dd>
            </div>
          </dl>
        </aside>
      </section>

      <nav
        className="xp-archive__drawers"
        aria-label="Archive collections"
      >
        {collections.map((collection, index) => (
          <button
            key={collection.id}
            type="button"
            data-active={collection.id === activeCollection}
            onClick={() =>
              setActiveCollection(collection.id)
            }
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{collection.label}</strong>
            <small>{collection.code}</small>
          </button>
        ))}
      </nav>

      <section className="xp-archive__light-table">
        <div className="xp-archive__table-label">
          <span>{selected.code}</span>
          <strong>{selected.label}</strong>
          <span>{props.postCount} ITEMS</span>
        </div>

        <div className="xp-archive__perforations" aria-hidden="true" />

        <Posts count={props.postCount} label="Catalogued works">
          {props.posts}
        </Posts>

        <div className="xp-archive__perforations" aria-hidden="true" />
      </section>

      <footer className="xp-archive__footer">
        <span>PLAYGROUND / FILM ARCHIVE</span>
        <span>HANDLE WITH CLEAN HANDS</span>
        <span>{selected.code}</span>
      </footer>
    </main>
  );
}
