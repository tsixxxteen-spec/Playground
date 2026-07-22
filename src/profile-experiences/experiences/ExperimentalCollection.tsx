import type { CSSProperties } from "react";
import type { ExperienceProps } from "../shared/ExperienceTypes";

type ProfileCoreProps = Pick<
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

function ExperimentalAvatar({
  src,
  name,
  className = "",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  return (
    <div className={`ec-avatar ${className}`.trim()}>
      {src ? (
        <img src={src} alt="" />
      ) : (
        <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

function ExperimentalIdentity({
  profile,
  postCount,
  followerCount,
  followingCount,
  isOwner,
  onEdit,
  onFollowersClick,
  onFollowingClick,
}: ProfileCoreProps) {
  return (
    <div className="ec-identity">
      <p className="ec-kicker">@{profile.username}</p>
      <h1>{profile.displayName}</h1>
      <p className="ec-bio">{profile.bio}</p>

      <div className="ec-stats">
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

      {isOwner && (
        <button className="ec-edit" type="button" onClick={onEdit}>
          Edit profile
        </button>
      )}
    </div>
  );
}

export function Orbit(props: ExperienceProps) {
  const nodes = Array.from({ length: 8 }, (_, index) => index);

  return (
    <main className="ec ec-orbit">
      <section className="ec-orbit__stage">
        <div className="ec-orbit__rings" aria-hidden="true">
          <i />
          <i />
          <i />
          {nodes.map((node) => (
            <span
              key={node}
              style={
                {
                  "--node-index": node,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div className="ec-orbit__center">
          <ExperimentalAvatar
            src={props.profile.avatarSrc}
            name={props.profile.displayName}
            className="ec-orbit__avatar"
          />
          <ExperimentalIdentity {...props} />
        </div>

        <div className="ec-orbit__coordinates" aria-hidden="true">
          <span>LAT 25.7617</span>
          <span>LONG −80.1918</span>
          <span>STATUS ONLINE</span>
        </div>
      </section>

      <section className="ec-posts ec-orbit__posts">
        <div className="ec-section-title">
          <span>Objects in orbit</span>
          <span>{props.postCount.toString().padStart(2, "0")}</span>
        </div>
        {props.posts}
      </section>
    </main>
  );
}

export function InfiniteDesk(props: ExperienceProps) {
  return (
    <main className="ec ec-infinite-desk">
      <section className="ec-infinite-desk__workspace">
        <div className="ec-window ec-window--profile">
          <div className="ec-window__bar">
            <span />
            <span />
            <span />
            <small>profile.world</small>
          </div>
          <div className="ec-window__content">
            <ExperimentalAvatar
              src={props.profile.avatarSrc}
              name={props.profile.displayName}
              className="ec-infinite-desk__avatar"
            />
            <ExperimentalIdentity {...props} />
          </div>
        </div>

        <div className="ec-window ec-window--note" aria-hidden="true">
          <div className="ec-window__bar">
            <span />
            <span />
            <span />
            <small>notes.txt</small>
          </div>
          <p>
            keep the strange parts
            <br />
            leave the window open
            <br />
            save before closing
          </p>
        </div>

        <div className="ec-window ec-window--signal" aria-hidden="true">
          <div className="ec-window__bar">
            <span />
            <span />
            <span />
            <small>signal.monitor</small>
          </div>
          <div className="ec-signal-lines">
            {Array.from({ length: 13 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
        </div>

        <div className="ec-infinite-desk__dock" aria-label="Workspace shortcuts">
          <button type="button">Profile</button>
          <button type="button">Archive</button>
          <button type="button">Music</button>
          <button type="button">World</button>
        </div>
      </section>

      <section className="ec-posts ec-infinite-desk__posts">
        <div className="ec-section-title">
          <span>Open files</span>
          <span>{props.postCount} items</span>
        </div>
        {props.posts}
      </section>
    </main>
  );
}

export function MemoryWall(props: ExperienceProps) {
  return (
    <main className="ec ec-memory-wall">
      <header className="ec-memory-wall__header">
        <ExperimentalAvatar
          src={props.profile.avatarSrc}
          name={props.profile.displayName}
          className="ec-memory-wall__avatar"
        />
        <ExperimentalIdentity {...props} />
        <p className="ec-memory-wall__stamp" aria-hidden="true">
          ARCHIVE
          <br />
          NO. 0001
        </p>
      </header>

      <section className="ec-posts ec-memory-wall__posts">
        <div className="ec-section-title">
          <span>Recovered fragments</span>
          <span>Handle with care</span>
        </div>
        <div className="ec-memory-wall__tape" aria-hidden="true" />
        {props.posts}
      </section>
    </main>
  );
}

export function SplitReality(props: ExperienceProps) {
  return (
    <main className="ec ec-split-reality">
      <section className="ec-split-reality__side ec-split-reality__side--light">
        <p className="ec-split-reality__label">Known self</p>
        <ExperimentalAvatar
          src={props.profile.avatarSrc}
          name={props.profile.displayName}
          className="ec-split-reality__avatar"
        />
        <ExperimentalIdentity {...props} />
      </section>

      <section className="ec-split-reality__side ec-split-reality__side--dark">
        <p className="ec-split-reality__label">Other self</p>
        <div className="ec-split-reality__echo" aria-hidden="true">
          <strong>{props.profile.displayName}</strong>
          <span>@{props.profile.username}</span>
        </div>
        <div className="ec-split-reality__portal" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>

      <section className="ec-posts ec-split-reality__posts">
        <div className="ec-section-title">
          <span>Between both sides</span>
          <span>{props.postCount}</span>
        </div>
        {props.posts}
      </section>
    </main>
  );
}

export function TerminalDream(props: ExperienceProps) {
  const activeTrack = props.soundtrack.tracks[0];

  return (
    <main className="ec ec-terminal-dream">
      <header className="ec-terminal-dream__bar">
        <span>PLAYGROUND_OS</span>
        <span>SESSION: {props.profile.username.toUpperCase()}</span>
        <span>SECURE</span>
      </header>

      <section className="ec-terminal-dream__hero">
        <div className="ec-terminal-dream__portrait-wrap">
          <ExperimentalAvatar
            src={props.profile.avatarSrc}
            name={props.profile.displayName}
            className="ec-terminal-dream__avatar"
          />
          <div className="ec-terminal-dream__scanlines" aria-hidden="true" />
        </div>

        <div>
          <p className="ec-terminal-dream__prompt">
            &gt; load_identity --public
          </p>
          <ExperimentalIdentity {...props} />

          <div className="ec-terminal-dream__track">
            <span>&gt; now_playing</span>
            <strong>{activeTrack?.title || "NO_SIGNAL"}</strong>
            <small>{activeTrack?.artist || "UNASSIGNED"}</small>
          </div>
        </div>
      </section>

      <section className="ec-posts ec-terminal-dream__posts">
        <div className="ec-section-title">
          <span>&gt; list_archive</span>
          <span>{props.postCount} records</span>
        </div>
        {props.posts}
      </section>
    </main>
  );
}
