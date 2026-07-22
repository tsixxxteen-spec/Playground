import type { ExperienceProps } from "../shared/ExperienceTypes";

function Avatar({
  src,
  name,
  className = "",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  return (
    <div className={`ec1-avatar ${className}`.trim()}>
      {src ? (
        <img src={src} alt="" />
      ) : (
        <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

function OwnerEdit({
  isOwner,
  onEdit,
}: Pick<ExperienceProps, "isOwner" | "onEdit">) {
  if (!isOwner) return null;

  return (
    <button className="ec1-edit" type="button" onClick={onEdit}>
      Edit profile
    </button>
  );
}

function Counts({
  postCount,
  followerCount,
  followingCount,
  onFollowersClick,
  onFollowingClick,
}: Pick<
  ExperienceProps,
  | "postCount"
  | "followerCount"
  | "followingCount"
  | "onFollowersClick"
  | "onFollowingClick"
>) {
  return (
    <div className="ec1-counts" aria-label="Profile statistics">
      <span>
        <strong>{postCount}</strong> posts
      </span>
      <button type="button" onClick={onFollowersClick}>
        <strong>{followerCount}</strong> followers
      </button>
      <button type="button" onClick={onFollowingClick}>
        <strong>{followingCount}</strong> following
      </button>
    </div>
  );
}

export function GalleryOne(props: ExperienceProps) {
  const { profile, posts, isOwner, onEdit } = props;

  return (
    <main className="ec1 ec1-gallery-one">
      <header className="ec1-gallery-one__header">
        <p className="ec1-kicker">Selected works / profile</p>
        <h1>{profile.displayName}</h1>
        <p className="ec1-handle">@{profile.username}</p>
      </header>

      <section className="ec1-gallery-one__hero">
        <Avatar
          src={profile.avatarSrc}
          name={profile.displayName}
          className="ec1-gallery-one__portrait"
        />
        <div className="ec1-gallery-one__statement">
          <p>{profile.bio}</p>
          <Counts {...props} />
          <OwnerEdit isOwner={isOwner} onEdit={onEdit} />
        </div>
      </section>

      <section className="ec1-posts ec1-gallery-one__posts">
        <div className="ec1-section-label">
          <span>Archive</span>
          <span>01—∞</span>
        </div>
        {posts}
      </section>
    </main>
  );
}

export function Monograph(props: ExperienceProps) {
  const { profile, posts, isOwner, onEdit } = props;

  return (
    <main className="ec1 ec1-monograph">
      <header className="ec1-monograph__masthead">
        <span>MONOGRAPH</span>
        <span>VOL. 01</span>
        <span>@{profile.username}</span>
      </header>

      <section className="ec1-monograph__intro">
        <div>
          <p className="ec1-index-number">001</p>
          <h1>{profile.displayName}</h1>
        </div>
        <div className="ec1-monograph__copy">
          <p>{profile.bio}</p>
          <Counts {...props} />
          <OwnerEdit isOwner={isOwner} onEdit={onEdit} />
        </div>
      </section>

      <section className="ec1-monograph__portrait-row">
        <Avatar
          src={profile.avatarSrc}
          name={profile.displayName}
          className="ec1-monograph__portrait"
        />
        <p>
          A personal record of images, notes, sound, and everything still in
          motion.
        </p>
      </section>

      <section className="ec1-posts ec1-monograph__posts">
        <div className="ec1-section-label">
          <span>002 / Selected entries</span>
          <span>Current archive</span>
        </div>
        {posts}
      </section>
    </main>
  );
}

export function ContactGrid(props: ExperienceProps) {
  const { profile, posts, isOwner, onEdit } = props;

  return (
    <main className="ec1 ec1-contact-grid">
      <aside className="ec1-contact-grid__rail">
        <Avatar
          src={profile.avatarSrc}
          name={profile.displayName}
          className="ec1-contact-grid__avatar"
        />
        <div>
          <p className="ec1-kicker">Index / 2026</p>
          <h1>{profile.displayName}</h1>
          <p className="ec1-handle">@{profile.username}</p>
        </div>
        <p className="ec1-contact-grid__bio">{profile.bio}</p>
        <Counts {...props} />
        <OwnerEdit isOwner={isOwner} onEdit={onEdit} />
      </aside>

      <section className="ec1-posts ec1-contact-grid__posts">
        <div className="ec1-section-label">
          <span>Contact grid</span>
          <span>{props.postCount} frames</span>
        </div>
        {posts}
      </section>
    </main>
  );
}

export function MosaicArchive(props: ExperienceProps) {
  const { profile, posts, isOwner, onEdit } = props;

  return (
    <main className="ec1 ec1-mosaic-archive">
      <header className="ec1-mosaic-archive__header">
        <div>
          <p className="ec1-kicker">Mosaic archive</p>
          <h1>{profile.displayName}</h1>
        </div>
        <div className="ec1-mosaic-archive__identity">
          <Avatar
            src={profile.avatarSrc}
            name={profile.displayName}
            className="ec1-mosaic-archive__avatar"
          />
          <div>
            <p>@{profile.username}</p>
            <p>{profile.bio}</p>
          </div>
        </div>
      </header>

      <div className="ec1-mosaic-archive__tools">
        <Counts {...props} />
        <OwnerEdit isOwner={isOwner} onEdit={onEdit} />
      </div>

      <section className="ec1-posts ec1-mosaic-archive__posts">
        {posts}
      </section>
    </main>
  );
}
