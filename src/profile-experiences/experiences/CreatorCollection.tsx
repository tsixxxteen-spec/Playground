import type { ExperienceProps } from "../shared/ExperienceTypes";

type SharedProps = Pick<
  ExperienceProps,
  | "profile"
  | "postCount"
  | "followerCount"
  | "followingCount"
  | "isOwner"
  | "onEdit"
  | "onFollowersClick"
  | "onFollowingClick"
>;

function CreatorAvatar({
  src,
  name,
  className = "",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  return (
    <div className={`cc-avatar ${className}`.trim()}>
      {src ? (
        <img src={src} alt="" />
      ) : (
        <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

function CreatorActions({
  isOwner,
  onEdit,
}: Pick<ExperienceProps, "isOwner" | "onEdit">) {
  if (!isOwner) return null;

  return (
    <button className="cc-edit" type="button" onClick={onEdit}>
      Edit profile
    </button>
  );
}

function CreatorStats({
  postCount,
  followerCount,
  followingCount,
  onFollowersClick,
  onFollowingClick,
}: SharedProps) {
  return (
    <div className="cc-stats" aria-label="Profile statistics">
      <span>
        <strong>{postCount}</strong>
        <small>Posts</small>
      </span>
      <button type="button" onClick={onFollowersClick}>
        <strong>{followerCount}</strong>
        <small>Followers</small>
      </button>
      <button type="button" onClick={onFollowingClick}>
        <strong>{followingCount}</strong>
        <small>Following</small>
      </button>
    </div>
  );
}

function CreatorIdentity({
  profile,
  isOwner,
  onEdit,
  ...stats
}: SharedProps) {
  return (
    <div className="cc-identity">
      <p className="cc-eyebrow">@{profile.username}</p>
      <h1>{profile.displayName}</h1>
      <p className="cc-bio">{profile.bio}</p>
      <CreatorStats profile={profile} isOwner={isOwner} onEdit={onEdit} {...stats} />
      <CreatorActions isOwner={isOwner} onEdit={onEdit} />
    </div>
  );
}

export function Canvas(props: ExperienceProps) {
  return (
    <main className="cc cc-canvas">
      <section className="cc-canvas__hero">
        <CreatorAvatar
          src={props.profile.avatarSrc}
          name={props.profile.displayName}
          className="cc-canvas__portrait"
        />
        <div className="cc-canvas__floating-card">
          <CreatorIdentity {...props} />
        </div>
        <p className="cc-canvas__label">Personal canvas / selected work</p>
      </section>

      <section className="cc-posts cc-canvas__posts">
        <div className="cc-section-heading">
          <span>Work</span>
          <span>{props.postCount.toString().padStart(2, "0")}</span>
        </div>
        {props.posts}
      </section>
    </main>
  );
}

export function Storyboard(props: ExperienceProps) {
  return (
    <main className="cc cc-storyboard">
      <header className="cc-storyboard__header">
        <CreatorAvatar
          src={props.profile.avatarSrc}
          name={props.profile.displayName}
          className="cc-storyboard__avatar"
        />
        <CreatorIdentity {...props} />
        <div className="cc-storyboard__slate" aria-hidden="true">
          <span>SCENE</span>
          <strong>01</strong>
          <span>TAKE</span>
          <strong>∞</strong>
        </div>
      </header>

      <section className="cc-posts cc-storyboard__posts">
        <div className="cc-storyboard__rail">
          <span>START</span>
          <span>PLAYGROUND</span>
          <span>END</span>
        </div>
        <div className="cc-storyboard__content">{props.posts}</div>
      </section>
    </main>
  );
}

export function Notebook(props: ExperienceProps) {
  return (
    <main className="cc cc-notebook">
      <div className="cc-notebook__binding" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span key={index} />
        ))}
      </div>

      <header className="cc-notebook__header">
        <p className="cc-notebook__date">Field notes / Vol. 01</p>
        <CreatorAvatar
          src={props.profile.avatarSrc}
          name={props.profile.displayName}
          className="cc-notebook__avatar"
        />
        <CreatorIdentity {...props} />
        <p className="cc-notebook__note" aria-hidden="true">
          ideas, fragments, images, sound
        </p>
      </header>

      <section className="cc-posts cc-notebook__posts">
        <div className="cc-section-heading">
          <span>Recent pages</span>
          <span>Do not tear out</span>
        </div>
        {props.posts}
      </section>
    </main>
  );
}

export function Signals(props: ExperienceProps) {
  const activeTrack = props.soundtrack.tracks[0];

  return (
    <main className="cc cc-signals">
      <header className="cc-signals__header">
        <div className="cc-signals__frequency">
          <span>LIVE SIGNAL</span>
          <strong>98.7</strong>
          <span>PLAYGROUND FM</span>
        </div>

        <CreatorAvatar
          src={props.profile.avatarSrc}
          name={props.profile.displayName}
          className="cc-signals__avatar"
        />

        <CreatorIdentity {...props} />
      </header>

      <section className="cc-signals__now-playing">
        <div className="cc-signals__bars" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} style={{ height: `${24 + ((index * 17) % 58)}%` }} />
          ))}
        </div>
        <div>
          <p className="cc-eyebrow">Now playing</p>
          <h2>{activeTrack?.title || "No track selected"}</h2>
          <p>{activeTrack?.artist || "Add music in Edit Profile"}</p>
        </div>
      </section>

      <section className="cc-posts cc-signals__posts">
        <div className="cc-section-heading">
          <span>Transmission archive</span>
          <span>{props.postCount} entries</span>
        </div>
        {props.posts}
      </section>
    </main>
  );
}

export function PortfolioSplit(props: ExperienceProps) {
  return (
    <main className="cc cc-portfolio-split">
      <aside className="cc-portfolio-split__sidebar">
        <CreatorAvatar
          src={props.profile.avatarSrc}
          name={props.profile.displayName}
          className="cc-portfolio-split__avatar"
        />
        <CreatorIdentity {...props} />
        <p className="cc-portfolio-split__footer">
          Original work, process, and unfinished thoughts.
        </p>
      </aside>

      <section className="cc-posts cc-portfolio-split__posts">
        <div className="cc-section-heading">
          <span>Selected projects</span>
          <span>Index / {props.postCount}</span>
        </div>
        {props.posts}
      </section>
    </main>
  );
}
