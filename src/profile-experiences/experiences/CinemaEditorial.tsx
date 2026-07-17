import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function CinemaEditorial(props: ExperienceProps) {
  return (
    <main className="xp xp--cinema-editorial">
      <header className="xp-cinema__topline">
        <span>PLAYGROUND / CINEMA ISSUE</span>
        <span>VOL. 01</span>
        <button type="button" onClick={props.onEdit}>
          Edit
        </button>
      </header>

      <section className="xp-cinema__hero">
        <div className="xp-cinema__hero-copy">
          <p className="xp-cinema__kicker">
            ARTIST FEATURE
          </p>

          <h1>{props.profile.displayName}</h1>

          <p className="xp-cinema__handle">
            {props.profile.username}
          </p>
        </div>

        <div className="xp-cinema__hero-image">
          <Avatar profile={props.profile} />
          <span>01 / PORTRAIT</span>
        </div>
      </section>

      <section className="xp-cinema__statement">
        <div className="xp-cinema__issue-number">
          <span>ISSUE</span>
          <strong>01</strong>
        </div>

        <div className="xp-cinema__quote">
          {props.profile.bio ? (
            <blockquote>“{props.profile.bio}”</blockquote>
          ) : (
            <blockquote>
              “A creator shaping sound, image, and memory.”
            </blockquote>
          )}
        </div>

        <Stats {...props} />
      </section>

      <section className="xp-cinema__sound">
        <div>
          <p>FEATURED SOUND</p>
          <h2>Now screening</h2>
        </div>

        <Music
          soundtrack={props.soundtrack}
          visible={props.showMusicPlayer}
          hiddenAutoplay={props.hiddenAutoplay}
          variant="release"
          label="Original soundtrack"
        />
      </section>

      <section className="xp-cinema__works">
        <div className="xp-cinema__works-heading">
          <p>SELECTED WORK</p>
          <h2>Frames from the world of {props.profile.displayName}</h2>
        </div>

        <Posts count={props.postCount} label="Selected work">
          {props.posts}
        </Posts>
      </section>

      <footer className="xp-cinema__footer">
        <span>PLAYGROUND</span>
        <span>CINEMA EDITORIAL</span>
        <span>{props.profile.username}</span>
      </footer>
    </main>
  );
}
