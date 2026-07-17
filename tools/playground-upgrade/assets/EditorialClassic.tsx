import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function EditorialClassic(props: ExperienceProps) {
  return (
    <main className="xp xp--editorial-classic">
      <header className="xp-editorial-classic__masthead">
        <div>
          <span>PLAYGROUND</span>
          <strong>THE PROFILE REVIEW</strong>
        </div>
        <p>VOL. 01 / DIGITAL EDITION</p>
        <button type="button" onClick={props.onEdit}>Edit profile</button>
      </header>

      <section className="xp-editorial-classic__hero">
        <div className="xp-editorial-classic__copy">
          <span className="xp-editorial-classic__eyebrow">COVER PROFILE</span>
          <h1>{props.profile.displayName}</h1>
          <p>
            {props.profile.bio ||
              "A considered portrait of the work, the person, and the ideas shaping what comes next."}
          </p>
          <div>
            <span>{props.profile.username}</span>
            <span>ISSUE 01</span>
          </div>
        </div>

        <div className="xp-editorial-classic__portrait">
          <Avatar profile={props.profile} />
          <small>PORTRAIT / 001</small>
        </div>
      </section>

      <section className="xp-editorial-classic__quote">
        <div><span>FEATURE</span><strong>01</strong></div>
        <blockquote>
          “The most memorable profiles do not simply present a person. They reveal a point of view.”
        </blockquote>
        <Stats {...props} />
      </section>

      <section className="xp-editorial-classic__music">
        <header><span>LISTENING ROOM</span><h2>Selected sound</h2></header>
        <Music
          soundtrack={props.soundtrack}
          visible={props.showMusicPlayer}
          hiddenAutoplay={props.hiddenAutoplay}
          variant="card"
          label="Selected sound"
        />
      </section>

      <section className="xp-editorial-classic__archive">
        <header><span>SELECTED WORK</span><h2>Archive</h2></header>
        <Posts count={props.postCount} label="Selected work">{props.posts}</Posts>
      </section>

      <footer className="xp-editorial-classic__footer">
        <span>PLAYGROUND EDITORIALS</span>
        <span>{props.profile.username}</span>
        <span>PAGE 01</span>
      </footer>
    </main>
  );
}
