import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function MusicEditorial(props: ExperienceProps) {
  return (
    <main className="xp xp--music-editorial">
      <header className="xp-music-editorial__bar">
        <strong>PLAYGROUND</strong>
        <span>MUSIC / ISSUE 03</span>
        <button type="button" onClick={props.onEdit}>Edit</button>
      </header>

      <section className="xp-music-editorial__cover">
        <div className="xp-music-editorial__portrait">
          <Avatar profile={props.profile} />
          <span>01</span>
        </div>
        <div className="xp-music-editorial__headline">
          <p>COVER STORY</p>
          <h1>{props.profile.displayName}</h1>
          <blockquote>
            {props.profile.bio ||
              "A sound-led portrait of the artist, the process, and the work in motion."}
          </blockquote>
          <small>{props.profile.username}</small>
        </div>
      </section>

      <section className="xp-music-editorial__release">
        <div><span>FEATURED RELEASE</span><h2>Now playing</h2></div>
        <Music
          soundtrack={props.soundtrack}
          visible={props.showMusicPlayer}
          hiddenAutoplay={props.hiddenAutoplay}
          variant="release"
          label="Featured release"
        />
      </section>

      <section className="xp-music-editorial__profile">
        <div className="xp-music-editorial__number"><span>PROFILE</span><strong>03</strong></div>
        <p>“The work should feel lived in before it feels finished.”</p>
        <Stats {...props} />
      </section>

      <section className="xp-music-editorial__story">
        <div className="xp-music-editorial__story-copy">
          <span>VISUAL STORY</span>
          <h2>Sound, image, and everything between.</h2>
          <p>Selected work arranged like a magazine feature instead of a conventional feed.</p>
        </div>
        <div className="xp-music-editorial__images">
          <div className="xp-music-editorial__image xp-music-editorial__image--tall"><Avatar profile={props.profile} /><small>PORTRAIT 01</small></div>
          <div className="xp-music-editorial__image"><Avatar profile={props.profile} /><small>PORTRAIT 02</small></div>
          <div className="xp-music-editorial__image xp-music-editorial__image--wide"><Avatar profile={props.profile} /><small>PORTRAIT 03</small></div>
        </div>
      </section>

      <section className="xp-music-editorial__archive">
        <header><span>SELECTED WORK</span><h2>Archive</h2></header>
        <Posts count={props.postCount} label="Selected work">{props.posts}</Posts>
      </section>

      <footer className="xp-music-editorial__footer"><span>PLAYGROUND EDITORIALS</span><span>{props.profile.username}</span><span>MUSIC / 03</span></footer>
    </main>
  );
}
