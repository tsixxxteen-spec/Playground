import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function FashionEditorial(props: ExperienceProps) {
  return (
    <main className="xp xp--fashion-editorial">
      <header className="xp-fashion__bar">
        <span>PLAYGROUND</span><span>FASHION / ISSUE 02</span>
        <button type="button" onClick={props.onEdit}>Edit</button>
      </header>

      <section className="xp-fashion__cover">
        <div className="xp-fashion__portrait"><Avatar profile={props.profile} /></div>
        <div className="xp-fashion__title">
          <p>THE NEW CREATIVE CLASS</p>
          <h1>{props.profile.displayName}</h1>
          <span>{props.profile.username}</span>
        </div>
      </section>

      <section className="xp-fashion__intro">
        <div className="xp-fashion__number"><span>PROFILE</span><strong>02</strong></div>
        <p>{props.profile.bio || "An independent creative building a distinct world through image, sound, and personal expression."}</p>
        <Stats {...props} />
      </section>

      <section className="xp-fashion__spread">
        <div className="xp-fashion__statement"><span>EDITOR'S NOTE</span><h2>Style is a language before it becomes a look.</h2></div>
        <div className="xp-fashion__look"><Avatar profile={props.profile} /><small>LOOK 01</small></div>
        <div className="xp-fashion__look xp-fashion__look--small"><Avatar profile={props.profile} /><small>LOOK 02</small></div>
      </section>

      <section className="xp-fashion__music">
        <div><span>LISTENING ROOM</span><h2>Current rotation</h2></div>
        <Music soundtrack={props.soundtrack} visible={props.showMusicPlayer} hiddenAutoplay={props.hiddenAutoplay} variant="release" label="Featured sound" />
      </section>

      <section className="xp-fashion__portfolio">
        <header><span>SELECTED WORK</span><h2>Portfolio</h2><p>Images, notes, releases, and fragments from the ongoing practice.</p></header>
        <Posts count={props.postCount} label="Portfolio">{props.posts}</Posts>
      </section>

      <footer className="xp-fashion__footer"><span>PLAYGROUND EDITORIALS</span><span>{props.profile.username}</span><span>ISSUE 02</span></footer>
    </main>
  );
}
