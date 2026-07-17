import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function IvoryIndex(props: ExperienceProps) {
  return (
    <main className="xp xp--ivory">
      <nav className="xp-ivory__nav">
        <span>PLAYGROUND / INDEX</span>
        <button onClick={props.onEdit}>EDIT</button>
      </nav>

      <header className="xp-ivory__hero">
        <Avatar profile={props.profile} />

        <div>
          <p>{props.profile.username}</p>
          <h1>{props.profile.displayName}</h1>

          {props.profile.bio && (
            <blockquote>{props.profile.bio}</blockquote>
          )}

          <Music
            soundtrack={props.soundtrack}
            visible={props.showMusicPlayer}
            hiddenAutoplay={props.hiddenAutoplay}
            variant="editorial"
            label="Now playing"
          />
        </div>

        <Stats {...props} />
      </header>

      <Posts count={props.postCount} label="Selected work">
        {props.posts}
      </Posts>
    </main>
  );
}
