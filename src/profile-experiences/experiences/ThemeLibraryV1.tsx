import type { ExperienceProps } from "../shared";

function Avatar({ profile }: { profile: ExperienceProps["profile"] }) {
  return (
    <div className="tl-avatar">
      {profile.avatarSrc ? (
        <img
          src={profile.avatarSrc}
          alt=""
          style={{
            transform: `translate(${profile.avatarTransform.x}px, ${profile.avatarTransform.y}px)`,
          }}
        />
      ) : (
        <span>{profile.displayName.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

function Identity({ props }: { props: ExperienceProps }) {
  return (
    <>
      <h1>{props.profile.displayName}</h1>
      <small>@{props.profile.username}</small>
      <p>{props.profile.bio}</p>
    </>
  );
}

function Stats({ props }: { props: ExperienceProps }) {
  return (
    <div className="tl-stats">
      <span><b>{props.postCount}</b> posts</span>
      {props.isOwner ? (
        <>
          <button type="button" onClick={props.onFollowersClick}><b>{props.followerCount}</b> followers</button>
          <button type="button" onClick={props.onFollowingClick}><b>{props.followingCount}</b> following</button>
        </>
      ) : null}
    </div>
  );
}

export function StudioWindow(props: ExperienceProps) {
  return (
    <main className="xp tl-studio">
      <div className="tl-browser">
        <header><i /><i /><i /><span>playground://{props.profile.username}</span></header>
        <div className="tl-browser-page">
          <aside>
            <Avatar profile={props.profile} />
            <Identity props={props} />
            <Stats props={props} />
            <button type="button" onClick={props.onEdit}>Edit profile</button>
          </aside>
          <section>
            <div className="tl-kicker"><span>Selected archive</span><span>01—∞</span></div>
            {props.posts}
          </section>
        </div>
      </div>
    </main>
  );
}

export function Sidecar(props: ExperienceProps) {
  return (
    <main className="xp tl-sidecar">
      <aside>
        <button type="button">≡</button>
        <div>
          <Identity props={props} />
          <Stats props={props} />
        </div>
        <strong>PLAYGROUND</strong>
      </aside>
      <section>
        <header><span>Visual index</span><span>{props.postCount} entries</span></header>
        {props.posts}
      </section>
    </main>
  );
}

export function DesktopDaydream(props: ExperienceProps) {
  return (
    <main className="xp tl-desktop">
      <div className="tl-note tl-note-profile">
        <header><span>profile.exe</span><span>×</span></header>
        <Avatar profile={props.profile} />
        <Identity props={props} />
        <Stats props={props} />
      </div>
      <div className="tl-note tl-note-music">
        <header><span>sound.wav</span><span>×</span></header>
        <p>{props.soundtrack.tracks[0]?.title ?? "Profile soundtrack"}</p>
      </div>
      <section className="tl-window">
        <header><span>archive.viewer</span><span>□ ×</span></header>
        <div>{props.posts}</div>
      </section>
    </main>
  );
}
