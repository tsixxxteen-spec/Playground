import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function FashionEditorial(props: ExperienceProps) {
  return (
    <main className="xp xp--fashion-editorial">
      <header className="xp-fashion__header">
        <span className="xp-fashion__brand">PLAYGROUND</span>
        <span className="xp-fashion__issue">FASHION / ISSUE 02</span>
        <button type="button" onClick={props.onEdit}>Edit</button>
      </header>

      <section className="xp-fashion__cover">
        <div className="xp-fashion__cover-image">
          <Avatar profile={props.profile} />
        </div>
        <div className="xp-fashion__cover-copy">
          <p className="xp-fashion__eyebrow">THE NEW CREATIVE CLASS</p>
          <h1>{props.profile.displayName}</h1>
          <p className="xp-fashion__handle">{props.profile.username}</p>
        </div>
        <p className="xp-fashion__vertical-note">PORTRAIT / STYLE / SOUND / PROCESS</p>
      </section>

      <section className="xp-fashion__intro">
        <div className="xp-fashion__intro-label">
          <span>PROFILE</span>
          <strong>02</strong>
        </div>
        <div className="xp-fashion__intro-copy">
          <p>{props.profile.bio || "An independent creative building a distinct world through image, sound, and personal expression."}</p>
        </div>
        <Stats {...props} />
      </section>

      <section className="xp-fashion__feature-grid">
        <div className="xp-fashion__feature-title">
          <p>EDITOR'S NOTE</p>
          <h2>Style is a language before it becomes a look.</h2>
        </div>
        <div className="xp-fashion__feature-image">
          <Avatar profile={props.profile} />
          <span>LOOK 01</span>
        </div>
        <div className="xp-fashion__feature-image xp-fashion__feature-image--offset">
          <Avatar profile={props.profile} />
          <span>LOOK 02</span>
        </div>
      </section>

      <section className="xp-fashion__soundtrack">
        <div>
          <p>LISTENING ROOM</p>
          <h2>Current rotation</h2>
        </div>
        <Music
          soundtrack={props.soundtrack}
          visible={props.showMusicPlayer}
          hiddenAutoplay={props.hiddenAutoplay}
          variant="release"
          label="Featured sound"
        />
      </section>

      <section className="xp-fashion__work">
        <div className="xp-fashion__work-heading">
          <span>SELECTED WORK</span>
          <h2>Portfolio</h2>
          <p>Images, notes, releases, and fragments from the ongoing practice.</p>
        </div>
        <Posts count={props.postCount} label="Portfolio">{props.posts}</Posts>
      </section>

      <footer className="xp-fashion__footer">
        <span>PLAYGROUND EDITORIALS</span>
        <span>{props.profile.username}</span>
        <span>ISSUE 02</span>
      </footer>
    </main>
  );
}
