import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function PressKit(props: ExperienceProps) {
  return (
    <main className="xp xp--press">
      <nav className="xp-press__nav">
        <strong>{props.profile.displayName}</strong>

        <div>
          <span>ABOUT</span>
          <span>WORK</span>
          <span>MUSIC</span>

          <button onClick={props.onEdit}>
            EDIT
          </button>
        </div>
      </nav>

      <header className="xp-press__hero">
        <Avatar profile={props.profile} />

        <div className="xp-press__copy">
          <p>{props.profile.username}</p>
          <h1>{props.profile.displayName}</h1>

          {props.profile.bio && (
            <h2>{props.profile.bio}</h2>
          )}

          <Music
            soundtrack={props.soundtrack}
            visible={props.showMusicPlayer}
            hiddenAutoplay={props.hiddenAutoplay}
            variant="release"
            label="Featured release"
          />

          <Stats {...props} />
        </div>
      </header>

      <Posts count={props.postCount} label="Selected work">
        {props.posts}
      </Posts>
    </main>
  );
}
